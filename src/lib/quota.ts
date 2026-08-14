import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { usageEvents } from "@/db/schema";

export interface QuotaInfo {
  remaining: number;
  limit: number;
  resetAt: number;
}

/** Tanda terima konsumsi kuota. `eventId` hanya ada di DB mode. */
export interface QuotaReceipt {
  userId: string;
  eventId?: string;
}

export interface TokenUsage {
  tokensIn: number;
  tokensOut: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const GENERATE_STAGE = "generate";

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

function quotaLimit(): number {
  return Number(process.env.QUOTA_GENERATE_DAILY ?? 3);
}

// ---- Fallback in-memory (dev tanpa DATABASE_URL). Reset saat restart, sesuai tujuan dev. ----
const counts = new Map<string, { count: number; resetAt: number }>();

function memoryGetQuota(userId: string): QuotaInfo {
  const limit = quotaLimit();
  const now = Date.now();
  const record = counts.get(userId);
  if (!record || record.resetAt < now) {
    counts.set(userId, { count: 0, resetAt: now + DAY_MS });
    return { remaining: limit, limit, resetAt: now + DAY_MS };
  }
  return { remaining: Math.max(0, limit - record.count), limit, resetAt: record.resetAt };
}

function memoryConsume(userId: string): boolean {
  const { remaining } = memoryGetQuota(userId);
  if (remaining <= 0) return false;
  const record = counts.get(userId)!;
  record.count++;
  return true;
}

function memoryRefund(userId: string): void {
  const record = counts.get(userId);
  if (record && record.count > 0) record.count--;
}

/** Jumlah event generate user dalam 24 jam terakhir (DB mode). */
async function countRecentGenerate(userId: string): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - DAY_MS);
  const rows = await db
    .select({ id: usageEvents.id })
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, userId), eq(usageEvents.stage, GENERATE_STAGE), gte(usageEvents.createdAt, since)));
  return rows.length;
}

export async function getQuota(userId: string): Promise<QuotaInfo> {
  if (isMemoryMode()) return memoryGetQuota(userId);

  const limit = quotaLimit();
  const used = await countRecentGenerate(userId);
  const db = getDb();
  const since = new Date(Date.now() - DAY_MS);
  const rows = await db
    .select({ createdAt: usageEvents.createdAt })
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, userId), eq(usageEvents.stage, GENERATE_STAGE), gte(usageEvents.createdAt, since)));

  let resetAt = Date.now() + DAY_MS;
  if (rows.length > 0) {
    const oldest = Math.min(...rows.map((r) => r.createdAt.getTime()));
    resetAt = oldest + DAY_MS;
  }
  return { remaining: Math.max(0, limit - used), limit, resetAt };
}

/**
 * Konsumsi kuota secara atomik.
 * - DB mode: dalam satu transaksi, cek jumlah event 24 jam terakhir < limit,
 *   lalu INSERT baris usage_events (stage=generate, planId masih null).
 *   Return receipt berisi eventId; null kalau kuota habis.
 * - Memory mode: counter in-memory.
 */
export async function consumeQuota(userId: string): Promise<QuotaReceipt | null> {
  if (isMemoryMode()) {
    return memoryConsume(userId) ? { userId } : null;
  }

  const limit = quotaLimit();
  const db = getDb();
  const since = new Date(Date.now() - DAY_MS);
  let eventId: string | null = null;
  await db.transaction(async (tx) => {
    const usedRows = await tx
      .select({ id: usageEvents.id })
      .from(usageEvents)
      .where(and(eq(usageEvents.userId, userId), eq(usageEvents.stage, GENERATE_STAGE), gte(usageEvents.createdAt, since)));
    if (usedRows.length >= limit) return;
    const inserted = await tx
      .insert(usageEvents)
      .values({ userId, stage: GENERATE_STAGE } as never)
      .returning();
    eventId = inserted[0]?.id ?? null;
  });
  return eventId ? { userId, eventId } : null;
}

/**
 * Refund kuota karena generate gagal.
 * - DB mode: hapus baris usage_events yang tadi dibuat (berdasar eventId).
 * - Memory mode: kurangi counter.
 */
export async function refundQuota(receipt: QuotaReceipt): Promise<void> {
  if (isMemoryMode()) {
    memoryRefund(receipt.userId);
    return;
  }
  if (!receipt.eventId) return;
  const db = getDb();
  await db.delete(usageEvents).where(eq(usageEvents.id, receipt.eventId));
}

/**
 * Tandai konsumsi kuota sukses: ikat ke plan + catat pemakaian token LLM.
 * Dipanggil setelah savePlan berhasil (planId kini valid untuk FK).
 */
export async function finalizeQuota(receipt: QuotaReceipt, planId: string, usage: TokenUsage): Promise<void> {
  if (isMemoryMode()) return;
  if (!receipt.eventId) return;
  const db = getDb();
  await db
    .update(usageEvents)
    .set({ planId, tokensIn: usage.tokensIn, tokensOut: usage.tokensOut } as never)
    .where(eq(usageEvents.id, receipt.eventId));
}
