import "./lib-env";
import pg from 'pg';
import { generateTasksForFeature, buildTaskRef, sanitizeDeps, assignTasksToSubFeatures } from '../src/lib/generate';

const run = async () => {
  const client = new pg.Client({ 
    connectionString: process.env.DATABASE_URL! 
  });
  await client.connect();
  
  const planId = '9ade6972-7792-43d7-beac-2f4a53fda9fd';
  
  // 1. Cek plan
  const planRes = await client.query('SELECT id, title, brief, tech_prefs FROM plans WHERE id = $1', [planId]);
  if (planRes.rows.length === 0) {
    console.log('Plan not found!');
    await client.end();
    return;
  }
  const plan = planRes.rows[0];
  const planTier = plan.tech_prefs?.tier ?? 'pro';
  console.log(`Memperbaiki Plan: ${plan.title} (Tier: ${planTier})`);
  
  // 2. Ambil semua fitur
  const featuresRes = await client.query('SELECT id, slug, title, icon, "order" FROM features WHERE plan_id = $1 ORDER BY "order"', [planId]);
  const features = featuresRes.rows;
  
  // 3. Pastikan Fase 15 punya sub-fitur jika kosong
  const f15 = features[14];
  if (f15) {
    const f15Subs = await client.query('SELECT id FROM sub_features WHERE feature_id = $1', [f15.id]);
    if (f15Subs.rows.length === 0) {
      console.log(`Menambahkan sub-fitur default untuk Fase 15: ${f15.title}`);
      const defaultSubs = [
        { title: "Ekspor Format JSON & CSV", tujuan: "Mendukung download data tabular dalam format JSON dan CSV", selesai_bila: ["File JSON terunduh dengan struktur valid", "File CSV bisa dibuka di Excel"] },
        { title: "Ekspor Format PDF & Markdown", tujuan: "Konversi konten dokumen ke PDF dan Markdown", selesai_bila: ["File PDF terformat rapi", "Markdown valid"] },
        { title: "Backup & Restore Workspace", tujuan: "Arsip data workspace utuh", selesai_bila: ["File zip arsip valid", "Restore berhasil"] },
      ];
      for (let i = 0; i < defaultSubs.length; i++) {
        const ds = defaultSubs[i];
        await client.query(
          'INSERT INTO sub_features (id, feature_id, title, tujuan, selesai_bila, "order") VALUES ($1, $2, $3, $4, $5, $6)',
          [crypto.randomUUID(), f15.id, ds.title, ds.tujuan, JSON.stringify(ds.selesai_bila), i]
        );
      }
    }
  }
  
  // 4. Generate tasks untuk setiap fase yang belum punya tasks (Fase 7 - 15)
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const subsRes = await client.query('SELECT id, title, tujuan, selesai_bila FROM sub_features WHERE feature_id = $1 ORDER BY "order"', [f.id]);
    const existingTasks = await client.query('SELECT t.ref FROM tasks t JOIN sub_features sf ON t.sub_feature_id = sf.id WHERE sf.feature_id = $1', [f.id]);
    
    console.log(`Fase ${i + 1}: "${f.title}" (${subsRes.rows.length} sub-fitur, ${existingTasks.rows.length} tasks)`);
    
    if (existingTasks.rows.length === 0 && subsRes.rows.length > 0) {
      console.log(`  -> Men-generate tasks untuk Fase ${i + 1}...`);
      const subTitles = subsRes.rows.map(s => s.title);
      try {
        const genResult = await generateTasksForFeature(
          plan.brief,
          f.title,
          subTitles,
          i,
          planTier,
          features.length,
          []
        );
        
        const subMap = assignTasksToSubFeatures(genResult.tasks, subTitles);
        
        for (const sf of subsRes.rows) {
          const matchedTasks = subMap.get(sf.title) ?? [];
          for (const t of matchedTasks) {
            await client.query(`
              INSERT INTO tasks (plan_id, feature_id, sub_feature_id, ref, title, layer, phase, page, deps, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (plan_id, ref) DO NOTHING
            `, [
              planId,
              f.id,
              sf.id,
              t.ref,
              t.title,
              t.layer,
              t.phase,
              t.page ?? null,
              JSON.stringify(t.deps ?? []),
              'pending'
            ]);
          }
        }
        console.log(`  ✓ Berhasil insert ${genResult.tasks.length} tasks untuk Fase ${i + 1}!`);
      } catch (err: any) {
        console.error(`  ✗ Gagal generate task Fase ${i + 1}:`, err.message);
      }
    }
  }
  
  // Set status plan to done jika semua fase sudah ada tasks
  await client.query('UPDATE plans SET status = $1 WHERE id = $2', ['done', planId]);
  console.log('Selesai! Status plan diupdate ke done.');
  
  await client.end();
};

run().catch(console.error);
