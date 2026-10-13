import { randomUUID } from "node:crypto";
import { sql, and, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { usageEvents } from "@/db/schema";
import { withPlanMutation } from "./plan-mutation";

const memory = new Map<string, { token: string; expires: number; attempts: number }>();
const budgets = new Map<string, number[]>();
// Ten allowed initial requests can each generate fifteen Pro phases (160
// attempts including structures); keep room for retries within that window.
const GENERATION_ATTEMPT_LIMIT = 200;
export async function claimGeneration(planId: string, stage: string, maxAttempts = 2147483647): Promise<string | null> {
  const token = randomUUID();
  const expires = Date.now() + 360_000;
  if (!process.env.DATABASE_URL) {
    return withPlanMutation(planId, async () => {
      const key = `${planId}:${stage}`;
      const old = memory.get(key);
      if ((old && old.expires > Date.now()) || (old?.attempts ?? 0) >= maxAttempts) return null;
      memory.set(key, { token, expires, attempts: (old?.attempts ?? 0) + 1 });
      return token;
    });
  }
  const result = await getDb().execute(sql`UPDATE plans SET tech_prefs = tech_prefs || jsonb_build_object('generationLeases', coalesce(tech_prefs->'generationLeases', '{}'::jsonb) || jsonb_build_object(${stage}::text, jsonb_build_object('token', ${token}::text, 'expires', ${expires}::bigint, 'attempts', coalesce((tech_prefs->'generationLeases'->${stage}::text->>'attempts')::int, 0) + 1))) WHERE id = ${planId}::uuid AND coalesce((tech_prefs->'generationLeases'->${stage}::text->>'expires')::bigint, 0) <= ${Date.now()}::bigint AND coalesce((tech_prefs->'generationLeases'->${stage}::text->>'attempts')::int, 0) < ${maxAttempts} RETURNING id`);
  return result.rows.length ? token : null;
}
export async function releaseGeneration(planId: string, stage: string, token: string): Promise<void> {
  if (!process.env.DATABASE_URL) {
    const current = memory.get(`${planId}:${stage}`);
    if (current?.token === token) current.expires = 0;
    return;
  }
  await getDb().execute(sql`UPDATE plans SET tech_prefs = jsonb_set(tech_prefs, ARRAY['generationLeases', ${stage}::text, 'expires'], '0'::jsonb) WHERE id = ${planId}::uuid AND tech_prefs->'generationLeases'->${stage}::text->>'token' = ${token}`);
}
export async function reserveGenerationAttempt(userId: string, tier: "free" | "pro"): Promise<boolean> {
  const since = Date.now() - 600_000;
  if (!process.env.DATABASE_URL) {
    const recent = (budgets.get(userId) ?? []).filter(time => time >= since);
    if (recent.length >= GENERATION_ATTEMPT_LIMIT) return false;
    budgets.set(userId, [...recent, Date.now()]);
    return true;
  }
  return getDb().transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`generation-budget:${userId}`}, 0))`);
    const recent = await tx.select({ id: usageEvents.id }).from(usageEvents).where(and(eq(usageEvents.userId, userId), eq(usageEvents.stage, "generation-attempt"), gte(usageEvents.createdAt, new Date(since))));
    if (recent.length >= GENERATION_ATTEMPT_LIMIT) return false;
    await tx.insert(usageEvents).values({ userId, stage: "generation-attempt", tier });
    return true;
  });
}

export async function ownsGeneration(planId: string, stage: string, token: string, lock = false): Promise<boolean> {
  if (!process.env.DATABASE_URL) { const current = memory.get(`${planId}:${stage}`); return current?.token === token && current.expires > Date.now(); }
  const result = await getDb().execute(sql`SELECT id FROM plans WHERE id = ${planId}::uuid AND tech_prefs->'generationLeases'->${stage}::text->>'token' = ${token} AND (tech_prefs->'generationLeases'->${stage}::text->>'expires')::bigint > ${Date.now()}::bigint ${lock ? sql`FOR UPDATE` : sql``}`);
  return result.rows.length > 0;
}

// Hold the plan row until persistence commits, so a replacement worker cannot
// claim the lease between the ownership check and the write.
export async function withGenerationLease<T>(planId: string, stage: string, token: string, operation: () => Promise<T>): Promise<T | null> {
  return withPlanMutation(planId, async () => {
    if (!await ownsGeneration(planId, stage, token, true)) return null;
    return operation();
  });
}
