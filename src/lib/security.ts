import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { blockedIps, securityEvents } from "@/db/schema";
import type { NextResponse } from "next/server";

/**
 * Lapisan keamanan aplikasi: rate limiting in-memory + audit log ke DB.
 *
 * Kenapa ini penting: sebelum modul ini ada, TIDAK ADA cara mengetahui
 * apakah website sedang diserang — tanpa log dan tanpa pembatasan.
 * Sekarang setiap kejadian penting (401/403/429, generate, gagal login)
 * tercatat di tabel security_events dan bisa dilihat di /admin/security.
 */

// ============================================================
// 1. Rate limiter (in-memory, sliding window per key)
// ============================================================

interface WindowEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, WindowEntry>();
const CLEANUP_EVERY_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_EVERY_MS) return;
  lastCleanup = now;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export function isAdminIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const stripped = ip.trim().replace(/^::ffff:/i, "");
  if (isPrivateIp(stripped)) return true;
  const fromEnv = (process.env.ADMIN_IPS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/^::ffff:/i, ""))
    .filter(Boolean);
  return fromEnv.includes(ip) || fromEnv.includes(stripped);
}

export function isWhitelistedAdmin(key: string): boolean {
  if (key.startsWith("u:")) {
    const identifier = key.slice(2).toLowerCase();
    if (identifier.startsWith("admin@") || identifier === "admin") return true;
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .concat(["teguhends@gmail.com"]);
    if (adminEmails.includes(identifier)) return true;
  }
  if (key.startsWith("ip:")) {
    const ip = key.slice(3);
    if (isAdminIp(ip)) return true;
  }
  return false;
}

/**
 * Cek jatah `limit` permintaan per `windowMs` untuk satu key.
 * Return null kalau masih boleh; kalau habis, return sisa detik sampai reset.
 * IP/email admin selalu lolos (return null) agar testing lancar tanpa batasan.
 */
export function rateLimit(key: string, limit: number, windowMs: number): number | null {
  if (isWhitelistedAdmin(key)) return null;
  const now = Date.now();
  cleanup(now);
  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count > limit) return Math.ceil((entry.resetAt - now) / 1000);
  return null;
}

/**
 * Ambil identitas client untuk key rate-limit.
 * Prioritas: user yang login > IP asli (x-forwarded-for paling kiri).
 */
export function clientKey(userId: string | null | undefined, fallbackIp?: string): string {
  if (userId) return `u:${userId}`;
  return `ip:${fallbackIp ?? "anon"}`;
}

/**
 * Normalisasi IP untuk tampilan. `::1` / `127.0.0.1` = koneksi dari mesin
 * sendiri (localhost/dev), bukan pengunjung nyata. Di production (Vercel/
 * proxy), x-forwarded-for berisi IP pengunjung asli sehingga nilai di sini
 * tetap IP beneran.
 */
export function normalizeIp(ip: string | null | undefined): { ip: string; label: string | null; isLocal: boolean } {
  const raw = (ip ?? "").trim();
  if (!raw) return { ip: "", label: null, isLocal: false };
  const stripped = raw.replace(/^::ffff:/i, ""); // IPv4-mapped IPv6 (::ffff:1.2.3.4)
  const isLocal =
    stripped === "::1" ||
    stripped === "127.0.0.1" ||
    stripped === "localhost" ||
    stripped.startsWith("127.") ||
    stripped === "::";
  return { ip: raw, label: isLocal ? "localhost / mesin sendiri" : null, isLocal };
}

