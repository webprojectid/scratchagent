import { and, eq, gte, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { users, usageEvents, subscriptions, plans } from "@/db/schema";
import {
  memoryAddSubscription,
  memoryCountUsageByTier,
  memoryCountUsageSinceByTier,
  memoryEndSubscription,
  memoryExpireSubscription,
  memoryGetUserById,
  memoryListSubscriptions,
  memoryListUsers,
  memorySetUserBanned,
  memorySetUserTier,
} from "@/lib/memory-store";

const DAY_MS = 24 * 60 * 60 * 1000;
const GENERATE_STAGE = "generate";

export type Tier = "free" | "pro";

/**
 * Pilihan durasi Pro yang bisa diberikan admin.
 * 1 bulan dihitung 31 hari, 3 bulan = 93 hari, sesuai kesepakatan.
 */
export const PRO_DURATIONS = [
  { days: 7, label: "7 hari" },
  { days: 14, label: "14 hari" },
  { days: 28, label: "28 hari" },
  { days: 31, label: "1 bulan (31 hari)" },
  { days: 93, label: "3 bulan (93 hari)" },
] as const;

export function durationLabel(days: number | null): string {
  if (days == null) return "tanpa batas";
  return PRO_DURATIONS.find((d) => d.days === days)?.label ?? `${days} hari`;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  expiresAt: Date | null;
  grantedBy: string | null;
  endedBy: string | null;
  days: number | null;
}

export interface AccountDetail {
  id: string;
  email: string;
  name: string | null;
  tier: Tier;
  bannedAt: Date | null;
  createdAt: Date;
  firstProAt: Date | null;
  lastProEnd: Date | null;
  proActive: boolean;
  proExpiresAt: Date | null;
  proGenerateCount: number;
  freeGenerate24h: number;
  freeLimit: number;
  planCount: number;
  subscriptions: SubscriptionRecord[];
}

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

function freeLimit(): number {
  return Number(process.env.QUOTA_GENERATE_DAILY ?? 3);
}

function toDate(v: Date | string | null): Date | null {
  if (v == null) return null;
  return v instanceof Date ? v : new Date(v);
}

function normalizeSub(row: {
  id: string;
  userId: string;
  startedAt: Date | string;
  endedAt: Date | string | null;
  expiresAt?: Date | string | null;
  grantedBy: string | null;
  endedBy: string | null;
}): SubscriptionRecord {
  const startedAt = toDate(row.startedAt as string)!;
  const expiresAt = toDate((row.expiresAt as string | null) ?? null);
  return {
    id: row.id,
    userId: row.userId,
    startedAt,
    endedAt: toDate(row.endedAt as string | null),
    expiresAt,
    grantedBy: row.grantedBy,
    endedBy: row.endedBy,
    days: expiresAt ? Math.round((expiresAt.getTime() - startedAt.getTime()) / DAY_MS) : null,
  };
}

/** Email admin: gabungan env ADMIN_EMAILS + daftar bawaan (teguhends@gmail.com). */
export function adminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(["teguhends@gmail.com", ...fromEnv]));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (lower.startsWith("admin@") || lower === "admin") return true;
  return adminEmails().includes(lower);
}

/** Langganan Pro yang benar-benar aktif: belum ditutup dan belum lewat masa berlakunya. */
export function isSubActive(sub: SubscriptionRecord, now: Date = new Date()): boolean {
  if (sub.endedAt) return false;
  if (sub.expiresAt && sub.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

function activeSub(subs: SubscriptionRecord[], now: Date = new Date()): SubscriptionRecord | null {
  return subs.find((s) => isSubActive(s, now)) ?? null;
}

/**
 * Sinkronisasi status langganan yang sudah lewat masa berlakunya:
 * tutup periode (endedAt = expiresAt) dan turunkan tier ke free.
 * Dipanggil sebelum setiap pembacaan status akun supaya konsisten.
 */
export async function syncExpiredPro(userId: string, now: Date = new Date()): Promise<void> {
  if (isMemoryMode()) {
    const sub = memoryExpireSubscription(userId, "sistem: masa berlaku habis", now);
    if (sub) memorySetUserTier(userId, "free");
    return;
  }
  const db = getDb();
  const expired = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        sql`${subscriptions.endedAt} is null`,
        sql`${subscriptions.expiresAt} is not null`,
        sql`${subscriptions.expiresAt} <= ${now}`,
      ),
    );
  if (expired.length === 0) return;
  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({ endedAt: sql`${subscriptions.expiresAt}`, endedBy: "sistem: masa berlaku habis" } as never)
      .where(
        and(
          eq(subscriptions.userId, userId),
          sql`${subscriptions.endedAt} is null`,
          sql`${subscriptions.expiresAt} is not null`,
          sql`${subscriptions.expiresAt} <= ${now}`,
        ),
      );
    await tx.update(users).set({ tier: "free" } as never).where(eq(users.id, userId));
  });
}

/**
 * Ambil tier efektif + status banned user.
 * Tier efektif dihitung dari langganan yang masih aktif (bukan sekadar kolom users.tier),
 * sehingga Pro yang lewat masa berlakunya otomatis dianggap free.
 */
