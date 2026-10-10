import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { plans } from "@/db/schema";
import { memoryUpdatePlanNotes } from "@/lib/memory-store";

export async function updatePlanNotes(planId: string, notes: string, updatedAt: string) {
  if (!process.env.DATABASE_URL) return memoryUpdatePlanNotes(planId, notes, updatedAt);
  const rows = await getDb().update(plans).set({
    techPrefs: sql`(CASE WHEN jsonb_typeof(${plans.techPrefs}) = 'object' THEN ${plans.techPrefs} ELSE jsonb_build_object('stack', ${plans.techPrefs}) END) || ${JSON.stringify({ accountNotes: notes, accountNotesUpdatedAt: updatedAt })}::jsonb`,
  }).where(eq(plans.id, planId)).returning({ id: plans.id });
  return rows.length === 1;
}
