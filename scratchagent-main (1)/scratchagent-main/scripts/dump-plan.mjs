// Extract plan lengkap (termasuk architecture & databaseSchema di tech_prefs) dari DB ke JSON.
// Pakai: node scripts/dump-plan.mjs <planId> <outfile.json>
import pg from "pg";
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)];
  }),
);

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const planId = process.argv[2];
const out = process.argv[3];
if (!planId || !out) {
  console.error("Pakai: node scripts/dump-plan.mjs <planId> <outfile.json>");
  process.exit(1);
}

try {
  const planRows = await pool.query("SELECT * FROM plans WHERE id = $1", [planId]);
  if (!planRows.rows.length) {
    console.error("Plan tidak ditemukan:", planId);
    process.exit(1);
  }
  const p = planRows.rows[0];
  const tp = p.tech_prefs ?? p.techPrefs ?? {};

  const featRows = await pool.query("SELECT * FROM features WHERE plan_id = $1 ORDER BY \"order\" NULLS LAST", [planId]);
  const features = [];
  for (const f of featRows.rows) {
    const subRows = await pool.query("SELECT * FROM sub_features WHERE feature_id = $1 ORDER BY \"order\" NULLS LAST", [f.id]);
    const subs = [];
    for (const s of subRows.rows) {
      const taskRows = await pool.query("SELECT * FROM tasks WHERE sub_feature_id = $1 ORDER BY \"order\" NULLS LAST", [s.id]);
      subs.push({
        title: s.title,
        tasks: taskRows.rows.map((t) => ({
          ref: t.ref,
          title: t.title,
          layer: t.layer,
          phase: t.phase,
          page: t.page,
          deps: t.deps ?? [],
          status: t.status,
          retryCount: t.retry_count ?? 0,
          lastFailReason: t.last_fail_reason ?? null,
          failReason: t.fail_reason ?? null,
          startedAt: t.started_at ?? null,
          completedAt: t.completed_at ?? null,
        })),
      });
    }
    features.push({
      slug: f.slug,
      title: f.title,
      icon: f.icon,
      description: f.description,
      tujuan: f.tujuan,
      selesaiBila: f.selesai_bila ?? [],
      status: f.status,
      subFeatures: subs,
    });
  }

  const plan = {
    id: p.id,
    title: p.title,
    brief: p.brief,
    stack: tp.stack ?? [],
    techStack: tp.techStack ?? [],
    architecture: tp.architecture ?? "",
    databaseSchema: tp.databaseSchema ?? "",
    requirements: tp.requirements ?? null,
    userFlow: tp.userFlow ?? [],
    warnings: tp.warnings ?? [],
    asumsi: p.assumptions ?? [],
    status: p.status,
    features,
    createdAt: p.created_at?.toISOString(),
  };

  writeFileSync(out, JSON.stringify(plan, null, 2), "utf8");
  const totalTasks = features.flatMap((f) => f.subFeatures).reduce((a, s) => a + s.tasks.length, 0);
  console.log("OK:", out);
  console.log("title:", plan.title);
  console.log("features:", features.length, "| tasks:", totalTasks);
  console.log("architecture length:", plan.architecture.length);
  console.log("databaseSchema length:", plan.databaseSchema.length);
  console.log("userFlow:", plan.userFlow?.length ?? 0, "| requirements fungsional:", plan.requirements?.fungsional?.length ?? 0);
} finally {
  await pool.end();
}
