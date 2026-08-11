import { NextResponse } from "next/server";
import { generateTasksForFeature, buildTaskRef } from "@/lib/generate";
import { getPlan, savePlan, updatePlanStatus } from "@/lib/storage";

const TUID = "701f135a-050a-4e08-bc97-b6d3ee91d7e5";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const { featureIndex } = await request.json();
    const plan = await getPlan(planId);
    if (!plan) return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });

    const feature = (plan.features ?? [])[featureIndex];
    if (!feature) return NextResponse.json({ error: "Feature tidak ditemukan" }, { status: 404 });

    if ((feature.subFeatures ?? []).some((sf: any) => (sf.tasks ?? []).length > 0)) {
      return NextResponse.json({ skipped: true, message: "Tasks sudah ada" });
    }

    let tasks: { feature: string; sub_feature: string; title: string; layer: "frontend" | "backend" | "qa"; phase: number; page: string | null; deps: string[] }[] = [];

    if (process.env.MOCK_LLM === "1") {
      const layers: ("frontend" | "backend" | "qa")[] = ["frontend", "backend", "qa"];
      for (let i = 0; i < 6; i++) {
        tasks.push({
          feature: feature.title,
          sub_feature: feature.subFeatures[0]?.title ?? "Umum",
          title: `Mock task ${i + 1} untuk ${feature.title}`,
          layer: layers[i % 3],
          phase: featureIndex + 1,
          page: null,
          deps: [],
        });
      }
    } else {
      const subTitles = (feature.subFeatures ?? []).map((sf: any) => sf.title);
      const result = await generateTasksForFeature(plan.brief, feature.title, subTitles, featureIndex);
      tasks = result.tasks;
    }

    let taskNum = 0;
    for (const sf of feature.subFeatures) {
      const sfTasks = tasks.filter((t) => {
        const a = t.sub_feature?.toLowerCase().trim();
        const b = sf.title.toLowerCase().trim();
        return a === b || a?.includes(b) || b.includes(a ?? "");
      });
      sf.tasks = sfTasks.map((t) => ({
        ref: buildTaskRef(featureIndex, plan.features[featureIndex].subFeatures.indexOf(sf), ++taskNum),
        title: t.title,
        layer: t.layer,
        phase: featureIndex + 1,
        page: t.page,
        deps: [],
        status: "pending" as const,
        retryCount: 0,
        lastFailReason: null,
        failReason: null,
        startedAt: null,
        completedAt: null,
      }));
    }

    const unmatched = tasks.filter((t) => {
      const a = t.sub_feature?.toLowerCase().trim();
      return !feature.subFeatures.some((sf) => {
        const b = sf.title.toLowerCase().trim();
        return a === b || a?.includes(b) || b.includes(a ?? "");
      });
    });
    if (unmatched.length && feature.subFeatures[0]) {
      feature.subFeatures[0].tasks.push(...unmatched.map((t) => ({
        ref: buildTaskRef(featureIndex, 0, ++taskNum),
        title: t.title,
        layer: t.layer,
        phase: featureIndex + 1,
        page: t.page,
        deps: [],
        status: "pending" as const,
        retryCount: 0,
        lastFailReason: null,
        failReason: null,
        startedAt: null,
        completedAt: null,
      })));
    }

    // Ready gate: plan baru boleh "ready" kalau SEMUA fitur sudah punya tasks.
    // Dievaluasi tiap call (aman untuk generate out-of-order / retry fitur yang
    // sempat gagal), dan idempoten lewat penanda sub-fitur "QA & Integrasi".
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
  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });

  const features = (plan.features ?? []).map((f: any, i) => ({
    index: i,
    title: f.title,
    hasTasks: (f.subFeatures ?? []).some((sf: any) => (sf.tasks ?? []).length > 0),
    taskCount: (f.subFeatures ?? []).reduce((acc: number, sf: any) => acc + (sf.tasks ?? []).length, 0),
  }));

  const allReady = plan.status === "ready";
  return NextResponse.json({ features, allReady, status: plan.status });
}
