#!/usr/bin/env node
/**
 * Simulasi end-to-end pipeline Scratch Agent, lewat HTTP API yang sama
 * persis dengan yang dipakai website + CLI agent:
 *
 *   brief -> POST /api/generate -> plan tersimpan
 *        -> POST /api/plans/{id}/generate-tasks (per feature) -> plan "ready"
 *        -> GET  /api/plans/{id}            (ambil plan mentah lengkap)
 *        -> copy prompt agent (sama seperti modal "Mulai implementasi")
 *        -> LOOP: GET /api/v1/plans/{id}/next -> start -> kerjakan -> complete
 *        -> verifikasi done=true + progress 100%
 *
 * Cara pakai (pakai token CLI, tanpa cookie browser):
 *   node scripts/make-token.mjs teguhends@gmail.com simulasi
 *   SIM_TOKEN=rv_xxx node scripts/simulate-e2e.mjs
 *
 * Atau pakai cookie session browser (opsional):
 *   node scripts/simulate-e2e.mjs "COOKIE_SESSION_DARI_BROWSER"
 *
 * Output ditulis ke folder simulasi-e2e/:
 *   01-brief.txt                brief yang dipakai
 *   02-generate-response.json   respons mentah POST /api/generate
 *   03-plan-mentah.json         plan lengkap hasil generate + tasks
 *   04-agent-prompt.txt         prompt agent hasil copy (yg biasa muncul di modal)
 *   05-task-log.txt             log loop agent (next/start/complete)
 *   06-hasil-akhir.json         progress akhir + status done
 */
import { mkdirSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";

const BASE = process.env.SIM_BASE ?? "http://localhost:3000";
const OUT = join(process.cwd(), "simulasi-e2e");
mkdirSync(OUT, { recursive: true });

const cliToken = process.env.SIM_TOKEN ?? "";
const cookie = process.argv[2] ?? "";
const RESUME_PLAN = process.env.RESUME_PLAN ?? ""; // Lanjutkan dari planId yang sudah digenerate.
if (!cliToken && !cookie) {
  console.error("Pakai: SIM_TOKEN=rv_xxx node scripts/simulate-e2e.mjs");
  process.exit(1);
}

// Brief simulasi: aplikasi kasir kedai kopi. Cukup kaya supaya LLM bikin
// beberapa feature + task, tapi masih selesai dalam hitungan menit.
const BRIEF = [
  "Aplikasi Kasir Kopi bernama KopiKu, web app untuk kedai kopi kecil mencatat transaksi penjualan.",
  "Fitur yang dibutuhkan: menu digital berisi kategori dan harga, transaksi kasir dengan pembayaran tunai dan QRIS,",
  "laporan penjualan harian yang terhitung otomatis, serta stok bahan yang berkurang setiap penjualan terjadi.",
  "Dipakai satu kedai saja, login sederhana email dan password untuk kasir dan pemilik, tanpa multi cabang.",
].join(" ");

const TECH_PREFS = { mode: "auto" };

let TOKEN = cliToken; // Kalau pakai SIM_TOKEN, seluruh simulasi lewat Bearer (jalur CLI asli).
const logLines = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logLines.push(line);
}
function save(name, content) {
  const path = join(OUT, name);
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  log(`simpan simulasi-e2e/${name}`);
}
function appendLog(msg) {
  log(msg);
  appendFileSync(join(OUT, "05-task-log.txt"), msg + "\n");
}

