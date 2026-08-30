import "./lib-env";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

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

import { getDb } from "../src/db";
import { plans, features, subFeatures, tasks } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { deletePlan, getPlan, savePlan, updatePlanStatus } from "../src/lib/storage";
import { generateTasksForFeature, buildTaskRef, sanitizeDeps, assignTasksToSubFeatures } from "../src/lib/generate";

const TOKEN = process.env.SIM_TOKEN ?? "";
const USER_ID = "d8442b9f-85ac-493b-9c55-ff93866f0a20";
const BRIEF = "Aplikasi Kasir Kopi bernama KopiKu, web app untuk kedai kopi kecil mencatat transaksi penjualan. Fitur yang dibutuhkan: menu digital berisi kategori dan harga, transaksi kasir dengan pembayaran tunai dan QRIS, laporan penjualan harian yang terhitung otomatis, serta stok bahan yang berkurang setiap penjualan terjadi. Dipakai satu kedai saja, login sederhana email dan password untuk kasir dan pemilik, tanpa multi cabang.";

interface FinalTask {
  ref: string;
  title: string;
  layer: "frontend" | "backend" | "qa";
  phase: number;
  page: string | null;
  deps: string[];
  status: "pending";
  retryCount: number;
  lastFailReason: string | null;
  failReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

function makeTask(ref: string, title: string, layer: "frontend" | "backend" | "qa", phase: number, page: string | null): FinalTask {
  return { ref, title, layer, phase, page, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null };
}

async function main() {
  const db = getDb();
  const all = await db.select({ id: plans.id, title: plans.title, createdAt: plans.createdAt, status: plans.status }).from(plans);
  console.log("Plans di DB saat ini:", all);

  // 1. Hapus plan lama (62ffec38...) jika ada
  for (const p of all) {
    if (p.id === "62ffec38-8311-4e92-a08b-86669ebb4959") {
      console.log(`Menghapus plan lama: ${p.id}...`);
      await deletePlan(p.id);
      console.log("Plan lama berhasil dihapus.");
    }
  }

  // 2. Ambil plan terbaru yang perlu diselesaikan
  const remaining = await db.select().from(plans);
  const activePlanRow = remaining[remaining.length - 1];
  if (!activePlanRow) {
    console.log("Tidak ada plan aktif di DB.");
    return;
  }

  const planId = activePlanRow.id;
  console.log(`\nMemeriksa & menyelesaikan task untuk Plan ID: ${planId}`);
  const currentPlan = await getPlan(planId);
  if (!currentPlan) throw new Error("Plan tidak ditemukan: " + planId);

  const featureCount = currentPlan.features.length;
  console.log(`Total fitur: ${featureCount}`);

  for (let fi = 0; fi < featureCount; fi++) {
    const feature = currentPlan.features[fi];
    const existingTaskCount = feature.subFeatures.flatMap((sf) => sf.tasks).length;

    if (existingTaskCount > 0 && fi < featureCount - 1) {
      console.log(`  [Fase ${fi + 1}] "${feature.title}" SUDAH memiliki ${existingTaskCount} task (lewati)`);
      continue;
    }

    if (existingTaskCount > 0 && fi === featureCount - 1) {
      const hasQA = feature.subFeatures.some((sf) => sf.title.includes("QA & Integrasi"));
      if (hasQA) {
        console.log(`  [Fase ${fi + 1}] "${feature.title}" SUDAH lengkap dengan QA (lewati)`);
        continue;
      }
    }

    console.log(`  [Fase ${fi + 1}] "${feature.title}" belum lengkap. Men-generate task...`);
    const subTitles = feature.subFeatures.map((sf: any) => sf.title);
    const taskGenResult = await generateTasksForFeature(
      BRIEF,
      feature.title,
      subTitles,
      fi,
      "free",
      featureCount,
      null,
    );

    const tasksList = taskGenResult.tasks;
    const keyed = tasksList.map((t, i) => ({ ...t, __key: (t.id && t.id.trim()) || `__auto${i}` }));
    const tempKeyToRef = new Map<string, string>();
    const assigned: { task: FinalTask; rawDeps: string[] }[] = [];

    let taskNum = 0;
    const assignment = assignTasksToSubFeatures(keyed, subTitles);

    for (let subIndex = 0; subIndex < feature.subFeatures.length; subIndex++) {
      const sf = feature.subFeatures[subIndex];
      const taskIndexes = assignment.get(subIndex) ?? [];
      sf.tasks = taskIndexes.map((ti: number) => {
        const t = keyed[ti];
        const ref = buildTaskRef(fi, subIndex, ++taskNum);
        tempKeyToRef.set(t.__key, ref);
        const task = makeTask(ref, t.title, t.layer, fi + 1, t.page);
        assigned.push({ task, rawDeps: t.deps ?? [] });
        return task;
      });
      console.log(`    - Sub-fitur ${subIndex + 1}: "${sf.title}" -> ${sf.tasks.length} task`);
    }

    const nodes = assigned.map(({ task, rawDeps }) => ({
      ref: task.ref,
      deps: rawDeps.map((d) => tempKeyToRef.get((d ?? "").trim())).filter((r): r is string => !!r),
    }));
    const cleanDeps = sanitizeDeps(nodes);
    for (const { task } of assigned) {
      task.deps = cleanDeps.get(task.ref) ?? [];
    }

    if (fi === featureCount - 1) {
      const lastPhase = featureCount + 1;
      const qaSubs = [
        { title: "Jalankan aplikasi end-to-end", layer: "qa" as const },
        { title: "Uji setiap alur utama terhadap selesai bila", layer: "qa" as const },
        { title: "Perbaiki bug yang ditemukan", layer: "qa" as const },
        { title: "Bersihkan sisa stub dan console.log", layer: "qa" as const },
      ];
      feature.subFeatures.push({
        title: "QA & Integrasi Otomatis",
        tujuan: "Verifikasi menyeluruh sistem sebelum deploy",
        selesaiBila: ["Semua alur fungsional berjalan tanpa error"],
        tasks: qaSubs.map((q, qIdx) =>
          makeTask(`F${String(fi + 1).padStart(2, "0")}-S99-T${String(qIdx + 1).padStart(2, "0")}`, q.title, q.layer, lastPhase, null)
        ),
      });
      console.log(`    - Sub-fitur QA Otomatis disuntikkan: 4 task`);
    }
  }

  currentPlan.status = "ready";
  await savePlan(currentPlan, USER_ID);
  await updatePlanStatus(planId, "ready");

  const finalPlan = await getPlan(planId);
  const totalTasks = (finalPlan?.features ?? []).flatMap((f) => f.subFeatures ?? []).flatMap((sf) => sf.tasks ?? []).length;
  console.log(`\n✅ PLAN SIAP DENGAN TOTAL ${totalTasks} TASK!`);

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

  mkdirSync("simulasi-e2e", { recursive: true });
  writeFileSync("simulasi-e2e/04-agent-prompt.txt", prompt);
  writeFileSync("simulasi-e2e/03-plan-mentah.json", JSON.stringify(finalPlan, null, 2));
  console.log("Prompt tersimpan di simulasi-e2e/04-agent-prompt.txt");
}

main().catch((err) => {
  console.error("Gagal:", err);
  process.exit(1);
});
