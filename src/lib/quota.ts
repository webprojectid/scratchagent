import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { usageEvents } from "@/db/schema";
import {
  memoryAddUsage,
  memoryCountUsageSinceByTier,
  memoryRemoveUsage,
  memorySetUsagePlan,
} from "@/lib/memory-store";

export interface QuotaInfo {
  remaining: number;
  limit: number;
  resetAt: number;
  tier: "free" | "pro";
  /** Pro tidak dibatasi kuota; UI menampilkan teks berbeda saat true. */
  unlimited: boolean;
}

/** Tanda terima konsumsi kuota. `eventId` ada di DB mode dan memory mode. */
export interface QuotaReceipt {
  userId: string;
  eventId?: string;
  tier: "free" | "pro";
}

export interface TokenUsage {
  tokensIn: number;
  tokensOut: number;
  /** Model LLM yang melayani generate (hasil failover, dipisah koma). */
  models?: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const GENERATE_STAGE = "generate";

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

function quotaLimit(): number {
  return Number(process.env.QUOTA_GENERATE_DAILY ?? 3);
}

function freeInfo(limit: number, used: number, oldestMs: number | null): QuotaInfo {
  let resetAt = Date.now() + DAY_MS;
  if (oldestMs != null) resetAt = oldestMs + DAY_MS;
  return { remaining: Math.max(0, limit - used), limit, resetAt, tier: "free", unlimited: false };
}

/**
 * Cek kuota generate user dalam rolling 24 jam.
 * Pro: unlimited. Free: dihitung dari usage_events tier free 24 jam terakhir.
 * Opts.unlimited (admin): laporan unlimited tanpa mengubah tier.
 */
export async function getQuota(
  userId: string,
  tier: "free" | "pro" = "free",
  opts: { unlimited?: boolean } = {},
): Promise<QuotaInfo> {
  if (tier === "pro" || opts.unlimited) {
    return { remaining: Infinity, limit: quotaLimit(), resetAt: Date.now() + DAY_MS, tier, unlimited: true };
  }
  const limit = quotaLimit();

  if (isMemoryMode()) {
    const sinceIso = new Date(Date.now() - DAY_MS).toISOString();
    const used = memoryCountUsageSinceByTier(userId, GENERATE_STAGE, "free", sinceIso);
    return freeInfo(limit, used, null);
  }

  const db = getDb();
  const since = new Date(Date.now() - DAY_MS);
  const rows = await db
    .select({ createdAt: usageEvents.createdAt })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.stage, GENERATE_STAGE),
        eq(usageEvents.tier, "free"),
        gte(usageEvents.createdAt, since),
      ),
    );
  const oldest = rows.length > 0 ? Math.min(...rows.map((r) => r.createdAt.getTime())) : null;
  return freeInfo(limit, rows.length, oldest);
}

/**
 * Konsumsi kuota secara atomik.
 * - Opts.skipLimit (admin): batas harian dilewati, pemakaian tetap dicatat
 *   dengan tier asli untuk audit.
 * - Pro: tanpa limit, tetap dicatat sebagai usage_events tier pro (untuk audit admin).
 * - Free DB mode: dalam satu transaksi, cek event tier free 24 jam terakhir < limit,
 *   lalu INSERT baris usage_events (stage=generate, planId masih null).
 * - Free memory mode: hitung dari usageStore rolling 24 jam.
 * Return null kalau kuota free habis.
 */
export async function consumeQuota(
  userId: string,
  tier: "free" | "pro" = "free",
  opts: { skipLimit?: boolean } = {},
): Promise<QuotaReceipt | null> {
  if (tier === "pro" || opts.skipLimit) {
    if (isMemoryMode()) {
      const ev = memoryAddUsage(userId, GENERATE_STAGE, tier);
      return { userId, eventId: ev.id, tier };
    }
    const db = getDb();
    const inserted = await db
      .insert(usageEvents)
      .values({ userId, stage: GENERATE_STAGE, tier } as never)
      .returning();
    return { userId, eventId: inserted[0]?.id ?? undefined, tier };
  }

  if (isMemoryMode()) {
    const sinceIso = new Date(Date.now() - DAY_MS).toISOString();
    const used = memoryCountUsageSinceByTier(userId, GENERATE_STAGE, "free", sinceIso);
    if (used >= quotaLimit()) return null;
    const ev = memoryAddUsage(userId, GENERATE_STAGE, "free");
    return { userId, eventId: ev.id, tier };
  }

  const limit = quotaLimit();
  const db = getDb();
  const since = new Date(Date.now() - DAY_MS);
  let eventId: string | null = null;
  await db.transaction(async (tx) => {
    const usedRows = await tx
      .select({ id: usageEvents.id })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.userId, userId),
          eq(usageEvents.stage, GENERATE_STAGE),
          eq(usageEvents.tier, "free"),
          gte(usageEvents.createdAt, since),
        ),
      );
    if (usedRows.length >= limit) return;
    const inserted = await tx
      .insert(usageEvents)
      .values({ userId, stage: GENERATE_STAGE, tier: "free" } as never)
      .returning();
    eventId = inserted[0]?.id ?? null;
  });
  return eventId ? { userId, eventId, tier } : null;
}

/**
 * Refund kuota karena generate gagal.
 * - DB mode: hapus baris usage_events yang tadi dibuat (berdasar eventId).
 * - Memory mode: hapus event dari usageStore.
 */
export async function refundQuota(receipt: QuotaReceipt): Promise<void> {
  if (!receipt.eventId) return;
  if (isMemoryMode()) {
    memoryRemoveUsage(receipt.eventId);
    return;
  }
  const db = getDb();
  await db.delete(usageEvents).where(eq(usageEvents.id, receipt.eventId));
}

/**
 * Tandai konsumsi kuota sukses: ikat ke plan + catat pemakaian token LLM.
 * Dipanggil setelah savePlan berhasil (planId kini valid untuk FK).
 */
export async function finalizeQuota(receipt: QuotaReceipt, planId: string, usage: TokenUsage): Promise<void> {
  if (!receipt.eventId) return;
  if (isMemoryMode()) {
    memorySetUsagePlan(receipt.eventId, planId);
    return;
  }
  const db = getDb();
  await db
    .update(usageEvents)
    .set({
      planId,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      model: usage.models?.length ? usage.models.join(", ") : null,
    } as never)
    .where(eq(usageEvents.id, receipt.eventId));
}

/**
 * Catat pemakaian sukses tanpa receipt (jalur retry watchdog: kuota percobaan
 * pertama sudah di-refund, tapi pemakaian yang berhasil tetap harus tercatat).
 */
export async function recordUsage(userId: string, tier: "free" | "pro", planId: string, usage: TokenUsage): Promise<void> {
  if (isMemoryMode()) return;
  const db = getDb();
  await db.insert(usageEvents).values({
    userId,
    planId,
    stage: GENERATE_STAGE,
    tier,
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    model: usage.models?.length ? usage.models.join(", ") : null,
  } as never);
}
