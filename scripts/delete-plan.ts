import "./lib-env";
import { readFileSync } from "fs";

function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, "").trim();
      }
    }
  } catch {}
}
loadEnv();

import { deletePlan, getPlan } from "../src/lib/storage";
import { getDb } from "../src/db";
import { plans } from "../src/db/schema";
import { eq } from "drizzle-orm";

import { getPlan } from "../src/lib/storage";
import { writeFileSync } from "fs";

async function main() {
  const planId = "a1f82b5c-70b0-481a-afbe-d67a28d5856c";
  const plan = await getPlan(planId);
  if (!plan) {
    console.log("Plan tidak ditemukan!");
    return;
  }
  const totalTasks = (plan.features ?? []).flatMap((f) => f.subFeatures ?? []).flatMap((sf) => sf.tasks ?? []).length;
  console.log(`Plan ID: ${plan.id}`);
  console.log(`Title: ${plan.title}`);
  console.log(`Status: ${plan.status}`);
  console.log(`Features: ${plan.features.length}`);
  console.log(`Total Tasks: ${totalTasks}`);

  const TOKEN = process.env.SIM_TOKEN ?? "";
  const prompt = `Kamu akan mengerjakan task dari Scratch Agent lewat CLI scratch-agent (package npm: @notdeadlysins/scratch-agent).
Prasyarat: Node.js + Python 3.x.

LANGKAH 0: Install Skill Scratch Agent v2.4 (sekali saja):
 Cek apakah sudah terpasang: uipro --version
 Jika SUDAH: lanjut.
 Jika BELUM: install sekali lalu lanjut (TIDAK perlu restart):
  npm install -g ui-ux-pro-max-cli
  uipro init --ai opencode --global

LANGKAH 1: Install CLI, login & init (sekali saja):
 npm install -g @notdeadlysins/scratch-agent
 scratch-agent login --token ${TOKEN}
 scratch-agent init --agent opencode

LANGKAH 2: Baca PRD (sekali):
 scratch-agent plan get ${planId}

LANGKAH 3: LOOP kerjakan SATU task per siklus:
 scratch-agent task next --plan ${planId} --json
 scratch-agent task start <ref>
 # ...kerjakan task ini (eksplor kode dulu, ikuti pola project)...
 scratch-agent task complete <ref>
 # Jika ke-block: scratch-agent task fail <ref> "alasan singkat"
 # Ulangi sampai done=true

ATURAN:
- Jika task next menyertakan last_fail_reason: BACA dulu, ganti pendekatan.
- Jika respons blocked=true: berhenti, lapor daftar task gagal, tunggu perintah.
- Jika respons checkpoint=true: JANGAN mulai task. Berhenti, lapor, tunggu "lanjut".
- Jangan borong task; percayakan urutan ke server.
- Saat mengerjakan task frontend/UI: CEK apakah Skill Scratch Agent aktif otomatis. Jika AKTIF: terapkan rekomendasinya (warna, tipografi, layout, best practice) supaya hasil profesional. Jika TIDAK aktif: beri tau user "Skill Scratch Agent belum aktif (mungkin perlu sesi baru agar ter-load)", lalu tetap lanjutkan dengan best practice UI umum.

LANGKAH 4: Setelah done=true:
 Jalankan aplikasi sekali lagi, verifikasi semua alur utama melawan "selesai bila" tiap fitur. Lampirkan checklist di laporan akhir. Jika ada rusak, lapor jujur.`;

  writeFileSync("simulasi-e2e/04-agent-prompt.txt", prompt);
  console.log("simulasi-e2e/04-agent-prompt.txt berhasil diperbarui.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
