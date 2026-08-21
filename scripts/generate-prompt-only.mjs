import { writeFileSync, mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const TOKEN = "rv_caa0f2fd53231b55922ce182d2bfe9d248306720a31c490b";
const BRIEF = "Aplikasi Kasir Kopi bernama KopiKu, web app untuk kedai kopi kecil mencatat transaksi penjualan. Fitur yang dibutuhkan: menu digital berisi kategori dan harga, transaksi kasir dengan pembayaran tunai dan QRIS, laporan penjualan harian yang terhitung otomatis, serta stok bahan yang berkurang setiap penjualan terjadi. Dipakai satu kedai saja, login sederhana email dan password untuk kasir dan pemilik, tanpa multi cabang.";

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

async function main() {
  console.log("1. Generating plan structure...");
  const gen = await api("/api/generate", {
    method: "POST",
    body: { brief: BRIEF, techPrefs: { mode: "auto" } },
  });
  console.log("Plan ID:", gen.id);

  console.log("2. Generating tasks for features...");
  const plan0 = await api(`/api/v1/plans/${gen.id}`);
  for (let i = 0; i < plan0.features.length; i++) {
    const r = await api(`/api/plans/${gen.id}/generate-tasks`, {
      method: "POST",
      body: { featureIndex: i },
    });
    console.log(`  Feature ${i + 1} (${plan0.features[i].title}): ${r.tasksGenerated ?? 0} tasks`);
  }

  const plan = await api(`/api/v1/plans/${gen.id}`);
  console.log("\nPlan Summary:");
  console.log("Title:", plan.title);
  console.log("Features count:", plan.features.length);
  plan.features.forEach((f, fi) => {
    console.log(`Feature ${fi + 1}: ${f.title}`);
    f.subFeatures.forEach((sf, sfi) => {
      console.log(`   - Sub ${sfi + 1}: ${sf.title} (${sf.tasks?.length ?? 0} tasks)`);
    });
  });

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
 scratch-agent plan get ${gen.id}

LANGKAH 3: LOOP kerjakan SATU task per siklus:
 scratch-agent task next --plan ${gen.id} --json
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

  mkdirSync("simulasi-e2e", { recursive: true });
  writeFileSync("simulasi-e2e/04-agent-prompt.txt", prompt);
  writeFileSync("simulasi-e2e/03-plan-mentah.json", JSON.stringify(plan, null, 2));
  console.log("\nPrompt saved to simulasi-e2e/04-agent-prompt.txt");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
