import "dotenv/config";
import { getPlan } from "../src/lib/storage";

async function main() {
  const planId = "9ade6972-7792-43d7-beac-2f4a53fda9fd";
  const p = await getPlan(planId);
  if (!p) {
    console.log("Plan not found:", planId);
    return;
  }
  console.log("Title:", p.title);
  console.log("Status:", p.status);
  console.log("Tier:", p.tier);
  console.log("Features total:", p.features?.length);
  p.features?.forEach((f, idx) => {
    const subCount = f.sub_features?.length ?? 0;
    const taskCount = f.sub_features?.reduce((acc, s) => acc + (s.tasks?.length ?? 0), 0) ?? 0;
    console.log(`[Fase ${idx + 1}] "${f.title}" -> sub: ${subCount}, tasks: ${taskCount}`);
    if (idx === 14) {
      console.log("Fase 15 raw detail:", JSON.stringify(f, null, 2));
    }
  });
}

main().catch(console.error);
