import { NextResponse } from "next/server";
import { desc, eq, gte, sql } from "drizzle-orm";
import { getRequestUser, requireAdmin } from "@/lib/api-auth";
import { getDb } from "@/db";
import { blockedIps, securityEvents, tokens, users } from "@/db/schema";
import {
  RATE_LIMITS,
  clientKey,
  formatGeo,
  getClientIp,
  invalidateIpBlockCache,
  isPrivateIp,
  logSecurity,
  lookupIpGeo,
  normalizeIp,
  parseUserAgent,
  rateLimit,
  rateLimitedResponse,
} from "@/lib/security";

/**
 * Dashboard keamanan (admin-only):
 * - events: log kejadian terbaru + User-Agent (bot vs manusia) + geolocation IP
 * - stats: agregasi 24 jam terakhir per jenis + top IP + top user
 * - blockedIps: daftar IP yang diblokir admin
 * POST: aksi respons — blokir/unblokir IP, reset user, tandai false positive.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getRequestUser(searchParams.get("userId"));
  const gate = await requireAdmin(user);
  const ip = await getClientIp(request);
  if (gate) {
    await logSecurity("access_denied", { route: "/api/admin/security", reason: "not admin" }, { ip, userId: user?.userId ?? null, request });
    return gate;
  }

  const rl = RATE_LIMITS.admin;
  const retryIn = rateLimit(clientKey(user!.userId, ip), rl.limit, rl.windowMs);
  if (retryIn !== null) return rateLimitedResponse(clientKey(user!.userId, ip), retryIn, { ip, userId: user!.userId, route: "/api/admin/security" });

  const typeFilter = searchParams.get("type") || undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 500);

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ events: [], stats: null, blockedIps: [], note: "Mode memory: log keamanan hanya tersedia dengan DATABASE_URL." });
  }

  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const events = typeFilter
    ? await db.select().from(securityEvents).where(sql`${securityEvents.type} = ${typeFilter}`).orderBy(desc(securityEvents.createdAt)).limit(limit)
    : await db.select().from(securityEvents).orderBy(desc(securityEvents.createdAt)).limit(limit);

  const emails = new Map<string, string>();
  const uniqIds = [...new Set(events.map((e) => e.userId).filter((x): x is string => !!x))];
  if (uniqIds.length) {
    const rows = await db.select({ id: users.id, email: users.email }).from(users).where(sql`${users.id} in (${sql.join(uniqIds.map((x) => sql`${x}`), sql`, `)})`);
    for (const r of rows) emails.set(r.id, r.email);
  }

  const byType = await db
    .select({ type: securityEvents.type, count: sql<number>`count(*)::int` })
    .from(securityEvents)
    .where(sql`${gte(securityEvents.createdAt, since)} and ${securityEvents.dismissed} = false`)
    .groupBy(securityEvents.type);

  const topIps = await db
    .select({ ip: securityEvents.ip, count: sql<number>`count(*)::int` })
    .from(securityEvents)
    .where(sql`${gte(securityEvents.createdAt, since)} and ${securityEvents.ip} is not null and ${securityEvents.dismissed} = false`)
    .groupBy(securityEvents.ip)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const topUsers = await db
    .select({ userId: securityEvents.userId, count: sql<number>`count(*)::int` })
    .from(securityEvents)
    .where(sql`${gte(securityEvents.createdAt, since)} and ${securityEvents.userId} is not null and ${securityEvents.dismissed} = false`)
    .groupBy(securityEvents.userId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const totals = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(securityEvents)
    .where(sql`${gte(securityEvents.createdAt, since)} and ${securityEvents.dismissed} = false`);

  // Geolocation IP publik (best-effort, paralel, dibatasi supaya GET tetap cepat).
  const publicIps = [...new Set([...topIps.map((r) => r.ip), ...events.map((e) => e.ip)].filter((x): x is string => !!x && !isPrivateIp(x)))].slice(0, 8);
  const geoRows = await Promise.all(publicIps.map(async (x) => ({ ip: x, geo: await lookupIpGeo(x) })));
  const geoMap = new Map(geoRows.map((r) => [r.ip, formatGeo(r.geo)]));

  const blockedRows = await db.select().from(blockedIps).orderBy(desc(blockedIps.createdAt)).limit(100);

  const localNote =
    "IP `::1` / `127.0.0.1` artinya koneksi dari mesin sendiri (localhost/dev), bukan pengunjung nyata. " +
    "Di production (Vercel/proxy), x-forwarded-for berisi IP pengunjung asli.";

  return NextResponse.json({
    localNote,
    events: events.map((e) => {
      const n = normalizeIp(e.ip);
      const detail = (e.detail ?? {}) as Record<string, unknown>;
      // UA baru tercatat di event yang dibuat setelah fitur ini; event lama fallback "-".
      const ua = typeof detail.ua === "string" ? detail.ua : null;
      const uaKind = typeof detail.uaKind === "string" ? detail.uaKind : ua ? parseUserAgent(ua).kind : null;
      return {
        id: e.id,
        type: e.type,
        detail,
        dismissed: e.dismissed,
        ip: n.ip,
        ipLabel: n.label,
        ipIsLocal: n.isLocal,
        ipGeo: e.ip && !n.isLocal ? geoMap.get(e.ip) ?? null : null,
        ua,
        uaBrowser: ua ? parseUserAgent(ua).browser : null,
        uaOs: ua ? parseUserAgent(ua).os : null,
        uaKind,
        userId: e.userId,
        userEmail: e.userId ? emails.get(e.userId) ?? null : null,
        createdAt: e.createdAt,
      };
    }),
    blockedIps: blockedRows.map((b) => ({
      id: b.id,
      ip: b.ip,
      reason: b.reason,
      blockedBy: b.blockedBy,
      createdAt: b.createdAt,
      expiresAt: b.expiresAt,
    })),
    stats: {
      window24h: { total: totals[0]?.total ?? 0 },
      byType: byType.map((r) => ({ type: r.type, count: r.count })),
      topIps: topIps.map((r) => {
        const n = normalizeIp(r.ip);
        return { ip: n.ip, label: n.label, isLocal: n.isLocal, geo: r.ip && !n.isLocal ? geoMap.get(r.ip) ?? null : null, count: r.count };
      }),
      topUsers: topUsers.map((r) => ({ userId: r.userId, email: emails.get(r.userId ?? "") ?? r.userId, count: r.count })),
    },
  });
}

/**
 * Aksi respons admin. Semua aksi dicatat sebagai audit trail (admin_action /
 * ip_blocked / user_reset / event_dismissed) dengan email pelaku.
 *
 * Body: { action: "block_ip" | "unblock_ip" | "reset_user" | "dismiss_event", ... }
 */
