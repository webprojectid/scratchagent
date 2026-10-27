import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { physicalLayer, type HardwareTask } from "./physical-domain";
import type { Feature, Plan } from "./types";

export async function physicalStorageReady(): Promise<boolean> {
  if (process.env.PHYSICAL_PROJECTS_ENABLED !== "1") return false;
  if (!process.env.DATABASE_URL) return true;
  const rows = await getDb().execute(sql`select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'tasks' and column_name = 'layer'`);
  const membership = await getDb().execute(sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'tier'`);
  return rows.rows[0]?.is_nullable === "YES" && membership.rows.length === 1;
}
export function physicalMetadata(plan: Plan) {
  return plan.physical ? { physical: plan.physical, hardwareTasks: Object.fromEntries(plan.features.flatMap(f => f.subFeatures.flatMap(s => s.tasks.filter(t => t.hardware).map(t => [t.ref, t.hardware])))) } : {};
}
export function hydratePhysical(features: Feature[], meta: { physical?: Plan["physical"]; hardwareTasks?: Record<string, HardwareTask> }): void {
  if (!meta.physical) return;
  for (const task of features.flatMap(f => f.subFeatures.flatMap(s => s.tasks))) {
    const hardware = meta.hardwareTasks?.[task.ref];
    if (!hardware || !physicalLayer(hardware.discipline)) throw new Error("Physical task metadata is incomplete.");
    task.hardware = hardware; task.layer = hardware.discipline;
  }
}
