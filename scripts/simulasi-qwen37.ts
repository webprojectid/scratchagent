import { generatePlanStructure, generateTasksForFeature } from "../src/lib/generate";
import { saveLlmConfig } from "../src/lib/llm-config";

async function main() {
  const BRIEF =
    "Platform Manajemen Proyek Freelance & Agency dengan fitur Kanban Board interaktif, alur Escrow Payment, chat real-time dengan attachment, dan pelacakan milestones.";
  const MODEL = "qd/qmodel";
  const MODEL_NAME = "Qwen 3.7 Plus (qd/qmodel)";

  console.log("===============================================================");
  console.log(`🚀 SIMULASI PENGUJIAN URUTAN 1: ${MODEL_NAME}`);
  console.log(`PROMPT: "${BRIEF}"`);
  console.log("===============================================================\n");

  process.env.LLM_MODEL = MODEL;
  await saveLlmConfig({
    baseUrl: process.env.LLM_BASE_URL || "http://localhost:20128/v1",
    apiKey: process.env.LLM_API_KEY || "",
    model: MODEL,
  });

  const tGlobalStart = Date.now();

  // ============================================================
  // TAHAP 1: STRUKTUR PRD, ARSITEKTUR MERMAID, ERD, REQ
  // ============================================================
  console.log("⏱️  [TAHAP 1] Generating PRD Blueprint & Arsitektur...");
  const tStructStart = Date.now();
  const prd = await generatePlanStructure(BRIEF, { mode: "auto" }, [], "pro");
  const structTimeSec = (Date.now() - tStructStart) / 1000;
  const structMin = Math.floor(structTimeSec / 60);
  const structRemSec = (structTimeSec % 60).toFixed(1);

  console.log(`\n✅ TAHAP 1 SELESAI`);
  console.log(`   - Waktu PRD: ${structMin}m ${structRemSec}s (${structTimeSec.toFixed(1)} detik)`);
  console.log(`   - Judul Project: "${prd.title}"`);
  console.log(`   - Total Fase: ${prd.features.length} Fase`);
  console.log(`   - Tech Stack: ${prd.stack.join(", ")}`);

  // ============================================================
  // TAHAP 2: GENERATE TASKS UNTUK SETIAP FASE
  // ============================================================
  console.log("\n---------------------------------------------------------------");
  console.log(`🚀 [TAHAP 2] Generating Tasks untuk seluruh ${prd.features.length} fase...`);
  console.log("---------------------------------------------------------------");

  const tTasksStart = Date.now();
  let totalTasks = 0;

  for (let i = 0; i < prd.features.length; i++) {
    const feat = prd.features[i];
    const subTitles = feat.subFeatures.map((sf) => sf.title);
    const tFase = Date.now();

    const taskRes = await generateTasksForFeature(
      BRIEF,
      feat.title,
      subTitles,
      i,
      "pro",
      prd.features.length,
      []
    );

    const faseSec = (Date.now() - tFase) / 1000;
    totalTasks += taskRes.tasks.length;
    console.log(
      `  ✓ Fase ${String(i + 1).padStart(2, "0")}/${prd.features.length}: "${feat.title}" -> ${taskRes.tasks.length} tasks (${faseSec.toFixed(1)}s)`
    );
  }

  const tasksTimeSec = (Date.now() - tTasksStart) / 1000;
  const tasksMin = Math.floor(tasksTimeSec / 60);
  const tasksRemSec = (tasksTimeSec % 60).toFixed(1);

  const totalTimeSec = (Date.now() - tGlobalStart) / 1000;
  const totalMin = Math.floor(totalTimeSec / 60);
  const totalRemSec = (totalTimeSec % 60).toFixed(1);

  console.log("\n===============================================================");
  console.log(`🏆 HASIL AKHIR SIMULASI: ${MODEL_NAME}`);
  console.log("===============================================================");
  console.log(`1. Waktu PRD Blueprint (Tahap 1) : ${structMin}m ${structRemSec}s (${structTimeSec.toFixed(1)}s)`);
  console.log(`2. Waktu Tasks Gen (Tahap 2)     : ${tasksMin}m ${tasksRemSec}s (${tasksTimeSec.toFixed(1)}s)`);
  console.log(`3. Total Fase Terbentuk          : ${prd.features.length} Fase`);
  console.log(`4. Total Tasks Lengkap           : ${totalTasks} Tasks`);
  console.log(`5. ⏱️ TOTAL WAKTU SAMPAI SELESAI : ${totalMin}m ${totalRemSec}s (${totalTimeSec.toFixed(1)}s)`);
  console.log("===============================================================");
}

main().catch((err) => {
  console.error("❌ SIMULASI ERROR:", err);
  process.exit(1);
});
