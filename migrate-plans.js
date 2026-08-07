const { Pool } = require("pg");
const crypto = require("crypto");
const fs = require("fs");

const pool = new Pool({ connectionString: "postgresql://postgres.loqbxknhnwukhikcpgab:Kurangkerjaan93asd!!@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres" });
const TUSER = "701f135a-050a-4e08-bc97-b6d3ee91d7e5";
const data = JSON.parse(fs.readFileSync("C:/Users/csm11/scratchagent/.scratch-data/plans.json", "utf-8"));

(async () => {
  for (const [planId, plan] of Object.entries(data)) {
    console.log(`Migrating: ${planId.slice(0,8)}... - ${plan.title}`);
    try {
      await pool.query(`INSERT INTO plans (id, user_id, title, brief, tech_prefs, assumptions, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [planId, TUSER, plan.title, plan.brief || "", JSON.stringify(plan.techStack || plan.stack || []), JSON.stringify(plan.asumi || []), plan.status || "ready", new Date(plan.createdAt || Date.now()).toISOString()]);

      for (const f of (plan.features || [])) {
        const fid = f.id || crypto.randomUUID();
        await pool.query(`INSERT INTO features (id, plan_id, slug, title, icon, description, tujuan, selesai_bila, status, "order")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [fid, planId, f.slug, f.title, f.icon, f.description, f.tujuan, JSON.stringify(f.selesaiBila || []), f.status || "direncanakan", f.order || 0]);

        for (const sf of (f.subFeatures || [])) {
          const sid = sf.id || crypto.randomUUID();
          await pool.query(`INSERT INTO sub_features (id, feature_id, title, "order")
            VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
            [sid, fid, sf.title, 0]);

          for (const t of (sf.tasks || [])) {
            await pool.query(`INSERT INTO tasks (id, plan_id, feature_id, sub_feature_id, ref, title, layer, phase, page, deps, status, retry_count, last_fail_reason, fail_reason, started_at, completed_at, "order")
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (ref) DO NOTHING`,
              [crypto.randomUUID(), planId, fid, sid, t.ref, t.title, t.layer, t.phase, t.page || null, JSON.stringify(t.deps || []), t.status || "pending", t.retryCount || 0, t.lastFailReason || null, t.failReason || null, t.startedAt || null, t.completedAt || null, t.order || 0]);
          }
        }
      }
      console.log("  OK");
    } catch (e) {
      console.error("  ERR:", e.message.slice(0, 100));
    }
  }
  console.log("Done");
  await pool.end();
})().catch(e => { console.error(e); pool.end(); });
