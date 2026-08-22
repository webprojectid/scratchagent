import { generatePlanStructure, generateTasksForFeature, buildTaskRef } from "../src/lib/generate";
import { savePlan } from "../src/lib/storage";
import type { Plan, Feature, Task } from "../src/lib/types";
import crypto from "crypto";

async function main() {
  const BRIEF =
    "Aplikasi Android Native (Kotlin & Jetpack Compose) untuk Manajemen Inventaris Toko & Kasir POS Offline-First dengan sinkronisasi Room-to-Cloud Supabase, pemindai barcode kamera MLKit, cetak struk Thermal Bluetooth ESC/POS, dan dashboard laporan penjualan harian.";
  const USER_EMAIL = "teguhends@gmail.com";

  console.log("===============================================================");
  console.log("📱 SIMULASI 1/3: APLIKASI ANDROID NATIVE");
  console.log(`USER  : ${USER_EMAIL}`);
  console.log(`BRIEF : "${BRIEF}"`);
  console.log("===============================================================\n");

  const tGlobalStart = Date.now();

  // 1. GENERATE PRD STRUCTURE
  console.log("⏱️  [1/2] Generating PRD Blueprint & Arsitektur Android...");
  const tStructStart = Date.now();
  const struct = await generatePlanStructure(BRIEF, { mode: "auto" }, [], "free");
  const structSec = (Date.now() - tStructStart) / 1000;
  const structMin = Math.floor(structSec / 60);
  const structRemSec = (structSec % 60).toFixed(1);

  const planId = crypto.randomUUID();
  console.log(`\n✅ PRD BLUEPRINT SELESAI (${structMin}m ${structRemSec}s)`);
  console.log(`   - Plan ID : ${planId}`);
  console.log(`   - Judul   : "${struct.title}"`);
  console.log(`   - Fase    : ${struct.features.length} Fase`);
  console.log(`   - Stack   : ${struct.stack.join(", ")}`);

  // 2. GENERATE TASKS
  console.log("\n---------------------------------------------------------------");
  console.log(`🚀 [2/2] Generating Tasks untuk ${struct.features.length} fase...`);
  console.log("---------------------------------------------------------------");

  const tTasksStart = Date.now();
  const featuresList: Feature[] = [];
  const allTasks: Task[] = [];

  for (let i = 0; i < struct.features.length; i++) {
    const f = struct.features[i];
    const subTitles = f.subFeatures.map((sf) => sf.title);
    const tFaseStart = Date.now();

    const taskRes = await generateTasksForFeature(
      BRIEF,
      f.title,
      subTitles,
      i,
      "free",
      struct.features.length,
      []
    );

    const mappedTasks: Task[] = taskRes.tasks.map((t, tIdx) => {
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
        tasks: mappedTasks.filter(
          (t) => (t.sub_feature || "").toLowerCase().trim() === sf.title.toLowerCase().trim()
        ),
      })),
      tasks: mappedTasks,
    });

    const faseSec = (Date.now() - tFaseStart) / 1000;
    console.log(
      `  ✓ Fase ${String(i + 1).padStart(2, "0")}/${struct.features.length}: "${f.title}" -> ${mappedTasks.length} tasks (${faseSec.toFixed(1)}s)`
    );
  }

  const tasksSec = (Date.now() - tTasksStart) / 1000;
  const tasksMin = Math.floor(tasksSec / 60);
  const tasksRemSec = (tasksSec % 60).toFixed(1);

  // 3. SAVE PLAN TO DB
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

  console.log("\n💾 Menyimpan Plan ke Database untuk user: " + USER_EMAIL + "...");
  await savePlan(newPlan, USER_EMAIL);

  const totalSec = (Date.now() - tGlobalStart) / 1000;
  const totalMin = Math.floor(totalSec / 60);
  const totalRemSec = (totalSec % 60).toFixed(1);

  console.log("\n===============================================================");
  console.log("🎉 SIMULASI 1 (ANDROID) SELESAI & TERSIMPAN DI DATABASE!");
  console.log("===============================================================");
  console.log(`- User Account    : ${USER_EMAIL}`);
  console.log(`- Project Title   : "${struct.title}"`);
  console.log(`- Plan ID         : ${planId}`);
  console.log(`- Direct URL      : http://localhost:3000/plans/${planId}`);
  console.log(`- Waktu PRD       : ${structMin}m ${structRemSec}s (${structSec.toFixed(1)}s)`);
  console.log(`- Waktu Tasks     : ${tasksMin}m ${tasksRemSec}s (${tasksSec.toFixed(1)}s)`);
  console.log(`- Total Fase      : ${struct.features.length} Fase`);
  console.log(`- Total Tasks     : ${allTasks.length} Tasks`);
  console.log(`- ⏱️ TOTAL WAKTU  : ${totalMin}m ${totalRemSec}s (${totalSec.toFixed(1)}s)`);
  console.log("===============================================================");
}

main().catch((err) => {
  console.error("❌ ERROR SIMULASI ANDROID:", err);
  process.exit(1);
});
