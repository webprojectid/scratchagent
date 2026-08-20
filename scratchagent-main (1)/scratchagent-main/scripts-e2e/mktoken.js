const fs = require("fs");
const { createHash, randomBytes } = require("crypto");
fs.readFileSync(".env", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
});
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const email = "teguhends@gmail.com";
  let rows = await c.query("SELECT id, email FROM users WHERE email = $1", [email]);
  let admin = rows.rows[0];
  if (!admin) {
    rows = await c.query("INSERT INTO users (email, name) VALUES ($1,$2) RETURNING id, email", [email, email.split("@")[0]]);
    admin = rows.rows[0];
  }
  const plain = "rv_" + randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(plain).digest("hex");
  await c.query("INSERT INTO tokens (user_id, token_hash, label) VALUES ($1,$2,$3)", [admin.id, hash, "e2e-security-test-2"]);
  // Simpan ke file supaya TIDAK pernah muncul literal di command terminal.
  fs.writeFileSync("scripts-e2e/.token", plain + "\n");
  console.log("token written to scripts-e2e/.token, len=" + plain.length);
  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
