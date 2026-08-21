import { generatePlanStructure } from "../src/lib/generate";
import { saveLlmConfig } from "../src/lib/llm-config";

async function main() {
  const model = "qd/dmodel";
  console.log("Testing model:", model);
  
  process.env.LLM_MODEL = model;
  await saveLlmConfig({
    baseUrl: process.env.LLM_BASE_URL || "http://localhost:20128/v1",
    apiKey: process.env.LLM_API_KEY || "",
    model: model,
  });

  const BRIEF = "Platform Manajemen Proyek Freelance & Agency dengan fitur Kanban Board interaktif, alur Escrow Payment, chat real-time dengan attachment, dan pelacakan milestones.";

  try {
    const t0 = Date.now();
    const res = await generatePlanStructure(BRIEF, { mode: "auto" }, [], "pro");
    const t1 = Date.now();
    console.log(`✓ SUKSES dalam ${(t1 - t0) / 1000}s!`);
    console.log("Title:", res.plan.title);
    console.log("Features count:", res.plan.features.length);
    res.plan.features.forEach((f, i) => {
      console.log(`  Fase ${i + 1}: ${f.title} (${f.subFeatures?.length} sub-fitur)`);
    });
  } catch (e: any) {
    console.error("✗ ERROR STACK TRACE:");
    console.error(e);
  }
}

main().catch(console.error);