/** Ambil IP client dari header yang di-set proxy (Vercel/Cloudflare). */
export async function getClientIp(request?: Request): Promise<string> {
  try {
    if (request) {
      const xf = request.headers.get("x-forwarded-for");
      if (xf) return xf.split(",")[0].trim();
      const real = request.headers.get("x-real-ip");
      if (real) return real.trim();
    }
    const h = await headers();
    const xf = h.get("x-forwarded-for");
    if (xf) return xf.split(",")[0].trim();
    return h.get("x-real-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}

// ============================================================
// 2. Audit log keamanan (ke tabel security_events; DB mode saja)
// ============================================================

/**
 * Ringkas User-Agent jadi informasi terbaca: browser + OS + indikasi bot.
 * Dipakai Pusat Keamanan untuk membedakan traffic manusia vs bot tanpa
 * library eksternal (parsing lokal, nol dependensi).
 */
export function parseUserAgent(ua: string | null | undefined): {
  browser: string;
  os: string;
  kind: "browser" | "cli" | "bot" | "unknown";
  suspicious: boolean;
} {
  const u = (ua ?? "").trim();
  if (!u) return { browser: "—", os: "—", kind: "unknown", suspicious: false };

  // Bot/scraper umum — kata kunci di awal karena bot sering mengaku browser.
  const botSignals = [
    "bot", "crawler", "spider", "crawling", "scrapy", "scrape", "headless",
    "python-requests", "python-urllib", "httpx", "go-http-client", "okhttp",
    "java/", "libwww", "wget", "axios/", "node-fetch", "undici", "curl/",
    "postmanruntime", "insomnia", "apache-httpclient", "guava", "aiohttp",
    "semrush", "ahrefs", "mj12", "dotbot", "petalbot", "bytespider",
  ];
  const lower = u.toLowerCase();
  const hitBot = botSignals.find((s) => lower.includes(s));

  // CLI: curl/wget/go-http-client dll pasti bukan manusia.
  const cliSignals = ["curl/", "wget", "python-requests", "python-urllib", "httpx", "axios/", "node-fetch", "undici", "go-http-client"];
  const hitCli = cliSignals.find((s) => lower.includes(s));

  let browser = "—";
  if (hitCli) browser = hitCli.replace(/\/$/, "");
  else if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("samsungbrowser")) browser = "Samsung Internet";
  else if (lower.includes("chrome/") && !lower.includes("chromium")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome")) browser = "Safari";

  let os = "—";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("linux") || lower.includes("ubuntu") || lower.includes("debian")) os = "Linux";

  const kind = hitCli ? "cli" : hitBot ? "bot" : browser !== "—" ? "browser" : "unknown";
  return { browser, os, kind, suspicious: Boolean(hitBot) };
}

/**
 * Ambil ringkasan client dari header request (UA + jenisnya) untuk dicatat
 * di setiap logSecurity. Dipanggil di titik-titik yang punya objek Request.
 */
export function clientAgentInfo(request?: Request | null): { ua: string | null; uaKind: string | null } {
  if (!request) return { ua: null, uaKind: null };
  const ua = request.headers.get("user-agent");
  if (!ua) return { ua: null, uaKind: null };
  const parsed = parseUserAgent(ua);
  return { ua: ua.slice(0, 300), uaKind: parsed.kind };
}

/**
 * Geolocation IP tanpa dependency & tanpa key:
 * - Lokal (::1, 127.0.0.1, private range) → label tanpa lookup.
 * - IP publik → lookup ke ipwho.is (gratis, tanpa API key, best-effort
 *   dengan timeout pendek; gagal = null, tidak pernah menjatuhkan request).
 */
export function isPrivateIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const v4 = ip.replace(/^::ffff:/i, "");
  if (["::1", "127.0.0.1", "localhost", "::"].includes(v4)) return true;
  if (v4.startsWith("127.") || v4.startsWith("10.")) return true;
  if (v4.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v4)) return true;
  if (v4.startsWith("169.254.")) return true; // link-local
  return false;
}

export interface IpGeo {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  isp: string | null;
  local: boolean;
}

const geoCache = new Map<string, IpGeo>();

export async function lookupIpGeo(ip: string | null | undefined): Promise<IpGeo> {
  const empty: IpGeo = { country: null, countryCode: null, city: null, isp: null, local: false };
  if (!ip) return empty;
  if (isPrivateIp(ip)) return { ...empty, local: true };
  const cached = geoCache.get(ip);
  if (cached) return cached;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return empty;
    const d = (await res.json()) as Record<string, unknown>;
    if (d?.success === false) return empty;
    const geo: IpGeo = {
      country: (d.country as string) ?? null,
      countryCode: (d.country_code as string) ?? null,
      city: (d.city as string) ?? null,
      isp: ((d.connection as Record<string, unknown> | undefined)?.isp as string) ?? null,
      local: false,
    };
    if (geoCache.size > 500) geoCache.clear(); // batas memori sederhana
    geoCache.set(ip, geo);
    return geo;
  } catch {
    return empty;
  }
}

/** Format lokasi jadi satu string pendek untuk tabel: "Jakarta, Indonesia (ID)". */
export function formatGeo(geo: IpGeo): string | null {
  if (geo.local) return "Lokal (mesin sendiri / jaringan privat)";
  if (!geo.country && !geo.city) return null;
  const parts = [geo.city, geo.country].filter(Boolean).join(", ");
  return geo.countryCode ? `${parts} (${geo.countryCode})` : parts;
}

export type SecurityEventType =
  | "auth_failed" // token/session tidak valid
  | "access_denied" // 403: tier gate, ownership, banned
  | "rate_limited" // 429: jatah habis
  | "quota_exhausted" // kuota harian free habis
  | "generate" // generate plan sukses (jejak biaya LLM)
  | "generate_tasks" // generate task per fitur
  | "idea_submitted" // chat ide Pro dipakai
  | "structure_deleted" // hapus fase/sub-fitur/task
  | "plan_deleted" // hapus plan
  | "admin_action" // aksi admin (grant Pro, ban, dsb.)
  | "ip_blocked" // admin memblokir IP dari Pusat Keamanan
  | "ip_unblocked" // blokir IP dicabut
  | "user_reset" // admin reset user (cabut semua token)
  | "event_dismissed"; // admin tandai event sebagai false positive

