#!/usr/bin/env node
// Buat token CLI (rv_*) untuk user berdasarkan email, langsung ke DB.
// Ini jalur auth yang SAMA dengan yang dipakai CLI @notdeadlysins/scratch-agent
// (Bearer token -> verifyToken -> sha256). Dipakai untuk simulasi e2e.
//
// Pakai: node scripts/make-token.mjs <email> [label]
import { createHash, randomBytes } from "crypto";
import { readFileSync } from "fs";
import pg from "pg";

function loadEnv() {
  const out = {};
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return out;
}

const email = process.argv[2];
const label = process.argv[3] ?? "simulasi-e2e";
if (!email) {
  console.error("Pakai: node scripts/make-token.mjs <email> [label]");
  process.exit(1);
}

const env = loadEnv();
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL tidak ada di .env");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
try {
  let rows = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (!rows.rows.length) {
    rows = await pool.query(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id",
      [email, email.split("@")[0]],
    );
    console.log("user dibuat:", rows.rows[0].id);
  }
  const userId = rows.rows[0].id;

  const token = `rv_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(token).digest("hex");
  await pool.query("INSERT INTO tokens (user_id, token_hash, label) VALUES ($1, $2, $3)", [userId, hash, label]);
  console.log("userId:", userId);
  console.log("token:", token);
} finally {
  await pool.end();
}
