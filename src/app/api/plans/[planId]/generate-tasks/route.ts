import { appendPlanGenerationMetrics } from "@/lib/storage";
import { mergeGenerationMetrics } from "@/lib/generation-metrics";
import type { TaskDetail } from "@/lib/task-spec";
import { recordUsage } from "@/lib/quota";
import { writeOriginGate } from "@/lib/write-origin";
import { claimGeneration, releaseGeneration, reserveGenerationAttempt } from "@/lib/generation-lease";
import { finalizeGeneratedPlan } from "@/lib/generated-plan";
import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { generateTasksForFeature, getFailedGenerationUsage, buildTaskRef, sanitizeDeps, assignTasksToSubFeatures } from "@/lib/generate";

// Satu fitur bisa makan 1-3 menit dengan failover — beri jendela penuh.
export const maxDuration = 300;

interface FinalTask {
  detail?: TaskDetail;
  ref: string;
  title: string;
  layer: "frontend" | "backend" | "qa";
  phase: number;
  page: string | null;
  deps: string[];
  status: "pending";
  retryCount: number;
  lastFailReason: string | null;
  failReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

function makeTask(ref: string, title: string, layer: "frontend" | "backend" | "qa", phase: number, page: string | null): FinalTask {
  return { ref, title, layer, phase, page, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null };
}

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const originGate = writeOriginGate(request);
  if (originGate) return originGate;
  let lease: string | null = null;
  let leasedPlan = "";
  let stage = "";
  try {
    const { planId } = await params;
    const { featureIndex } = await request.json();
    const legacyUserId = new URL(request.url).searchParams.get("userId");
    const user = await getRequestUser(legacyUserId);
    const { plan, error } = await accessPlan(planId, user, { write: true });
    if (error || !plan) return error;
    if (!plan.userId || plan.userId === "shared") {
      return NextResponse.json({ error: "Plan owner is missing" }, { status: 409 });
    }

    if (!Number.isInteger(featureIndex) || featureIndex < 0) return NextResponse.json({ error: "Invalid phase index" }, { status: 400 });
    const feature = (plan.features ?? [])[featureIndex];
    if (!feature) return NextResponse.json({ error: apiText("Feature tidak ditemukan") }, { status: 404 });

    if ((feature.subFeatures ?? []).some((sf) => (sf.tasks ?? []).length > 0)) {
      return NextResponse.json({ skipped: true, message: "Tasks sudah ada" });
    }

    stage = `feature-${featureIndex}`;
    leasedPlan = planId;
    lease = await claimGeneration(planId, stage);
    if (!lease) return NextResponse.json({ ok: true, alreadyRunning: true });
    if (!await reserveGenerationAttempt(user!.userId, plan.tier ?? "free")) return NextResponse.json({ error: "Generation limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": "600" } });
    let tasks: { detail?: TaskDetail; id: string; feature: string; sub_feature: string; title: string; layer: "frontend" | "backend" | "qa"; phase: number; page: string | null; deps: string[] }[] = [];
    const reservedQa = featureIndex === plan.features.length - 1;

    if (process.env.MOCK_LLM === "1") {
      const layers: ("frontend" | "backend" | "qa")[] = ["frontend", "backend", "qa"];
      const count = Math.max(feature.subFeatures.length, (plan.tier === "pro" ? 15 : 8) - (reservedQa ? 4 : 0));
      for (let i = 0; i < count; i++) {
        tasks.push({
          id: `t${i + 1}`,
          feature: feature.title,
          sub_feature: feature.subFeatures[i % feature.subFeatures.length]?.title ?? "Umum",
          title: `Implement mock workflow ${i + 1} for ${feature.title}`,
          layer: layers[i % 3],
          phase: featureIndex + 1,
          page: null,
          deps: i > 0 ? [`t${i}`] : [],
        });
      }
    } else {
      const subTitles = (feature.subFeatures ?? []).map((sf) => sf.title);
      // Ide user (Pro, maks 2/project) WAJIB ikut terbaca AI sebagai referensi tambahan.
      let result;
      try { result = await generateTasksForFeature(plan.brief, feature.title, subTitles, featureIndex, plan.tier ?? "free", plan.features.length, plan.ideas, plan.generationSettings, {
        productSpec: plan.productSpec,
        requirementIds: feature.requirementIds,
        featureDescription: feature.description,
        featureGoal: feature.tujuan,
        featureCriteria: feature.selesaiBila,
        subFeatures: feature.subFeatures.map(sub => ({ requirementIds: sub.requirementIds, title: sub.title, tujuan: sub.tujuan, selesaiBila: sub.selesaiBila })),
        requirements: plan.requirements,
        stack: plan.stack,
        reservedQa,
      });
      } catch (error) {
        const failed = getFailedGenerationUsage(error);
        if (failed) {
          await appendPlanGenerationMetrics(plan.id, failed.requests ?? []);
          await recordUsage(user!.userId, plan.tier ?? "free", plan.id, failed, "tasks-failed");
        }
        throw error;
      }
      tasks = result.tasks;
      plan.generationMetrics = mergeGenerationMetrics(plan.generationMetrics, result.usage.requests);
      await recordUsage(user!.userId, plan.tier ?? "free", plan.id, result.usage, "tasks");
    }

