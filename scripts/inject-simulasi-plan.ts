import { generatePlanStructure, generateTasksForFeature, buildTaskRef } from "../src/lib/generate";
import { savePlan, getPlan } from "../src/lib/storage";
import type { Plan, Feature, Task } from "../src/lib/types";
import crypto from "crypto";

async function main() {
  const BRIEF =
    "Platform Manajemen Proyek Freelance & Agency dengan fitur Kanban Board interaktif, alur Escrow Payment, chat real-time dengan attachment, dan pelacakan milestones.";
  const USER_EMAIL = "teguhends@gmail.com";

  console.log("===============================================================");
  console.log(`🚀 MEMBUAT PROJECT HASIL SIMULASI UNTUK: ${USER_EMAIL}`);
  console.log(`PROMPT: "${BRIEF}"`);
  console.log("===============================================================\n");

  console.log("1. Generating PRD Structure & Architecture...");
  const struct = await generatePlanStructure(BRIEF, { mode: "auto" }, [], "pro");

  const planId = crypto.randomUUID();
  console.log(`   - Plan ID: ${planId}`);
  console.log(`   - Title: ${struct.title}`);
  console.log(`   - Features: ${struct.features.length} fase`);

  console.log("\n2. Generating Tasks untuk seluruh fase...");
  const featuresList: Feature[] = [];
  const allTasks: Task[] = [];

  for (let i = 0; i < struct.features.length; i++) {
    const f = struct.features[i];
    const subTitles = f.subFeatures.map((sf) => sf.title);
    console.log(`   - Generating Fase ${i + 1}/${struct.features.length}: "${f.title}"...`);

    const taskRes = await generateTasksForFeature(
      BRIEF,
      f.title,
      subTitles,
      i,
      "pro",
      struct.features.length,
      []
    );

    const mappedTasks: Task[] = taskRes.tasks.map((t, tIdx) => {
      // Find matching sub-feature index
      let subIdx = f.subFeatures.findIndex(
        (sf) => sf.title.toLowerCase().trim() === (t.sub_feature || "").toLowerCase().trim()
      );
      if (subIdx === -1) subIdx = 0;

      return {
        id: crypto.randomUUID(),
        ref: buildTaskRef(i, subIdx, tIdx + 1),
        feature: f.title,
        sub_feature: t.sub_feature || f.subFeatures[subIdx]?.title || "",
        title: t.title,
        layer: t.layer,
        status: "pending",
        phase: i + 1,
        page: t.page || null,
        deps: t.deps || [],
      };
    });

    allTasks.push(...mappedTasks);

    featuresList.push({
      title: f.title,
      icon: f.icon,
      priority: f.priority,
      tujuan: f.tujuan,
      selesaiBila: f.selesaiBila,
      subFeatures: f.subFeatures.map((sf) => ({
        title: sf.title,
        tujuan: sf.tujuan,
        selesaiBila: sf.selesaiBila,
      })),
      tasks: mappedTasks,
    });
  }

  const newPlan: Plan = {
    id: planId,
    title: struct.title,
    brief: BRIEF,
    stack: struct.stack,
    techStack: struct.techStack,
    asumsi: struct.asumsi,
    requirements: struct.requirements,
    userFlow: struct.userFlow,
    architecture: struct.architecture,
    databaseSchema: struct.databaseSchema,
    features: featuresList,
    tasks: allTasks,
    status: "ready",
    createdAt: new Date().toISOString(),
  };

  console.log("\n3. Menyimpan Plan ke Database untuk user: " + USER_EMAIL);
  await savePlan(newPlan, USER_EMAIL);

  console.log("\n===============================================================");
  console.log("🎉 PROJECT BERHASIL DISIMPAN KE AKUN TEGUH!");
  console.log(`- Plan ID : ${planId}`);
  console.log(`- URL     : http://localhost:3000/plans/${planId}`);
  console.log(`- Total   : ${featuresList.length} Fase, ${allTasks.length} Tasks`);
  console.log("===============================================================");
}

main().catch((err) => {
  console.error("❌ Gagal:", err);
  process.exit(1);
});
