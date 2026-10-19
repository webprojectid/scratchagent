import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { GenerationCheckpoint } from "./generation-checkpoint";
import type { QuotaReceipt } from "./quota";

export interface SavedGenerationWork {
  failure?: import("./generation-recovery").GenerationFailure;
  checkpoint: GenerationCheckpoint;
  receipt: QuotaReceipt;
}
const memory = new Map<string, SavedGenerationWork>();

export async function getGenerationWork(planId: string): Promise<SavedGenerationWork | null> {
  if (!process.env.DATABASE_URL) return structuredClone(memory.get(planId) ?? null);
  const result = await getDb().execute(sql`SELECT tech_prefs->'structureWork' AS work FROM plans WHERE id = ${planId}::uuid`);
  return (result.rows[0]?.work as SavedGenerationWork | undefined) ?? null;
}

// Call inside withGenerationLease, which locks this plan until commit.
export async function saveGenerationWork(planId: string, work: SavedGenerationWork): Promise<void> {
  if (!process.env.DATABASE_URL) { memory.set(planId, structuredClone(work)); return; }
  await getDb().execute(sql`UPDATE plans SET tech_prefs = jsonb_set(tech_prefs, '{structureWork}', ${JSON.stringify(work)}::jsonb) WHERE id = ${planId}::uuid`);
}

export async function clearGenerationWork(planId: string): Promise<void> {
  if (!process.env.DATABASE_URL) { memory.delete(planId); return; }
  await getDb().execute(sql`UPDATE plans SET tech_prefs = tech_prefs - 'structureWork' WHERE id = ${planId}::uuid`);
}
