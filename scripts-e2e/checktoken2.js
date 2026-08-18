const fs = require("fs");
const crypto = require("crypto");
fs.readFileSync(".env", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});
const t = fs.readFileSync("scripts-e2e/.token", "utf8").trim();
console.log("file token len:", t.length, "prefix:", t.slice(0, 9));
const hash = crypto.createHash("sha256").update(t).digest("hex");
console.log("computed hash:", hash.slice(0, 16));
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT label, revoked_at, created_at FROM tokens WHERE token_hash=$1", [hash]);
  console.log("DB match for file token:", JSON.stringify(r.rows));
  const recent = await c.query("SELECT label, left(token_hash,12) h, revoked_at, created_at FROM tokens ORDER BY created_at DESC LIMIT 5");
  recent.rows.forEach((x) => console.log(x.created_at, x.label, x.h, x.revoked_at ? "REVOKED" : "active"));
  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