export async function POST(request: Request) {
  const user = await getRequestUser();
  const gate = await requireAdmin(user);
  const ip = await getClientIp(request);
  if (gate) {
    await logSecurity("access_denied", { route: "/api/admin/security POST", reason: "not admin" }, { ip, userId: user?.userId ?? null, request });
    return gate;
  }

  const rl = RATE_LIMITS.admin;
  const retryIn = rateLimit(clientKey(user!.userId, ip), rl.limit, rl.windowMs);
  if (retryIn !== null) return rateLimitedResponse(clientKey(user!.userId, ip), retryIn, { ip, userId: user!.userId, route: "/api/admin/security POST" });

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Aksi keamanan hanya tersedia dengan DATABASE_URL." }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = body?.action;
  const db = getDb();
  const adminEmail = user!.email ?? user!.userId;

  try {
    // --- 1. Blokir IP -------------------------------------------------
    if (action === "block_ip") {
      const targetIp = String(body?.ip ?? "").trim();
      if (!targetIp) return NextResponse.json({ error: "IP target wajib diisi." }, { status: 400 });
      if (isPrivateIp(targetIp)) {
        return NextResponse.json({ error: "IP lokal/privat tidak perlu diblokir (itu mesin sendiri)." }, { status: 400 });
      }
      const hours = Number(body?.durationHours ?? 0);
      const expiresAt = hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000) : null;
      await db
        .insert(blockedIps)
        .values({ ip: targetIp, reason: String(body?.reason ?? "Diblokir dari Pusat Keamanan"), blockedBy: adminEmail, expiresAt } as never)
        .onConflictDoUpdate({ target: blockedIps.ip, set: { reason: String(body?.reason ?? "Diblokir dari Pusat Keamanan"), blockedBy: adminEmail, expiresAt, createdAt: new Date() } });
      invalidateIpBlockCache();
      await logSecurity("ip_blocked", { ip: targetIp, reason: String(body?.reason ?? ""), durationHours: hours || null, by: adminEmail }, { userId: user!.userId, ip, request });
      return NextResponse.json({ ok: true, blocked: targetIp });
    }

    // --- 2. Cabut blokir IP --------------------------------------------
    if (action === "unblock_ip") {
      const targetIp = String(body?.ip ?? "").trim();
      if (!targetIp) return NextResponse.json({ error: "IP target wajib diisi." }, { status: 400 });
      await db.delete(blockedIps).where(eq(blockedIps.ip, targetIp));
      invalidateIpBlockCache();
      await logSecurity("ip_unblocked", { ip: targetIp, by: adminEmail }, { userId: user!.userId, ip, request });
      return NextResponse.json({ ok: true, unblocked: targetIp });
    }

    // --- 3. Reset user: cabut SEMUA token API milik user ---------------
    if (action === "reset_user") {
      const targetUserId = String(body?.userId ?? "").trim();
      if (!targetUserId) return NextResponse.json({ error: "userId target wajib diisi." }, { status: 400 });
      const rows = await db.select({ id: tokens.id }).from(tokens).where(eq(tokens.userId, targetUserId));
      await db.update(tokens).set({ revokedAt: new Date() }).where(sql`${tokens.userId} = ${targetUserId} and ${tokens.revokedAt} is null`);
      let email: string | null = null;
      const u = await db.select({ email: users.email }).from(users).where(eq(users.id, targetUserId));
      email = u[0]?.email ?? null;
      await logSecurity("user_reset", { targetUserId, email, revokedTokens: rows.length, by: adminEmail }, { userId: user!.userId, ip, request });
      return NextResponse.json({ ok: true, revokedTokens: rows.length });
    }

    // --- 4. Tandai event sebagai false positive -------------------------
    if (action === "dismiss_event") {
      const eventId = String(body?.eventId ?? "").trim();
      if (!eventId) return NextResponse.json({ error: "eventId wajib diisi." }, { status: 400 });
      await db.update(securityEvents).set({ dismissed: true }).where(eq(securityEvents.id, eventId));
      await logSecurity("event_dismissed", { eventId, by: adminEmail }, { userId: user!.userId, ip, request });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal. Gunakan: block_ip, unblock_ip, reset_user, dismiss_event." }, { status: 400 });
  } catch (e) {
    await logSecurity("admin_action", { route: "/api/admin/security POST", failed: String(e) }, { userId: user!.userId, ip, request });
    return NextResponse.json({ error: "Aksi gagal diproses." }, { status: 500 });
  }
}
