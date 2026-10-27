import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { plans } from "@/db/schema";
import { memoryGetPlan } from "./memory-store";
import { demoPlan } from "./demo";
import type { Plan } from "./types";

export type ProgressRevision = Plan & { progressVersion: string; featureCount: number };

export function progressVersion(plan: Plan): string {
  return createHash("sha256").update(JSON.stringify({ title: plan.title, status: plan.status, features: plan.features })).digest("hex");
}

// Hashes are computed inside Postgres: unchanged polls return no PRD or task text.
export async function getProgressRevision(planId: string): Promise<ProgressRevision | undefined> {
  if (!process.env.DATABASE_URL || planId === "demo") {
    const plan = planId === "demo" ? { ...demoPlan, userId: "demo" } : memoryGetPlan(planId);
    return plan ? { ...plan, featureCount: plan.features.length, progressVersion: progressVersion(plan) } : undefined;
  }
  const outerPlanId = sql`"plans"."id"`;
  const [row] = await getDb().select({
    id: plans.id, userId: plans.userId, title: plans.title, status: plans.status, createdAt: plans.createdAt,
    physical: sql<Plan["physical"]>`${plans.techPrefs}->'physical'`,
    featureCount: sql<number>`(select count(*)::int from features f where f.plan_id = ${outerPlanId})`,
    version: sql<string>`md5(concat_ws('|', ${plans.title}, ${plans.status},
      (select string_agg(md5(row_to_json(f)::text), '' order by f.id) from features f where f.plan_id = ${outerPlanId}),
      (select string_agg(md5(row_to_json(s)::text), '' order by s.id) from sub_features s join features f on f.id = s.feature_id where f.plan_id = ${outerPlanId}),
      (select string_agg(md5(row_to_json(t)::text), '' order by t.id) from tasks t where t.plan_id = ${outerPlanId})))`,
  }).from(plans).where(eq(plans.id, planId));
  return row ? { id: row.id, userId: row.userId ?? undefined, title: row.title, status: row.status,
    createdAt: row.createdAt.toISOString(), physical: row.physical ?? undefined, brief: "", stack: [], asumsi: [], features: [],
    featureCount: row.featureCount, progressVersion: row.version } : undefined;
}