export async function getAccountState(userId: string): Promise<{ tier: Tier; bannedAt: Date | null } | null> {
  await syncExpiredPro(userId);
  if (isMemoryMode()) {
    const u = memoryGetUserById(userId);
    if (!u) return null;
    const subs = memoryListSubscriptions(userId).map(normalizeSub);
    const tier: Tier = activeSub(subs) ? "pro" : "free";
    return { tier, bannedAt: toDate(u.bannedAt) };
  }
  const db = getDb();
  const rows = await db.select({ bannedAt: users.bannedAt }).from(users).where(eq(users.id, userId));
  const row = rows[0];
  if (!row) return null;
  const subs = await getSubscriptions(userId);
  const tier: Tier = activeSub(subs) ? "pro" : "free";
  return { tier, bannedAt: row.bannedAt };
}

/** Riwayat langganan Pro satu user, terbaru dulu. */
export async function getSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
  if (isMemoryMode()) {
    return memoryListSubscriptions(userId)
      .map(normalizeSub)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(sql`${subscriptions.startedAt} desc`);
  return rows.map(normalizeSub);
}

/**
 * Aktifkan Pro untuk user dengan masa berlaku `days` hari.
 * 1 bulan = 31 hari, 3 bulan = 93 hari. Kalau sudah ada Pro aktif, ditolak.
 */
export async function grantPro(userId: string, grantedBy: string, days: number): Promise<{ ok: boolean; message: string }> {
  const valid = PRO_DURATIONS.some((d) => d.days === days);
  if (!valid) return { ok: false, message: "Durasi tidak valid. Pilih 7, 14, 28, 31, atau 93 hari." };

  await syncExpiredPro(userId);
  const expiresAt = new Date(Date.now() + days * DAY_MS);

  if (isMemoryMode()) {
    const u = memoryGetUserById(userId);
    if (!u) return { ok: false, message: "User tidak ditemukan" };
    const active = memoryListSubscriptions(userId).map(normalizeSub).find((s) => isSubActive(s));
    if (active) return { ok: false, message: "User sudah berlangganan Pro" };
    memorySetUserTier(userId, "pro");
    memoryAddSubscription(userId, grantedBy, expiresAt.toISOString());
    return { ok: true, message: `Akses Pro aktif selama ${durationLabel(days)}` };
  }

  const db = getDb();
  const userRows = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!userRows[0]) return { ok: false, message: "User tidak ditemukan" };
  const activeRows = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), sql`${subscriptions.endedAt} is null`));
  if (activeRows.length > 0) return { ok: false, message: "User sudah berlangganan Pro" };
  await db.transaction(async (tx) => {
    await tx.update(users).set({ tier: "pro" } as never).where(eq(users.id, userId));
    await tx.insert(subscriptions).values({ userId, grantedBy, expiresAt } as never);
  });
  return { ok: true, message: `Akses Pro aktif selama ${durationLabel(days)}` };
}

/** Akhiri Pro sebelum waktunya: tutup periode langganan aktif, turunkan tier ke free. */
export async function endPro(userId: string, endedBy: string): Promise<{ ok: boolean; message: string }> {
  if (isMemoryMode()) {
    const u = memoryGetUserById(userId);
    if (!u) return { ok: false, message: "User tidak ditemukan" };
    const sub = memoryEndSubscription(userId, endedBy);
    if (!sub) return { ok: false, message: "Tidak ada langganan Pro aktif" };
    memorySetUserTier(userId, "free");
    return { ok: true, message: "Pro diakhiri, akun kembali ke Free" };
  }
  const db = getDb();
  const userRows = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!userRows[0]) return { ok: false, message: "User tidak ditemukan" };
  let ended = false;
  await db.transaction(async (tx) => {
    const rows = await tx
      .update(subscriptions)
      .set({ endedAt: new Date(), endedBy } as never)
      .where(and(eq(subscriptions.userId, userId), sql`${subscriptions.endedAt} is null`))
      .returning({ id: subscriptions.id });
    if (rows.length === 0) return;
    await tx.update(users).set({ tier: "free" } as never).where(eq(users.id, userId));
    ended = true;
  });
  return ended
    ? { ok: true, message: "Pro diakhiri, akun kembali ke Free" }
    : { ok: false, message: "Tidak ada langganan Pro aktif" };
}

/** Banned permanen: catat bannedAt sehingga user tidak bisa generate. */
export async function banUser(userId: string): Promise<{ ok: boolean; message: string }> {
  if (isMemoryMode()) {
    const u = memorySetUserBanned(userId, new Date().toISOString());
    return u ? { ok: true, message: "Akun di-banned permanen" } : { ok: false, message: "User tidak ditemukan" };
  }
  const db = getDb();
  const rows = await db
    .update(users)
    .set({ bannedAt: new Date() } as never)
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows.length > 0
    ? { ok: true, message: "Akun di-banned permanen" }
    : { ok: false, message: "User tidak ditemukan" };
}

