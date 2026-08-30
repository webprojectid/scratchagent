import { readFileSync } from "fs";

// Muat .env buat script yang dijalankan langsung via tsx/node
// (runner ini gak ikut load .env milik Next.js). Jangan hardcode kredensial.
if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "").trim();
    }
  } catch {
    // .env gak ada: biarkan gagal jelas di pemakaian process.env berikutnya
  }
}
