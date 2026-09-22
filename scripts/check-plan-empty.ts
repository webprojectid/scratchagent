process.env.DATABASE_URL = 'postgresql://postgres.loqbxknhnwukhikcpgab:***@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

import { eq } from "drizzle-orm";
import { plans, features, subFeatures, tasks } from "../src/db/schema";
import { getDb } from "../src/db";

async function diagnosePlan(planId: string) {
  const db = getDb();
  
  console.log("🔍 Diagnosing plan:", planId);
  console.log("=" .repeat(80));
  
  // Check plan exists
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, planId),
  });
  
  if (!plan) {
    console.log("❌ Plan tidak ditemukan:", planId);
    return;
  }
  
  console.log("\n✅ PLAN FOUND:");
  console.log("   ID:", plan.id);
  console.log("   Title:", plan.title);
  console.log("   Status:", plan.status);
  console.log("   User ID:", plan.userId);
  console.log("   Created:", plan.createdAt);
  
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
  
  console.log(`\n📋 TOTAL FITUR: ${featureQuery.length}`);
  const problematic: any[] = [];
  
  for (const f of featureQuery) {
    const phaseNum = f.order;
    console.log(`\n🎯 FASE ${phaseNum}: "${f.title}"`);
    console.log(`   Sub-fitur count: ${f.subFeatures.length}`);
    
    if (f.subFeatures.length === 0) {
      console.log("   ⚠️⚠️⚠️ FASE KOSONG - TIDAK ADA SUB-FITUR!");
      problematic.push({ feature: f, reason: "No sub-features" });
      continue;
    }
    
    let taskCount = 0;
    for (const sf of f.subFeatures) {
      const tCount = sf.tasks ? sf.tasks.length : 0;
      taskCount += tCount;
      
      if (tCount === 0) {
        console.log(`   ⚠️ Sub-feature kosong: "${sf.title}"`);
      } else {
        console.log(`   ✓ ${sf.title} (${tCount} tasks)`);
      }
    }
    
    console.log(`   Total tasks: ${taskCount}`);
  }
  
  console.log("\n" + "=" .repeat(80));
  console.log("📊 SUMMARY:");
  console.log(`Total fitur: ${featureQuery.length}`);
  console.log(`Fase tanpa sub-feature: ${problematic.length}`);
  console.log("=" .repeat(80));
  
  if (problematic.length > 0) {
    console.log("\n❌ MASALAH DITEMUKAN:");
    problematic.forEach(p => {
      console.log(`   └─ Fase ${p.feature.order}: "${p.feature.title}"`);
    });
    
    console.log("\n💡 SOLUSI:");
    console.log("   1. Regenerate fitur ini via dashboard UI");
    console.log("   2. Atau tambahkan manual ide di kolom chat untuk fase tersebut");
    console.log("   3. Fix validator generate.ts untuk reject empty sub_features");
  } else {
    console.log("\n✅ SEMUA OK! Tidak ada fase kosong.");
  }
}

// Run it with the correct plan ID
if (process.argv[2]) {
  diagnosePlan(process.argv[2]);
} else {
  console.error("Usage: npx tsx scripts/check-plan-empty.ts <PLAN_ID>");
  console.error("Example: npx tsx scripts/check-plan-empty.ts 5c4f8d2e-3b1a-4f9c-a7e6-9d8c7b6e5f4a");
}
