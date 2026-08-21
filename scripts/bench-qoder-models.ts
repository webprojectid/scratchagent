import { generatePlanStructure, generateTasksForFeature } from "../src/lib/generate";
import { saveLlmConfig } from "../src/lib/llm-config";

interface BenchmarkResult {
  modelName: string;
  modelKey: string;
  structureTimeSec: number;
  tasksTimeSec: number;
  totalTimeFormatted: string;
  totalTimeSec: number;
  featureCount: number;
  totalTasks: number;
  tokensIn: number;
  tokensOut: number;
  status: "SUCCESS" | "FAILED";
  error?: string;
}

const BRIEF = "Platform Manajemen Proyek Freelance & Agency dengan fitur Kanban Board interaktif, alur Escrow Payment, chat real-time dengan attachment, dan pelacakan milestones.";

const MODELS = [
  { name: "DeepSeek (Qoder)", key: "qd/dmodel" },
  { name: "Kimi (Qoder)", key: "qd/kmodel" },
  { name: "Qwen (Qoder)", key: "qd/qmodel" },
  { name: "Qwen 38 Max (Baseline)", key: "qd/qmodel_38max" },
];

async function runModelBenchmark(modelName: string, modelKey: string): Promise<BenchmarkResult> {
  console.log(`\n========================================================`);
  console.log(`🚀 MEMULAI PENGUJIAN: ${modelName} (${modelKey})`);
  console.log(`========================================================`);
  
  process.env.LLM_MODEL = modelKey;
  await saveLlmConfig({
    baseUrl: process.env.LLM_BASE_URL || "http://localhost:20128/v1",
    apiKey: process.env.LLM_API_KEY || "",
    model: modelKey,
  });

  const tStart = Date.now();
  let structureTimeSec = 0;
  let tasksTimeSec = 0;
  let featureCount = 0;
  let totalTasks = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    console.log(`[1/2] Generating Struktur PRD (Fase, Sub-fitur, Arsitektur, DB, Req)...`);
    const tStructStart = Date.now();
    const structureResult = await generatePlanStructure(
      BRIEF,
      { mode: "auto" },
      [],
      "pro"
    );
    structureTimeSec = (Date.now() - tStructStart) / 1000;
    featureCount = structureResult.plan.features.length;
    tokensIn += structureResult.usage.tokensIn;
    tokensOut += structureResult.usage.tokensOut;

    console.log(`  ✓ PRD selesai dalam ${structureTimeSec.toFixed(2)}s (${featureCount} fase ditemukan)`);

    console.log(`[2/2] Generating Tasks untuk seluruh ${featureCount} fase...`);
    const tTasksStart = Date.now();

    for (let i = 0; i < featureCount; i++) {
      const feat = structureResult.plan.features[i];
      const subTitles = feat.subFeatures.map((sf) => sf.title);
      const tFaseStart = Date.now();
      
      const taskRes = await generateTasksForFeature(
        BRIEF,
        feat.title,
        subTitles,
        i,
        "pro",
        featureCount,
        []
      );

      const faseDurationSec = (Date.now() - tFaseStart) / 1000;
      totalTasks += taskRes.tasks.length;
      tokensIn += taskRes.usage.tokensIn;
      tokensOut += taskRes.usage.tokensOut;
      console.log(`  - Fase ${i + 1}/${featureCount}: "${feat.title}" -> ${taskRes.tasks.length} tasks (${faseDurationSec.toFixed(2)}s)`);
    }

    tasksTimeSec = (Date.now() - tTasksStart) / 1000;
    const totalTimeSec = (Date.now() - tStart) / 1000;
    const totalMin = Math.floor(totalTimeSec / 60);
    const totalRemSec = Math.floor(totalTimeSec % 60);
    const totalTimeFormatted = `${totalMin}m ${totalRemSec}s`;

    console.log(`\n🎉 SELESAI: ${modelName}`);
    console.log(`Total Waktu: ${totalTimeFormatted} (${totalTimeSec.toFixed(2)} detik)`);
    console.log(`Total Fase: ${featureCount} | Total Tasks: ${totalTasks}`);

    return {
      modelName,
      modelKey,
      structureTimeSec,
      tasksTimeSec,
      totalTimeSec,
      totalTimeFormatted,
      featureCount,
      totalTasks,
      tokensIn,
      tokensOut,
      status: "SUCCESS",
    };
  } catch (err: any) {
    const totalTimeSec = (Date.now() - tStart) / 1000;
    console.error(`✗ GAGAL pada ${modelName}:`, err.message);
    return {
      modelName,
      modelKey,
      structureTimeSec,
      tasksTimeSec,
      totalTimeSec,
      totalTimeFormatted: `${totalTimeSec.toFixed(2)}s (FAILED)`,
      featureCount,
      totalTasks,
      tokensIn,
      tokensOut,
      status: "FAILED",
      error: err.message,
    };
  }
}

async function main() {
  console.log("===============================================================");
  console.log("🔥 BATTLE BENCHMARK QODER MODELS 🔥");
  console.log(`PROMPT: "${BRIEF}"`);
  console.log("===============================================================");

  const results: BenchmarkResult[] = [];

  for (const m of MODELS) {
    const res = await runModelBenchmark(m.name, m.key);
    results.push(res);
  }

  console.log("\n\n===============================================================");
  console.log("🏆 HASIL AKHIR PERBANDINGAN BENCHMARK");
  console.log("===============================================================");
  console.table(
    results.map((r) => ({
      Model: r.modelName,
      "Key Qoder": r.modelKey,
      "Waktu PRD": `${r.structureTimeSec.toFixed(1)}s`,
      "Waktu Tasks": `${r.tasksTimeSec.toFixed(1)}s`,
      "Total Waktu": r.totalTimeFormatted,
      "Fase / Tasks": `${r.featureCount} / ${r.totalTasks}`,
      Status: r.status,
    }))
  );
}

main().catch(console.error);