/** Cabut banned (jaga-jaga kalau salah banned). */
export async function unbanUser(userId: string): Promise<{ ok: boolean; message: string }> {
  if (isMemoryMode()) {
    const u = memorySetUserBanned(userId, null);
    return u ? { ok: true, message: "Banned dicabut" } : { ok: false, message: "User tidak ditemukan" };
  }
  const db = getDb();
  const rows = await db
    .update(users)
    .set({ bannedAt: null } as never)
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return rows.length > 0
    ? { ok: true, message: "Banned dicabut" }
    : { ok: false, message: "User tidak ditemukan" };
}

/** Total generate user saat berstatus Pro (seluruh waktu). */
async function countProGenerate(userId: string): Promise<number> {
  if (isMemoryMode()) {
    return memoryCountUsageByTier(userId, GENERATE_STAGE, "pro");
  }
  const db = getDb();
  const rows = await db
    .select({ id: usageEvents.id })
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, userId), eq(usageEvents.stage, GENERATE_STAGE), eq(usageEvents.tier, "pro")));
  return rows.length;
}

/** Generate Free dalam rolling 24 jam terakhir (hanya event tier free). */
export async function countFreeGenerate24h(userId: string): Promise<number> {
  const sinceIso = new Date(Date.now() - DAY_MS);
  if (isMemoryMode()) {
    return memoryCountUsageSinceByTier(userId, GENERATE_STAGE, "free", sinceIso.toISOString());
  }
  const db = getDb();
  const rows = await db
    .select({ id: usageEvents.id })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.stage, GENERATE_STAGE),
        eq(usageEvents.tier, "free"),
        gte(usageEvents.createdAt, sinceIso),
      ),
    );
  return rows.length;
}

/** Detail lengkap satu akun untuk halaman admin. */
export async function getAccountDetail(userId: string): Promise<AccountDetail | null> {
  await syncExpiredPro(userId);
  let base: { id: string; email: string; name: string | null; bannedAt: Date | null; createdAt: Date } | null = null;
  if (isMemoryMode()) {
    const u = memoryGetUserById(userId);
    if (!u) return null;
    base = { id: u.id, email: u.email, name: u.name, bannedAt: toDate(u.bannedAt), createdAt: new Date(u.createdAt) };
  } else {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, userId));
    const r = rows[0];
    if (!r) return null;
    base = { id: r.id, email: r.email, name: r.name, bannedAt: r.bannedAt, createdAt: r.createdAt };
  }

  const subs = await getSubscriptions(userId);
  const active = activeSub(subs);
  const proActive = active !== null;
  const firstProAt = subs.length > 0 ? subs[subs.length - 1].startedAt : null;
  const endedSubs = subs.filter((s) => s.endedAt);
  const lastProEnd = endedSubs.length > 0 ? endedSubs[0].endedAt : null;
  const proGenerateCount = await countProGenerate(userId);
  const freeGenerate24h = await countFreeGenerate24h(userId);

  let planCount = 0;
  if (isMemoryMode()) {
    const { memoryListPlans } = await import("@/lib/memory-store");
    planCount = memoryListPlans(base.email).length;
  } else {
    const db = getDb();
    const rows = await db.select({ id: plans.id }).from(plans).where(eq(plans.userId, userId));
    planCount = rows.length;
  }

  return {
    ...base,
    tier: proActive ? "pro" : "free",
    firstProAt,
    lastProEnd,
    proActive,
    proExpiresAt: active?.expiresAt ?? null,
    proGenerateCount,
    freeGenerate24h,
    freeLimit: freeLimit(),
    planCount,
    subscriptions: subs,
  };
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  tier: Tier;
  bannedAt: Date | null;
  createdAt: Date;
  proActive: boolean;
  proExpiresAt: Date | null;
  isAdmin: boolean;
}

/** Daftar akun untuk admin, bisa dicari berdasarkan email/nama. */
export async function listAccounts(search?: string): Promise<AdminUserRow[]> {
  let rows: { id: string; email: string; name: string | null; bannedAt: Date | null; createdAt: Date }[] = [];
  if (isMemoryMode()) {
    rows = memoryListUsers().map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      bannedAt: toDate(u.bannedAt),
      createdAt: new Date(u.createdAt),
    }));
  } else {
    const db = getDb();
    const q = search?.trim();
    let dbRows;
    if (q) {
      dbRows = await db
        .select()
        .from(users)
        .where(or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`)))
        .orderBy(sql`${users.createdAt} desc`);
    } else {
      dbRows = await db.select().from(users).orderBy(sql`${users.createdAt} desc`);
    }
    rows = dbRows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      bannedAt: r.bannedAt,
      createdAt: r.createdAt,
    }));
  }
  if (isMemoryMode() && search?.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((r) => r.email.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q));
  }
  const withActive: AdminUserRow[] = [];
  for (const r of rows) {
    await syncExpiredPro(r.id);
    const subs = await getSubscriptions(r.id);
    const active = activeSub(subs);
    withActive.push({
      ...r,
      tier: active ? "pro" : "free",
      proActive: active !== null,
      proExpiresAt: active?.expiresAt ?? null,
      isAdmin: isAdminEmail(r.email),
    });
  }
  return withActive;
}