    // Kunci sementara per task: pakai id dari LLM, fallback index. Dipakai utk mapping deps.
    const keyed = tasks.map((t, i) => ({ ...t, __key: (t.id && t.id.trim()) || `__auto${i}` }));
    const tempKeyToRef = new Map<string, string>();
    const assigned: { task: FinalTask; rawDeps: string[] }[] = [];

    // Distribusi task ke sub-fitur: SATU task masuk SATU sub-fitur saja
    // (exact match dulu, lalu substring fallback; sisa masuk sub-fitur pertama).
    // Tanpa dedupe jumlah task membengkak dan melanggar batas tier.
    let taskNum = 0;
    const assignment = assignTasksToSubFeatures(keyed, feature.subFeatures.map((sf) => sf.title));
    for (const [subIndex, taskIndexes] of Array.from(assignment.entries()).sort(([a], [b]) => a - b)) {
      const sf = feature.subFeatures[subIndex];
      if (!sf) continue;
      sf.tasks = taskIndexes.map((ti) => {
        const t = keyed[ti];
        const ref = buildTaskRef(featureIndex, subIndex, ++taskNum);
        tempKeyToRef.set(t.__key, ref);
        const task = makeTask(ref, t.title, t.layer, featureIndex + 1, t.page);
        task.detail = t.detail;
        assigned.push({ task, rawDeps: t.deps ?? [] });
        return task;
      });
    }

    // Mapping deps: id sementara dari LLM -> ref final, lalu buang siklus.
    const nodes = assigned.map(({ task, rawDeps }) => ({
      ref: task.ref,
      deps: rawDeps.map((d) => tempKeyToRef.get((d ?? "").trim())).filter((r): r is string => !!r),
    }));
    const cleanDeps = sanitizeDeps(nodes);
    for (const { task } of assigned) {
      task.deps = cleanDeps.get(task.ref) ?? [];
    }

    // Ready gate: plan baru boleh "ready" kalau SEMUA fitur sudah punya tasks.
    // Logika bersih-subfitur-QA-kosong + inject fase "QA & Integrasi" ada di
    // helper ensureQaPhase (dipakai bersama generate-all biar tidak dobel).
    const saved = await finalizeGeneratedPlan(plan, plan.userId, { stage, token: lease });
    if (!saved) return NextResponse.json({ error: "Generation was superseded. Refresh the plan." }, { status: 409 });
    return NextResponse.json({ ok: true, featureIndex, tasksGenerated: tasks.length });
  } catch (error) {
    if (error && typeof error === "object" && "stage" in error && "issues" in error && Array.isArray(error.issues)) {
      console.error(`[generate-tasks] stage=${String(error.stage)} validation=${error.issues.slice(0, 8).join(" | ")}`);
    } else {
      console.error("[generate-tasks]", error);
    }
    return NextResponse.json({ error: "Tasks could not be generated. Please try again." }, { status: 500 });
  } finally {
    if (lease) await releaseGeneration(leasedPlan, stage, lease);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;

  const features = (plan.features ?? []).map((f, i) => ({
    index: i,
    title: f.title,
    hasTasks: (f.subFeatures ?? []).some((sf) => (sf.tasks ?? []).length > 0),
    taskCount: (f.subFeatures ?? []).reduce((acc: number, sf) => acc + (sf.tasks ?? []).length, 0),
  }));

  const allReady = plan.status === "ready";
  return NextResponse.json({ features, allReady, status: plan.status });
}
