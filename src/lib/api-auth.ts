import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/tokens";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { memoryGetOrCreateUser, memoryGetUserById } from "@/lib/memory-store";
import { getPlan } from "@/lib/storage";
import type { Plan } from "@/lib/types";

export interface AuthUser {
  /** ID kanonik user: UUID users.id (DB mode) atau UUID memory-store (memory mode). */
  userId: string;
  email: string | null;
  via: "token" | "session" | "legacy-dev";
}

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

function supabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!anonKey && url.startsWith("https://") && !anonKey.startsWith("ISI_");
}

async function emailById(userId: string): Promise<string | null> {
  if (isMemoryMode()) return memoryGetUserById(userId)?.email ?? null;
  try {
    const db = getDb();
    const rows = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    return rows[0]?.email ?? null;
  } catch {
    return null;
  }
}

/** Resolve email -> userId (get-or-create). Dipakai untuk session Supabase. */
async function userIdByEmail(email: string): Promise<string> {
  if (isMemoryMode()) return memoryGetOrCreateUser(email).id;
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing[0]) return existing[0].id;
  const inserted = await db.insert(users).values({ email, name: email.split("@")[0] } as never).returning();
  return inserted[0].id;
}

/**
 * Identitas dari Bearer token (CLI) atau session Supabase (browser).
 * Return null kalau tidak ada identitas valid.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const result = await verifyToken(auth.slice(7));
    if (result) {
      return { userId: result.userId, email: await emailById(result.userId), via: "token" };
    }
  }

  if (supabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (email) {
        return { userId: await userIdByEmail(email), email, via: "session" };
      }
    } catch {
      // Session tidak terbaca / Supabase error: anggap belum login.
    }
  }

  return null;
}

/**
 * Mode dev "polos": memory mode tanpa Supabase dan bukan production.
 * Hanya di mode ini identitas legacy (param userId dari client) diterima,
 * supaya flow README "demo tanpa konfigurasi" tetap jalan di localhost.
 */
export function legacyDevMode(): boolean {
  return process.env.NODE_ENV !== "production" && isMemoryMode() && !supabaseConfigured();
}

/**
 * getAuthUser + fallback legacy khusus dev polos.
 * `legacyUserId` diambil dari query/body oleh caller (mis. ?userId=...).
 */
export async function getRequestUser(legacyUserId?: string | null): Promise<AuthUser | null> {
  const user = await getAuthUser();
  if (user) return user;
  if (legacyDevMode() && legacyUserId) {
    const email = legacyUserId.includes("@") ? legacyUserId : null;
    return { userId: legacyUserId, email, via: "legacy-dev" };
  }
  return null;
}

/**
 * Kunci ownership plan per mode storage:
 * - DB mode: plan.userId adalah UUID users.id -> pakai userId.
 * - Memory mode: plan.userId disimpan sebagai email/"shared" -> pakai email.
 */
export function planOwnerKey(user: AuthUser): string {
  if (isMemoryMode()) return user.email ?? user.userId;
  return user.userId;
}

export function ownsPlan(plan: Pick<Plan, "userId">, user: AuthUser): boolean {
  const owner = plan.userId;
  if (!owner || owner === "demo") return false;
  if (owner === user.userId) return true;
  if (user.email && owner.toLowerCase() === user.email.toLowerCase()) return true;
  return false;
}

export function unauthorized() {
  return NextResponse.json({ error: "Token tidak valid atau telah dicabut" }, { status: 401 });
}

export function forbidden(message = "Akses ditolak") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** 404 (bukan 403) supaya keberadaan plan orang lain tidak bocor. */
export function planNotFound() {
  return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });
}

/**
 * Gate akses plan: auth + ownership.
 * - planId "demo": publik untuk read-only (sesuai flow demo README); write = 403.
 * - Tanpa user: 401. Plan tidak ditemukan / bukan milik user: 404.
 */
export async function accessPlan(
  planId: string,
  user: AuthUser | null,
  opts: { write?: boolean } = {},
): Promise<{ plan?: Plan; error?: NextResponse }> {
  if (planId === "demo") {
    if (opts.write) return { error: forbidden("Plan demo bersifat read-only") };
    const plan = await getPlan("demo");
    return plan ? { plan } : { error: planNotFound() };
  }
  if (!user) return { error: unauthorized() };
  const plan = await getPlan(planId);
  if (!plan || !ownsPlan(plan, user)) return { error: planNotFound() };
  return { plan };
}

/**
 * Gate plan untuk HALAMAN (server component): auth + ownership.
 * - planId "demo": publik (read-only).
 * - Mode dev polos: identitas tak terdeteksi server-side, lanjut tanpa gate.
 * - Belum login: redirect ke /login. Plan tak ditemukan / bukan milik user: notFound().
 * Hanya panggil dari server component (pakai redirect/notFound).
 */
export async function requirePlanForPage(planId: string): Promise<Plan> {
  const publicAccess = planId === "demo" || legacyDevMode();
  if (!publicAccess) {
    const user = await getAuthUser();
    if (!user) redirect("/login");
    const plan = await getPlan(planId);
    if (!plan || !ownsPlan(plan, user)) notFound();
    return plan;
  }
  const plan = await getPlan(planId);
  if (!plan) notFound();
  return plan;
}

/** Gate route yang hanya boleh ada di luar production (mis. /api/test/*). */
export function devOnlyGate(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** Gate admin berbasis daftar email di env ADMIN_EMAILS (dipisah koma). */
export async function requireAdmin(user: AuthUser | null): Promise<NextResponse | null> {
  if (!user?.email) return unauthorized();
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length === 0 || !admins.includes(user.email.toLowerCase())) {
    return forbidden("Akses admin ditolak. Daftarkan email di env ADMIN_EMAILS.");
  }
  return null;
}
