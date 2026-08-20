import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { generateTasksForFeature, buildTaskRef, sanitizeDeps, assignTasksToSubFeatures } from "@/lib/generate";
import { savePlan, updatePlanStatus } from "@/lib/storage";

const TUID = "701f135a-050a-4e08-bc97-b6d3ee91d7e5";

interface FinalTask {
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
  try {
    const { planId } = await params;
    const { featureIndex } = await request.json();
    const legacyUserId = new URL(request.url).searchParams.get("userId");
    const user = await getRequestUser(legacyUserId);
    const { plan, error } = await accessPlan(planId, user, { write: true });
    if (error || !plan) return error;

    const feature = (plan.features ?? [])[featureIndex];
    if (!feature) return NextResponse.json({ error: "Feature tidak ditemukan" }, { status: 404 });

    if ((feature.subFeatures ?? []).some((sf: any) => (sf.tasks ?? []).length > 0)) {
      return NextResponse.json({ skipped: true, message: "Tasks sudah ada" });
    }

    let tasks: { id: string; feature: string; sub_feature: string; title: string; layer: "frontend" | "backend" | "qa"; phase: number; page: string | null; deps: string[] }[] = [];

    if (process.env.MOCK_LLM === "1") {
      const layers: ("frontend" | "backend" | "qa")[] = ["frontend", "backend", "qa"];
      for (let i = 0; i < 6; i++) {
        tasks.push({
          id: `t${i + 1}`,
          feature: feature.title,
          sub_feature: feature.subFeatures[0]?.title ?? "Umum",
          title: `Mock task ${i + 1} untuk ${feature.title}`,
          layer: layers[i % 3],
          phase: featureIndex + 1,
          page: null,
          deps: i > 0 ? [`t${i}`] : [],
        });
      }
    } else {
      const subTitles = (feature.subFeatures ?? []).map((sf: any) => sf.title);
      // Ide user (Pro, maks 2/project) WAJIB ikut terbaca AI sebagai referensi tambahan.
      const result = await generateTasksForFeature(plan.brief, feature.title, subTitles, featureIndex, plan.tier ?? "free", plan.features.length, plan.ideas);
      tasks = result.tasks;
    }

    // Kunci sementara per task: pakai id dari LLM, fallback index. Dipakai utk mapping deps.
    const keyed = tasks.map((t, i) => ({ ...t, __key: (t.id && t.id.trim()) || `__auto${i}` }));
    const tempKeyToRef = new Map<string, string>();
    const assigned: { task: FinalTask; rawDeps: string[] }[] = [];

    // Distribusi task ke sub-fitur: SATU task masuk SATU sub-fitur saja
    // (exact match dulu, lalu substring fallback; sisa masuk sub-fitur pertama).
    // Tanpa dedupe jumlah task membengkak dan melanggar batas tier.
    let taskNum = 0;
    const assignment = assignTasksToSubFeatures(keyed, feature.subFeatures.map((sf: any) => sf.title));
    for (const [subIndex, taskIndexes] of Array.from(assignment.entries()).sort(([a], [b]) => a - b)) {
      const sf = feature.subFeatures[subIndex];
      if (!sf) continue;
      sf.tasks = taskIndexes.map((ti) => {
        const t = keyed[ti];
        const ref = buildTaskRef(featureIndex, subIndex, ++taskNum);
        tempKeyToRef.set(t.__key, ref);
        const task = makeTask(ref, t.title, t.layer, featureIndex + 1, t.page);
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
    // Dievaluasi tiap call (aman untuk generate out-of-order / retry fitur yang
    // sempat gagal), dan idempoten lewat penanda sub-fitur "QA & Integrasi".
    // Bersihkan dulu QA kosong duplikat hasil race/retry sebelumnya.
    for (const f of plan.features ?? []) {
      f.subFeatures = f.subFeatures.filter(
        (sf: any) => !(sf.title === "QA & Integrasi" && (sf.tasks ?? []).length === 0),
      );
    }
    const allFeaturesHaveTasks = (plan.features ?? []).every((f: any) =>
      (f.subFeatures ?? []).some((sf: any) => (sf.tasks ?? []).length > 0),
    );
    const alreadyHasQa = (plan.features ?? []).some((f: any) =>
      (f.subFeatures ?? []).some((sf: any) => sf.title === "QA & Integrasi"),
    );
    if (allFeaturesHaveTasks && !alreadyHasQa) {
      const qaPhase = plan.features.length + 1;
      const lastFeature = plan.features.at(-1);
      if (lastFeature) {
        lastFeature.subFeatures.push({
          title: "QA & Integrasi",
          tasks: [
            { ref: `F${String(plan.features.length).padStart(2, "0")}-S99-T01`, title: "Jalankan aplikasi end-to-end", layer: "qa", phase: qaPhase, page: null, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
            { ref: `F${String(plan.features.length).padStart(2, "0")}-S99-T02`, title: "Uji setiap alur utama terhadap selesai bila", layer: "qa", phase: qaPhase, page: null, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
            { ref: `F${String(plan.features.length).padStart(2, "0")}-S99-T03`, title: "Perbaiki bug yang ditemukan", layer: "qa", phase: qaPhase, page: null, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
            { ref: `F${String(plan.features.length).padStart(2, "0")}-S99-T04`, title: "Bersihkan sisa stub dan console.log", layer: "qa", phase: qaPhase, page: null, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null },
          ],
        });
      }
      plan.status = "ready";
      await updatePlanStatus(planId, "ready");
    }

    await savePlan(plan, plan.userId ?? TUID);
    return NextResponse.json({ ok: true, featureIndex, tasksGenerated: tasks.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generate tasks gagal" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;

  const features = (plan.features ?? []).map((f: any, i) => ({
    index: i,
    title: f.title,
    hasTasks: (f.subFeatures ?? []).some((sf: any) => (sf.tasks ?? []).length > 0),
    taskCount: (f.subFeatures ?? []).reduce((acc: number, sf: any) => acc + (sf.tasks ?? []).length, 0),
  }));

  const allReady = plan.status === "ready";
  return NextResponse.json({ features, allReady, status: plan.status });
}
