process.env.DATABASE_URL = 'postgresql://postgres.loqbxknhnwukhikcpgab:<PASSWORD>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
// Update PASSWORD di atas dengan password asli dari .env file kamu

import { eq } from "drizzle-orm";
import { plans, features, subFeatures, tasks } from "../src/db/schema";
import { getDb } from "../src/db";

async function regenerateEmptyFases(planId: string) {
  const db = getDb();
  
  console.log("🔧 Regenerating empty phases for plan:", planId);
  console.log("=" .repeat(80));
  
  // Get all features
  const featureQuery = await db.query.features.findMany({
    where: eq(features.planId, planId),
    with: {
      subFeatures: true,
    },
  });
  
  const toRegenerate: any[] = [];
  
  for (const f of featureQuery) {
    if (f.subFeatures.length === 0) {
      console.log(`\n⚠️ Fase ${f.order} kosong: "${f.title}"`);
      toRegenerate.push(f);
    } else {
      console.log(`✓ Fase ${f.order}: "${f.title}" (${f.subFeatures.length} sub-fitur)`);
    }
  }
  
  if (toRegenerate.length === 0) {
    console.log("\n✅ Tidak ada fase kosong!");
    return;
  }
  
  console.log("\n📝 Yang akan diregenerate:");
  toRegenerate.forEach(f => console.log(`   - Fase ${f.order}: "${f.title}"`));
  console.log("\n💡 NOTE: Fitur ini butuh prompt LLM untuk generate.");
  console.log("Untuk regenerasi, kamu bisa:");
  console.log("1. Buka dashboard → edit phase → tambahkan ide");
  console.log("2. Atau kirim request ke API: POST /api/plans/[id]/ideas");
  console.log("3. Atau aku buatkan script trigger automate");
}

if (process.argv[2]) {
  regenerateEmptyFases(process.argv[2]);
} else {
  console.error("Usage: npx tsx scripts/diagnose-plan.ts <PLAN_ID>");
  console.error("Example: npx tsx scripts/diagnose-plan.ts c59895cd-b592-4f3c-89f5-6a2a6a30fe71");
}
