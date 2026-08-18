const fs = require("fs");
const crypto = require("crypto");
fs.readFileSync(".env", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});
const { Client } = require("pg");
(async () => {
  // Token dibaca dari file (scripts-e2e/.token), tidak pernah di-hardcode.
  const plain = fs.readFileSync("scripts-e2e/.token", "utf8").trim();
  const hash = crypto.createHash("sha256").update(plain).digest("hex");
  console.log("computed hash:", hash);
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT token_hash, label, user_id, revoked_at FROM tokens WHERE label = $1", ["e2e-security-test"]);
  console.log("DB rows:", JSON.stringify(r.rows, null, 1));
  console.log("hash match:", r.rows[0]?.token_hash === hash, "| revoked:", r.rows[0]?.revoked_at);
  const u = await c.query("SELECT id, email FROM users WHERE id = $1", [r.rows[0]?.user_id]);
  console.log("user:", JSON.stringify(u.rows));
  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
