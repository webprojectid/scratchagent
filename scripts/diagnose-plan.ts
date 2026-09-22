import { eq } from "drizzle-orm";
import { plans, features, subFeatures, tasks } from "../src/db/schema";
import { getDb } from "../src/db";

async function diagnosePlan(planId: string) {
  const db = getDb();
  
  // Check plan exists
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, planId),
  });
  
  if (!plan) {
    console.log("❌ Plan tidak ditemukan:", planId);
    return;
  }
  
  console.log("✅ Plan ditemukan:", plan.id);
  console.log("   Title:", plan.title);
  console.log("   Status:", plan.status);
  console.log("   User ID:", plan.userId);
  
  // Get all features with sub-features and tasks
  const featureQuery = await db.query.features.findMany({
    where: eq(features.planId, planId),
    with: {
      subFeatures: {
        with: {
          tasks: true,
        },
      },
    },
  });
  
  console.log("\n📋 Fitur & Sub-Feature:");
  const problematic: any[] = [];
  
  for (const f of featureQuery) {
    console.log(`\n  Fase ${f.order}: "${f.title}"`);
    console.log(`     Sub-fitur: ${f.subFeatures.length}`);
    
    if (f.subFeatures.length === 0) {
      console.log("     ⚠️ FASE KOSONG - TIDAK ADA SUB-FITUR!");
      problematic.push({ feature: f, reason: "No sub-features" });
    } else {
      for (const sf of f.subFeatures) {
        const taskCount = sf.tasks ? sf.tasks.length : 0;
        console.log(`     → ${sf.title} (${taskCount} tasks)`);
        
        // Check for empty tasks too
        if (taskCount === 0) {
          console.log("       ⚠️ SUB-FITUR TIDAK ADA TASKS!");
        }
      }
    }
  }
  
  console.log("\n🔍 Summary:");
  console.log(`Total fitur: ${featureQuery.length}`);
  console.log(`Fase kosong: ${problematic.length}`);
  
  if (problematic.length > 0) {
    console.log("\n❌ MASALAH DITEMUKAN DI FASE-FASE:");
    problematic.forEach(p => {
      console.log(`   - Fase ${p.feature.order}: "${p.feature.title}"`);
    });
    
    console.log("\n💡 REKOMENDASI:");
    console.log("1. Regenerate fitur ini via dashboard atau API");
    console.log("2. Atau tambahkan ide manual untuk fase tersebut");
    console.log("3. Perbaiki validator agar reject fitur tanpa sub-feature");
  } else {
    console.log("\n✅ Semua fase OK - tidak ada masalah!");
  }
}

// Run it
diagnosePlan("c59895cd-b592-4f3c-89f5-6a2a6a30fe71").catch(console.error);