async function api(path, opts = {}) {
  const useToken = cliToken ? true : opts.useToken;
  const res = await fetch(BASE + path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(useToken && TOKEN ? { Authorization: `Bearer ${TOKEN}` } : { Cookie: cookie }),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* bukan JSON */ }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}\n${text.slice(0, 400)}`);
  }
  return json;
}

const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

async function main() {
  log("=== SIMULASI E2E SCRATCH AGENT mulai ===");
  save("01-brief.txt", BRIEF);

  // STEP 0: token. Dengan SIM_TOKEN, ini jalur yang sama persis dengan CLI asli
  // (Bearer token). Tanpa SIM_TOKEN, buat token baru lewat session browser.
  if (cliToken) {
    log("STEP 0: pakai SIM_TOKEN (Bearer, jalur CLI asli)");
  } else {
    log("STEP 0: POST /api/tokens (buat token CLI, identitas dari session browser)");
    const tokenRes = await api("/api/tokens", { method: "POST", body: { label: "simulasi-e2e" } });
    TOKEN = tokenRes.token;
    log(`token dibuat: ${TOKEN.slice(0, 14)}… (hash ${tokenRes.hash.slice(0, 10)}…)`);
  }

  // STEP 1: generate plan dari brief (ini yang terjadi saat user klik "Generate Plan").
  let planId;
  if (RESUME_PLAN) {
    planId = RESUME_PLAN;
    log(`STEP 1: RESUME dari planId=${planId} (generate sudah terjadi sebelumnya)`);
  } else {
    log("STEP 1: POST /api/generate (LLM multi tahap, bisa beberapa menit)");
    const genStart = Date.now();
    const gen = await api("/api/generate", {
      method: "POST",
      body: { brief: BRIEF, techPrefs: TECH_PREFS },
    });
    log(`generate selesai dalam ${((Date.now() - genStart) / 1000).toFixed(0)}s -> planId=${gen.id}`);
    if ((gen.warnings ?? []).length) log(`warnings: ${gen.warnings.join("; ")}`);
    save("02-generate-response.json", gen);
    planId = gen.id;
  }

  // STEP 2: generate tasks per feature (tombol "Mulai implementasi" di UI melakukan ini).
  // Plan penuh dibaca lewat /api/v1/plans/{id}, endpoint yang sama dengan CLI.
  const plan0 = await api(`/api/v1/plans/${planId}`, { useToken: true });
  const featureCount = (plan0.features ?? []).length;
  log(`STEP 2: generate tasks untuk ${featureCount} feature`);
  for (let i = 0; i < featureCount; i++) {
    const fi = Date.now();
    const r = await api(`/api/plans/${planId}/generate-tasks`, { method: "POST", body: { featureIndex: i } });
    log(`  feature[${i}] ${plan0.features[i].title}: ${r.tasksGenerated ?? 0} task (${((Date.now() - fi) / 1000).toFixed(0)}s)`);
  }
  const taskState = await api(`/api/plans/${planId}/generate-tasks`, { method: "GET" });
  if (!taskState.allReady) throw new Error(`Plan belum ready setelah generate tasks: ${JSON.stringify(taskState)}`);
  log(`semua feature punya task, status plan: ${taskState.status}`);

  // STEP 3: ambil plan mentah lengkap (endpoint v1, sama dengan CLI "plan get").
  log("STEP 3: GET plan lengkap via /api/v1/plans/{id}");
  const plan = await api(`/api/v1/plans/${planId}`, { useToken: true });
  const totalTasks = (plan.features ?? []).flatMap((f) => f.subFeatures ?? []).reduce((acc, sf) => acc + (sf.tasks?.length ?? 0), 0);
  log(`plan mentah: ${plan.title} | ${plan.features.length} feature | ${totalTasks} task`);
  save("03-plan-mentah.json", plan);

  // STEP 4: copy prompt agent. Format sama persis dengan modal AgentPromptModal.
  log("STEP 4: copy prompt agent (seperti tombol Salin prompt di modal)");
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
- Saat mengerjakan task frontend/UI: CEK apakah Skill Scratch Agent aktif
  otomatis. Jika AKTIF: terapkan rekomendasinya (warna, tipografi, layout,
  best practice) supaya hasil profesional. Jika TIDAK aktif: beri tau user
  "Skill Scratch Agent belum aktif (mungkin perlu sesi baru agar ter-load)",
  lalu tetap lanjutkan dengan best practice UI umum.

LANGKAH 4: Setelah done=true:
 Jalankan aplikasi sekali lagi, verifikasi semua alur utama melawan "selesai bila"
 tiap fitur. Lampirkan checklist di laporan akhir. Jika ada rusak, lapor jujur.`;
  save("04-agent-prompt.txt", prompt);

  // STEP 5: jalankan loop agent lewat API v1 (yang dipanggil CLI scratch-agent).
  // Di simulasi ini "mengerjakan task" = mencatat langkah di log; penandaan
  // status lewat endpoint yang sama persis dengan CLI asli.
  // MAX_TASKS membatasi jumlah task yang dikerjakan (default: semua sampai done).
  const MAX_TASKS = Number(process.env.MAX_TASKS ?? 0) || Infinity;
  log(`STEP 5: LOOP agent (next -> start -> complete), target ${MAX_TASKS === Infinity ? "done=true" : `${MAX_TASKS} task (capped)`}`);
  appendLog(`=== LOOP AGENT plan ${planId} (${totalTasks} task, cap ${MAX_TASKS === Infinity ? "semua" : MAX_TASKS}) ===`);
  let cycles = 0;
  const doneRefs = [];
  let capped = false;
  while (cycles < totalTasks + 5) {
    if (doneRefs.length >= MAX_TASKS) {
      capped = true;
      appendLog(`CAP tercapai (${MAX_TASKS} task dikerjakan). Loop berhenti; sisa task tetap pending di server.`);
      break;
    }
    cycles++;
    const next = await api(`/api/v1/plans/${planId}/next`, { useToken: true });
    if (next.blocked) {
      appendLog(`BLOCKED: ${JSON.stringify(next.failedTasks)}`);
      throw new Error("Plan ke-block oleh task gagal. Lihat 05-task-log.txt");
    }
    if (next.done) {
      appendLog(`done=true setelah ${doneRefs.length} task. Selesai.`);
      break;
    }
    const { ref, title, layer, phase } = next.task;
    const prog = next.progress;
    appendLog(
      `[${elapsed()}] NEXT ${ref} fase ${prog.phase.current}/${prog.phase.total} ${layer}${prog.checkpoint ? " [CHECKPOINT: lapisan/fase berganti]" : ""} :: ${title}`,
    );
    await api(`/api/v1/tasks/${encodeURIComponent(ref)}/start?planId=${planId}`, { method: "POST", useToken: true });
    // Simulasi pengerjaan nyata: jeda singkat sebagai durasi kerja agent.
    await new Promise((r) => setTimeout(r, 250));
    await api(`/api/v1/tasks/${encodeURIComponent(ref)}/complete?planId=${planId}`, { method: "POST", useToken: true });
    doneRefs.push(ref);
    appendLog(`[${elapsed()}] DONE ${ref} (${doneRefs.length}/${totalTasks})`);
  }

  // STEP 6: verifikasi akhir.
  log("STEP 6: verifikasi akhir");
  const finalNext = await api(`/api/v1/plans/${planId}/next`, { useToken: true });
  const finalProgress = await api(`/api/plans/${planId}/progress`, { useToken: true });
  save("06-hasil-akhir.json", { finalNext, finalProgress, totalTask: totalTasks, capped });
  log(`done=${finalNext.done} | progress ${finalProgress.done}/${finalProgress.total} (failed ${finalProgress.failed}) | status plan: ${finalProgress.status}${capped ? " [CAP]" : ""}`);
  log(`=== SIMULASI SELESAI dalam ${elapsed()} ===`);
  log(`planId: ${planId}`);
}

main().catch((err) => {
  log(`GAGAL: ${err.message}`);
  save("05-task-log.txt", logLines.join("\n"));
  process.exit(1);
});
