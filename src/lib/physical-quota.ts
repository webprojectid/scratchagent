import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { usageEvents } from "@/db/schema";
import { memoryAddUsage, memoryListUsage } from "./memory-store";
import type { QuotaReceipt } from "./quota";
import { MAX_PLAN } from "./max-plan";

export const PHYSICAL_GENERATION_STAGE = "generate_physical";
const windowMs = MAX_PLAN.hardwareWindowDays * 24 * 60 * 60 * 1000;
export async function getPhysicalQuota(userId: string, now = Date.now()) {
  const since = new Date(now - windowMs);
  const rows = !process.env.DATABASE_URL
    ? memoryListUsage(userId).filter(row => row.stage === PHYSICAL_GENERATION_STAGE && row.tier === "max" && new Date(row.createdAt).getTime() >= since.getTime()).map(row => ({createdAt:new Date(row.createdAt)}))
    : await getDb().select({createdAt:usageEvents.createdAt}).from(usageEvents).where(and(eq(usageEvents.userId,userId),eq(usageEvents.stage,PHYSICAL_GENERATION_STAGE),eq(usageEvents.tier,"max"),gte(usageEvents.createdAt,since)));
  const oldest = rows.length ? Math.min(...rows.map(row => row.createdAt.getTime())) : now;
  return { tier:"max" as const, limit:MAX_PLAN.hardwarePlans, remaining:Math.max(0,MAX_PLAN.hardwarePlans-rows.length), windowDays:MAX_PLAN.hardwareWindowDays, resetAt:oldest+windowMs, unlimited:false };
}

export async function consumePhysicalQuota(userId: string): Promise<QuotaReceipt | null> {
  if (!process.env.DATABASE_URL) {
    if ((await getPhysicalQuota(userId)).remaining === 0) return null;
    // Recheck synchronously: concurrent async callers may all have read the same allowance.
    const since = Date.now()-windowMs;
    if (memoryListUsage(userId).filter(row => row.stage === PHYSICAL_GENERATION_STAGE && row.tier === "max" && new Date(row.createdAt).getTime() >= since).length >= MAX_PLAN.hardwarePlans) return null;
    const event = memoryAddUsage(userId,PHYSICAL_GENERATION_STAGE,"max");
    return {userId,eventId:event.id,tier:"max"};
  }
  let eventId: string | undefined;
  await getDb().transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`physical-quota:${userId}`}, 0))`);
    const used = await tx.select({id:usageEvents.id}).from(usageEvents).where(and(eq(usageEvents.userId,userId),eq(usageEvents.stage,PHYSICAL_GENERATION_STAGE),eq(usageEvents.tier,"max"),gte(usageEvents.createdAt,new Date(Date.now()-windowMs))));
    if (used.length >= MAX_PLAN.hardwarePlans) return;
    const [event] = await tx.insert(usageEvents).values({userId,stage:PHYSICAL_GENERATION_STAGE,tier:"max"}).returning({id:usageEvents.id});
    eventId=event?.id;
  });
  return eventId ? {userId,eventId,tier:"max"} : null;
}
