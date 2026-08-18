const fs = require("fs");
fs.readFileSync(".env", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT created_at, type, detail, user_id, ip FROM security_events ORDER BY created_at DESC LIMIT 3");
  r.rows.forEach((x) => console.log(JSON.stringify(x)));
  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
