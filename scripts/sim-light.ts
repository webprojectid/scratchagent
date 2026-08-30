/**
 * Simulasi ringan: brief kecil -> PRD -> semua task, lewat lib langsung
 * (tanpa kuota API). Timing per tahap buat ngetes kecepatan model aktif.
 * Plan disimpan ke akun user jadi bisa dilihat di web.
 *
 * Run: npx tsx scripts/sim-light.ts
 */
import { readFileSync } from "fs";

function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "").trim();
    }
  } catch {}
}
loadEnv();

import { generatePlanStructure, generateTasksForFeature, buildTaskRef, sanitizeDeps, assignTasksToSubFeatures } from "../src/lib/generate";
import { savePlan, updatePlanStatus } from "../src/lib/storage";
import { randomUUID } from "crypto";

const USER_ID = "d8442b9f-85ac-493b-9c55-ff93866f0a20";
const BRIEF =
  "Aplikasi pencatat kebiasaan harian (habit tracker) web sederhana untuk satu pengguna: checklist kebiasaan per hari, streak berapa hari berturut-turut, dan statistik ringkas persentase keberhasilan mingguan.";

const t0 = Date.now();
const ts = () => `[+${((Date.now() - t0) / 1000).toFixed(1)}s]`;

async function main() {
  console.log(`${ts()} Stage 1+2: generate struktur PRD...`);
  const result = await generatePlanStructure(BRIEF, { mode: "auto" }, undefined, "free");
  const planId = randomUUID();
  console.log(`${ts()} PRD selesai. Judul: "${result.title}" | ${result.features.length} fase | warnings: ${JSON.stringify(result.warnings)}`);

  const planObj: any = {
    id: planId,
    title: result.title,
    brief: BRIEF,
    stack: result.stack,
    techStack: result.techStack,
    asumsi: result.asumsi,
    requirements: result.requirements,
    userFlow: result.userFlow,
    architecture: result.architecture,
    databaseSchema: result.databaseSchema,
    status: "generating",
    features: result.features,
    warnings: result.warnings,
    tier: "free",
    createdAt: new Date().toISOString(),
  };
  await savePlan(planObj, USER_ID);
  console.log(`${ts()} Plan disimpan (${planId}). Stage 3: task per fase paralel...`);

  const featureCount = result.features.length;
  const results = await Promise.all(
    planObj.features.map(async (feature: any, fi: number) => {
      const fStart = Date.now();
      const subTitles = feature.subFeatures.map((sf: any) => sf.title);
      const { tasks } = await generateTasksForFeature(BRIEF, feature.title, subTitles, fi, "free", featureCount, null);

      const keyed = tasks.map((t: any, i: number) => ({ ...t, __key: (t.id && t.id.trim()) || `__auto${i}` }));
      const tempKeyToRef = new Map<string, string>();
      const assigned: { task: any; rawDeps: string[] }[] = [];
      let taskNum = 0;
      const assignment = assignTasksToSubFeatures(keyed, subTitles);
      for (let subIndex = 0; subIndex < feature.subFeatures.length; subIndex++) {
        const sf = feature.subFeatures[subIndex];
        const taskIndexes = assignment.get(subIndex) ?? [];
        sf.tasks = taskIndexes.map((ti: number) => {
          const t = keyed[ti];
          const ref = buildTaskRef(fi, subIndex, ++taskNum);
          tempKeyToRef.set(t.__key, ref);
          const task = { ref, title: t.title, layer: t.layer, phase: fi + 1, page: t.page, deps: [] as string[], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null };
          assigned.push({ task, rawDeps: t.deps ?? [] });
          return task;
        });
      }
      const nodes = assigned.map(({ task, rawDeps }) => ({
        ref: task.ref,
        deps: rawDeps.map((d: string) => tempKeyToRef.get((d ?? "").trim())).filter((r): r is string => !!r),
      }));
      const cleanDeps = sanitizeDeps(nodes);
      for (const { task } of assigned) task.deps = cleanDeps.get(task.ref) ?? [];
      return { fi, title: feature.title, count: tasks.length, dur: (Date.now() - fStart) / 1000 };
    }),
  );

  await savePlan(planObj, USER_ID);
  const allTasks = planObj.features.flatMap((f: any) => f.subFeatures.flatMap((sf: any) => sf.tasks));
  const hasQa = planObj.features.some((f: any) => f.subFeatures.some((sf: any) => sf.title === "QA & Integrasi"));
  if (allTasks.length > 0) {
    await updatePlanStatus(planId, "ready");
    planObj.status = "ready";
  }
  for (const r of results.sort((a, b) => a.fi - b.fi)) {
    console.log(`${ts()}   Fase ${r.fi + 1}: "${r.title}" -> ${r.count} task (${r.dur.toFixed(1)}s)`);
  }
  console.log(`${ts()} SELESAI. Total ${allTasks.length} task | status: ${planObj.status} | QA fase: ${hasQa ? "ada" : "tidak (manual)"}`);
  console.log(`Plan ID: ${planId}`);
  const badDeps = allTasks.filter((t: any) => t.deps.some((d: string) => !allTasks.some((x: any) => x.ref === d)));
  console.log(`Deps tidak valid: ${badDeps.length}`);
}

main().catch((e) => { console.error("GAGAL:", e instanceof Error ? e.message : e); process.exit(1); });
