import pg from 'pg';
import { getPlan, savePlan } from '../src/lib/storage';
import { generateTasksForFeature, buildTaskRef, sanitizeDeps, assignTasksToSubFeatures } from '../src/lib/generate';
function makeTask(ref: string, title: string, layer: "frontend" | "backend" | "qa", phase: number, page: string | null) {
  return {
    ref,
    title,
    layer,
    phase,
    page: page ?? null,
    deps: [] as string[],
    status: "pending" as const,
  };
}

async function main() {
  const planId = '9ade6972-7792-43d7-beac-2f4a53fda9fd';
  
  // 1. Pastikan Fase 15 punya sub-fitur di database dulu jika kosong
  const client = new pg.Client({ 
    connectionString: 'postgresql://postgres.loqbxknhnwukhikcpgab:Kurangkerjaan93asd%21%21@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' 
  });
  await client.connect();
  
  const f15 = await client.query('SELECT id, title FROM features WHERE plan_id = $1 AND "order" = 14', [planId]);
  if (f15.rows.length > 0) {
    const fId = f15.rows[0].id;
    const subs = await client.query('SELECT id FROM sub_features WHERE feature_id = $1', [fId]);
    if (subs.rows.length === 0) {
      console.log('Menambahkan sub-fitur untuk Fase 15...');
      const defaultSubs = [
        { title: "Ekspor Format JSON & CSV", tujuan: "Download data dalam format JSON dan CSV", selesai_bila: ["File JSON terunduh", "File CSV valid"] },
        { title: "Ekspor Format PDF & Markdown", tujuan: "Konversi konten dokumen ke PDF dan Markdown", selesai_bila: ["File PDF terformat rapi", "Markdown valid"] },
        { title: "Backup & Restore Workspace", tujuan: "Arsip data workspace utuh", selesai_bila: ["File zip arsip valid", "Restore berhasil"] },
      ];
      for (let i = 0; i < defaultSubs.length; i++) {
        const ds = defaultSubs[i];
        await client.query(
          'INSERT INTO sub_features (id, feature_id, title, tujuan, selesai_bila, "order") VALUES ($1, $2, $3, $4, $5, $6)',
          [crypto.randomUUID(), fId, ds.title, ds.tujuan, JSON.stringify(ds.selesai_bila), i]
        );
      }
    }
  }
  await client.end();

  // 2. Load plan utuh
  const plan = await getPlan(planId);
  if (!plan) {
    console.error('Plan not found!');
    return;
  }
  console.log(`Memproses tasks untuk: ${plan.title} (${plan.features?.length} fitur)`);

  for (let featureIndex = 0; featureIndex < (plan.features?.length ?? 0); featureIndex++) {
    const feature = plan.features[featureIndex];
    const existingTasksCount = feature.subFeatures?.reduce((acc, sf) => acc + (sf.tasks?.length ?? 0), 0) ?? 0;
    
    console.log(`[Fase ${featureIndex + 1}] "${feature.title}": ${feature.subFeatures?.length ?? 0} subs, ${existingTasksCount} tasks`);
    
    if (existingTasksCount === 0 && (feature.subFeatures?.length ?? 0) > 0) {
      console.log(`  -> Men-generate task untuk Fase ${featureIndex + 1}...`);
      const subTitles = feature.subFeatures.map(sf => sf.title);
      const genResult = await generateTasksForFeature(
        plan.brief,
        feature.title,
        subTitles,
        featureIndex,
        plan.tier ?? "pro",
        plan.features.length,
        plan.ideas
      );

      const keyed = genResult.tasks.map((t, i) => ({ ...t, __key: (t.id && t.id.trim()) || `__auto${i}` }));
      const tempKeyToRef = new Map<string, string>();
      const assigned: { task: any; rawDeps: string[] }[] = [];

      let taskNum = 0;
      const assignment = assignTasksToSubFeatures(keyed, subTitles);
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

      const nodes = assigned.map(({ task, rawDeps }) => ({
        ref: task.ref,
        deps: rawDeps.map((d) => tempKeyToRef.get((d ?? "").trim())).filter((r): r is string => !!r),
      }));
      const cleanDeps = sanitizeDeps(nodes);
      for (const { task } of assigned) {
        task.deps = cleanDeps.get(task.ref) ?? [];
      }

      await savePlan(plan);
      console.log(`  ✓ Berhasil menyimpan ${assigned.length} tasks untuk Fase ${featureIndex + 1}!`);
    }
  }

  // Set final status
  plan.status = "done";
  await savePlan(plan);
  console.log('Semua fase dan task untuk plan 9ade6972 selesai 100%!');
}

main().catch(console.error);
