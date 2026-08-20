const fs = require("fs");
fs.readFileSync(".env", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("DELETE FROM tokens WHERE label LIKE 'e2e-%' RETURNING label");
  console.log("token test dihapus:", r.rows.map((x) => x.label).join(", ") || "tidak ada");
  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
