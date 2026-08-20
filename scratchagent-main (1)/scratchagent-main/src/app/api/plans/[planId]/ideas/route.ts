import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getAccountState } from "@/lib/billing";
import {
  assignTasksToSubFeatures,
  buildTaskRef,
  convertIdeaToFeature,
  generateTasksForFeature,
  sanitizeDeps,
} from "@/lib/generate";
import { IDEAS_PER_PLAN_LIMIT } from "@/lib/plan-limits";
import { savePlan } from "@/lib/storage";
import { RATE_LIMITS, clientKey, getClientIp, logSecurity, rateLimit, rateLimitedResponse } from "@/lib/security";



/** Bentuk task final (sama dengan generate-tasks). */
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

/**
 * Kolom chat "Ide Kamu" — khusus Pro, maksimal 2 kali per project.
 * GET  : daftar ide + sisa pemakaian.
 * POST : { idea: string } -> AI mengubah ide menjadi SATU fase baru
 *        lengkap dengan sub-fitur dan task (fase > sub-fitur > task).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await getRequestUser();
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;
  const ideas = plan.ideas ?? [];
  return NextResponse.json({ ideas, used: ideas.length, limit: IDEAS_PER_PLAN_LIMIT, left: Math.max(0, IDEAS_PER_PLAN_LIMIT - ideas.length) });
}

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;

  // Gate 1: hanya Pro. Dicek sebelum plan di-load (hemat + pesan jelas).
  const user = await getRequestUser();
  const account = user ? await getAccountState(user.userId) : undefined;
  if ((account?.tier ?? "free") !== "pro") {
    return NextResponse.json(
      { error: "Kolom chat ide hanya untuk paket Pro.", upgrade: "/pricing" },
      { status: 403 },
    );
  }

  // Gate 2: akses tulis (sekaligus menolak plan demo yang read-only).
  const { plan, error } = await accessPlan(planId, user, { write: true });
  if (error || !plan) return error;

  // Rem laju: ide memicu 2 panggilan LLM; cegah spam biaya.
  const ip = await getClientIp(request);
  const rl = RATE_LIMITS.ideas;
  const retryIn = rateLimit(clientKey(user!.userId, ip), rl.limit, rl.windowMs);
  if (retryIn !== null) return rateLimitedResponse(clientKey(user!.userId, ip), retryIn, { ip, userId: user!.userId, route: "/api/plans/[id]/ideas" });

  // Gate 3: validasi input.
  let body: { idea?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const text = String(body.idea ?? "").trim();
  if (!text) return NextResponse.json({ error: "Ide tidak boleh kosong." }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Ide terlalu panjang (maks 2000 karakter)." }, { status: 400 });

  // Gate 4: limit 2 ide per project.
  const ideas = plan.ideas ?? [];
  if (ideas.length >= IDEAS_PER_PLAN_LIMIT) {
    return NextResponse.json(
      { error: `Maksimal ${IDEAS_PER_PLAN_LIMIT} ide per project sudah terpakai.`, used: ideas.length },
      { status: 409 },
    );
  }

  try {
    // Fase baru menempati urutan terakhir plan (phase = jumlah fitur + 1).
    const featureIndex = plan.features.length;
    const phase = featureIndex + 1;

    // 1) AI membaca ide user dan menyusun fase + sub-fiturnya.
    const ideaFeature = process.env.MOCK_LLM === "1"
      ? {
          title: `Ide User ${ideas.length + 1}`,
          icon: "💡",
          description: `Mock fase dari ide: ${text.slice(0, 80)}`,
          tujuan: text,
          selesaiBila: ["Ide user terimplementasi"],
          subFeatures: [{ title: "Umum", tujuan: text, selesaiBila: [] }],
          usage: { tokensIn: 0, tokensOut: 0 },
        }
      : await convertIdeaToFeature(plan.brief, text, phase);

    // 2) AI menyusun task untuk fase baru ini (budget sama dengan fitur reguler;
    //    ide-ide lain ikut disertakan sebagai referensi tambahan).
    const rawTasks = process.env.MOCK_LLM === "1"
      ? Array.from({ length: 2 }, (_, i) => ({
          id: `t${i + 1}`,
          feature: ideaFeature.title,
          sub_feature: ideaFeature.subFeatures[0]?.title ?? "Umum",
          title: `Mock task ${i + 1} untuk ${ideaFeature.title}`,
          layer: (i % 2 === 0 ? "backend" : "qa") as "backend" | "qa",
          phase,
          page: null,
          deps: i > 0 ? [`t${i}`] : [],
        }))
      : (await generateTasksForFeature(
          plan.brief,
          ideaFeature.title,
          ideaFeature.subFeatures.map((s) => s.title),
          featureIndex,
          "pro",
          plan.features.length + 1,
          plan.ideas,
        )).tasks;

    // 3) Distribusi task ke sub-fitur (satu task satu sub-fitur, dedupe)
    //    + bangun ref + bersihkan deps — pola sama dengan generate-tasks.
    const keyed = rawTasks.map((t, i) => ({ ...t, __key: (t.id && t.id.trim()) || `__auto${i}` }));
    const tempKeyToRef = new Map<string, string>();
    const assigned: { task: FinalTask; rawDeps: string[] }[] = [];
    const subTitles = ideaFeature.subFeatures.map((s) => s.title);
    const subFeaturesWithTasks = ideaFeature.subFeatures.map((s) => ({ ...s, tasks: [] as FinalTask[] }));
    let taskNum = 0;
    const assignment = assignTasksToSubFeatures(keyed, subTitles);
    for (const [subIndex, taskIndexes] of Array.from(assignment.entries()).sort(([a], [b]) => a - b)) {
      const sf = subFeaturesWithTasks[subIndex];
      if (!sf) continue;
      sf.tasks = taskIndexes.map((ti) => {
        const t = keyed[ti];
        const ref = buildTaskRef(featureIndex, subIndex, ++taskNum);
        tempKeyToRef.set(t.__key, ref);
        const task = makeTask(ref, t.title, t.layer, phase, t.page ?? null);
        assigned.push({ task, rawDeps: t.deps ?? [] });
        return task;
      });
    }
    const nodes = assigned.map(({ task, rawDeps }) => ({
      ref: task.ref,
      deps: rawDeps.map((d) => tempKeyToRef.get((d ?? "").trim())).filter((r): r is string => !!r),
    }));
    const cleanDeps = sanitizeDeps(nodes);
    for (const { task } of assigned) task.deps = cleanDeps.get(task.ref) ?? [];

    // 4) Slug unik: base slug + suffix ide.
    const baseSlug = ideaFeature.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ide-user";
    const slug = plan.features.some((f) => f.slug === baseSlug) ? `${baseSlug}-ide-${ideas.length + 1}` : baseSlug;

    // 5) Masukin fase baru + catat idenya (bahan bacaan AI berikutnya).
    plan.features.push({
      slug,
      title: ideaFeature.title,
      icon: ideaFeature.icon,
      description: ideaFeature.description,
      tujuan: ideaFeature.tujuan,
      selesaiBila: ideaFeature.selesaiBila,
      priority: "medium",
      status: "direncanakan",
      order: featureIndex,
      subFeatures: subFeaturesWithTasks.map((s) => ({ title: s.title, tujuan: s.tujuan, selesaiBila: s.selesaiBila, tasks: s.tasks })),
    });
    plan.ideas = [
      ...ideas,
      { text, createdAt: new Date().toISOString(), featureTitle: ideaFeature.title, phase },
    ];
    await savePlan(plan, plan.userId ?? user!.userId);
    const ipAfter = await getClientIp(request);
    await logSecurity("idea_submitted", { planId, phase, featureTitle: ideaFeature.title, used: plan.ideas.length }, { ip: ipAfter, userId: user!.userId });

    return NextResponse.json({
      ok: true,
      idea: plan.ideas.at(-1),
      feature: { slug, title: ideaFeature.title, phase, tasksGenerated: assigned.length },
      used: plan.ideas.length,
      left: Math.max(0, IDEAS_PER_PLAN_LIMIT - plan.ideas.length),
    });
  } catch (err) {
    console.error(`[ideas] konversi ide gagal untuk plan ${planId}:`, err);
    return NextResponse.json({ error: "AI gagal mengolah ide. Coba lagi dengan kalimat lebih spesifik." }, { status: 500 });
  }
}