export async function logSecurity(
  type: SecurityEventType,
  detail: Record<string, unknown>,
  opts: { userId?: string | null; ip?: string | null; request?: Request | null } = {},
): Promise<void> {
  if (!process.env.DATABASE_URL) return; // memory mode: tidak ada tabel
  try {
    // Tangkap User-Agent otomatis kalau request tersedia:
    // inilah data yang dipakai Pusat Keamanan untuk bedakan bot vs manusia.
    const agent = clientAgentInfo(opts.request);
    const merged: Record<string, unknown> = { ...detail };
    if (agent.ua && merged.ua == null) {
      merged.ua = agent.ua;
      merged.uaKind = agent.uaKind;
    }
    const db = getDb();
    await db.insert(securityEvents).values({
      type,
      detail: merged,
      userId: opts.userId ?? null,
      ip: opts.ip ?? null,
    } as never);
  } catch {
    // Logging tidak boleh menjatuhkan request utama.
  }
}

// ============================================================
// 3. Blokir IP (respons admin dari Pusat Keamanan)
// ============================================================

/**
 * Cek apakah IP diblokir. Cache in-memory pendek (10 detik) supaya setiap
 * request tidak perlu query DB; diblokir baru berlaku ±10 detik setelah
 * admin menekan tombol — trade-off sederhana tanpa Redis.
 */
const IP_BLOCK_CACHE_MS = 10_000;
let ipBlockCache = { at: 0, ips: new Set<string>() };

export async function isIpBlocked(ip: string | null | undefined): Promise<boolean> {
  if (!ip || !process.env.DATABASE_URL) return false;
  if (isAdminIp(ip)) return false;
  const now = Date.now();
  if (now - ipBlockCache.at > IP_BLOCK_CACHE_MS) {
    try {
      const db = getDb();
      const rows = await db.select({ ip: blockedIps.ip, expiresAt: blockedIps.expiresAt }).from(blockedIps);
      const active = new Set<string>();
      for (const r of rows) {
        if (!r.expiresAt || new Date(r.expiresAt).getTime() > now) active.add(r.ip);
      }
      ipBlockCache = { at: now, ips: active };
    } catch {
      // Gagal baca daftar blokir → jangan blokir siapa pun (fail-open).
      return false;
    }
  }
  const stripped = ip.replace(/^::ffff:/i, "");
  return ipBlockCache.ips.has(ip) || ipBlockCache.ips.has(stripped);
}

/** Refresh cache blokir segera (dipanggil setelah block/unblock). */
export function invalidateIpBlockCache(): void {
  ipBlockCache.at = 0;
}

/**
 * Guard satu pintu untuk endpoint sensitif: tolak IP terblokir (403)
 * sebelum logika lain jalan. Return respons 403 kalau diblokir, null kalau aman.
 */
export async function blockedIpResponse(request: Request, ip: string): Promise<NextResponse | null> {
  if (!(await isIpBlocked(ip))) return null;
  const { NextResponse: NR } = await import("next/server");
  await logSecurity("access_denied", { reason: "ip_blocked", route: new URL(request.url).pathname }, { ip, request });
  return NR.json({ error: "Akses ditolak." }, { status: 403 });
}

/**
 * Helper: buat respons 429 + catat di log. Dipakai semua endpoint yang
 * diproteksi rate limit.
 */
export async function rateLimitedResponse(
  key: string,
  retryAfterSeconds: number,
  opts: { ip?: string; userId?: string | null; route?: string } = {},
): Promise<NextResponse> {
  const { NextResponse: NR } = await import("next/server");
  await logSecurity("rate_limited", { key, retryAfterSeconds, route: opts.route ?? null }, { ip: opts.ip ?? null, userId: opts.userId ?? null });
  const res = NR.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { status: 429 });
  res.headers.set("Retry-After", String(retryAfterSeconds));
  return res;
}

/**
 * Profil rate-limit per endpoint (per key: user login atau IP).
 * Angka dipilih longgar untuk penggunaan normal, ketat untuk brute-force.
 */
export const RATE_LIMITS = {
  /** Generate plan: mahal (LLM) — kuota harian sudah ada, ini rem kedua. */
  generate: { limit: 10, windowMs: 10 * 60 * 1000 },
  /** Generate tasks per fitur. */
  generateTasks: { limit: 40, windowMs: 10 * 60 * 1000 },
  /** Chat ide Pro (maks 2/project; rem anti-spam). */
  ideas: { limit: 6, windowMs: 10 * 60 * 1000 },
  /** Endpoint task agent CLI (poll tinggi wajar, tapi tetap dibatasi). */
  agent: { limit: 300, windowMs: 60 * 1000 },
  /** Pembuatan/pencabutan token. */
  tokens: { limit: 20, windowMs: 10 * 60 * 1000 },
  /** Endpoint admin (jarang dipakai). */
  admin: { limit: 120, windowMs: 10 * 60 * 1000 },
  /** Struktur: hapus fase/sub-fitur/task. */
  structure: { limit: 30, windowMs: 10 * 60 * 1000 },
} as const;
