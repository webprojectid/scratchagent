import { createHmac, timingSafeEqual } from "node:crypto";

export const recoveryCookie = "scratch_password_recovery";
function signature(value: string) {
  const secret = process.env.EMAIL_OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error("Recovery signing secret is not configured");
  return createHmac("sha256", secret).update(`password-recovery:${value}`).digest("base64url");
}
export function createRecoveryProof(userId: string, sessionId: string, now = Date.now()) {
  const value = Buffer.from(JSON.stringify({ userId, sessionId, expires: now + 600_000 })).toString("base64url");
  return `${value}.${signature(value)}`;
}
export function validRecoveryProof(proof: string, userId: string, sessionId: string, now = Date.now()): boolean {
  try {
    const [value, signed, extra] = proof.split(".");
    if (!value || !signed || extra) return false;
    const a = Buffer.from(signature(value)), b = Buffer.from(signed);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(value, "base64url").toString());
    return data.userId === userId && data.sessionId === sessionId && data.expires > now;
  } catch { return false; }
}
