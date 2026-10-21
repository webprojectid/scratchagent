import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { emailTemplate, sendTransactionalEmail, type EmailLanguage } from "./transactional-email";
import { reserveEmailBudget } from "./email-store";

export type SocialIdentity = { authUserId: string; sessionId: string; email: string; required: boolean };
type Challenge = { session_id: string; auth_user_id: string; nonce: string; code_hash: string; expires_at: Date; sent_at: Date; attempts: number; verified_at: Date | null };
const memory = new Map<string, Challenge>();
const limits = new Map<string, number>();
let memoryLock = Promise.resolve();

export function socialOtpRequired(provider: unknown, amr: unknown): boolean {
  if (process.env.SOCIAL_EMAIL_OTP_REQUIRED !== "1") return false;
  const methods = Array.isArray(amr) ? amr.flatMap(item => typeof item === "string" ? [item] : item && typeof item.method === "string" ? [item.method] : []) : [];
  if (methods.includes("recovery")) return false;
  if (methods.includes("password")) return true;
  if (methods.includes("oauth") || methods.includes("oauth_provider/authorization_code")) return true;
  const emailLogin = methods.some(method => ["otp", "magiclink", "email/signup"].includes(method));
  return !emailLogin && (provider === "google" || provider === "github" || provider === "email");
}

export function hashLoginCode(identity: Pick<SocialIdentity, "sessionId" | "authUserId">, nonce: string, code: string): string {
  const secret = process.env.EMAIL_OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error("Email OTP secret is not configured");
  return createHmac("sha256", secret).update(`${identity.authUserId}:${identity.sessionId}:${nonce}:${code}`).digest("hex");
}

async function locked<T>(identity: SocialIdentity, operation: (row: Challenge | undefined, save: (row: Challenge) => Promise<void>, limit: () => Promise<boolean>) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") throw new Error("OTP database is not configured");
    const previous = memoryLock;
    let release!: () => void;
    memoryLock = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try { return await operation(memory.get(identity.sessionId), async row => { memory.set(identity.sessionId, row); }, async () => {
      const key = `${identity.authUserId}:${Math.floor(Date.now() / 3600_000)}`;
      const count = limits.get(key) ?? 0; if (count >= 5) return false; limits.set(key, count + 1); return true;
    }); } finally { release(); }
  }
  return getDb().transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${identity.authUserId},0))`);
    const result = await tx.execute(sql`SELECT * FROM email_login_challenges WHERE session_id=${identity.sessionId}::uuid AND auth_user_id=${identity.authUserId}::uuid FOR UPDATE`);
    const raw = result.rows[0] as unknown as Challenge | undefined;
    const challenge = raw ? { ...raw, expires_at: new Date(raw.expires_at), sent_at: new Date(raw.sent_at), verified_at: raw.verified_at ? new Date(raw.verified_at) : null } : undefined;
    return operation(challenge, async row => {
      await tx.execute(sql`INSERT INTO email_login_challenges (session_id,auth_user_id,nonce,code_hash,expires_at,sent_at,attempts,verified_at) VALUES (${row.session_id}::uuid,${row.auth_user_id}::uuid,${row.nonce}::uuid,${row.code_hash},${row.expires_at},${row.sent_at},${row.attempts},${row.verified_at}) ON CONFLICT (session_id) DO UPDATE SET nonce=excluded.nonce,code_hash=excluded.code_hash,expires_at=excluded.expires_at,sent_at=excluded.sent_at,attempts=excluded.attempts,verified_at=excluded.verified_at WHERE email_login_challenges.auth_user_id=excluded.auth_user_id`);
    }, async () => {
      const budget = await tx.execute(sql`INSERT INTO email_otp_send_limits (auth_user_id,hour,count) VALUES (${identity.authUserId}::uuid,date_trunc('hour',now()),1) ON CONFLICT (auth_user_id,hour) DO UPDATE SET count=email_otp_send_limits.count+1 WHERE email_otp_send_limits.count < 5 RETURNING count`);
      return budget.rows.length > 0;
    });
  });
}

export async function isSocialSessionVerified(identity: SocialIdentity): Promise<boolean> {
  if (!identity.required) return true;
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") throw new Error("OTP database is not configured");
    const row = memory.get(identity.sessionId);
    return !!row?.verified_at && row.auth_user_id === identity.authUserId;
  }
  const result = await getDb().execute(sql`SELECT 1 FROM email_login_challenges WHERE session_id=${identity.sessionId}::uuid AND auth_user_id=${identity.authUserId}::uuid AND verified_at IS NOT NULL`);
  return result.rows.length > 0;
}

export async function issueSocialCode(identity: SocialIdentity, language: EmailLanguage, send = sendTransactionalEmail, resend = false): Promise<{ verified: boolean; retryAfter: number }> {
  if (!identity.required) return { verified: true, retryAfter: 0 };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const nonce = randomUUID();
  const digest = hashLoginCode(identity, nonce, code);
  const now = new Date();
  const issued = await locked(identity, async (row, save, limit) => {
    if (row?.verified_at) return { verified: true, retryAfter: 0 };
    const retryAfter = row ? Math.ceil((row.sent_at.getTime() + 60_000 - now.getTime()) / 1000) : 0;
    if (!resend && row && row.attempts < 5 && row.expires_at.getTime() > now.getTime()) {
      return { verified: false, retryAfter: Math.max(0, retryAfter) };
    }
    if (retryAfter > 0) {
      if (row!.attempts >= 5) throw new Error("Please wait a minute before requesting another code.");
      return { verified: false, retryAfter };
    }
    if (!await limit()) throw new Error("Too many codes requested. Please try again in an hour.");
    await save({ session_id: identity.sessionId, auth_user_id: identity.authUserId, nonce, code_hash: digest, expires_at: new Date(now.getTime() + 600_000), sent_at: now, attempts: 0, verified_at: null });
    return null;
  });
  if (issued) return issued;
  try {
    if (process.env.DATABASE_URL && !await reserveEmailBudget(false)) throw new Error("Email limit reached. Please try later.");
    await send(identity.email, emailTemplate({ kind: "social_otp", code }, language), nonce);
  } catch {
    // Never accept a code whose delivery was not acknowledged.
    await locked(identity, async (row, save) => { if (row?.nonce === nonce) await save({ ...row, attempts: 5 }); });
    throw new Error("We could not send your code. Please wait a minute and try again.");
  }
  return { verified: false, retryAfter: 60 };
}

export async function verifySocialCode(identity: SocialIdentity, code: string): Promise<boolean> {
  if (!identity.required) return true;
  if (!/^\d{6}$/.test(code)) return false;
  return locked(identity, async (row, save) => {
    if (!row || row.auth_user_id !== identity.authUserId || row.verified_at || row.attempts >= 5 || row.expires_at.getTime() <= Date.now()) return false;
    const actual = Buffer.from(hashLoginCode(identity, row.nonce, code), "hex");
    const expected = Buffer.from(row.code_hash, "hex");
    const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
    await save({ ...row, attempts: row.attempts + 1, verified_at: valid ? new Date() : null });
    return valid;
  });
}
