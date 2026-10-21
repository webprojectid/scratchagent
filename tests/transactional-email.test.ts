import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { emailTemplate, sendTransactionalEmail, emailIdempotencyKey, EmailSendError } from "@/lib/transactional-email";
import { createRecoveryProof, validRecoveryProof } from "@/lib/password-recovery";
import { socialOtpRequired, issueSocialCode, verifySocialCode, isSocialSessionVerified, type SocialIdentity } from "@/lib/social-email-otp";
import { expiryReminderDay, unfinishedReminderDue } from "@/lib/email-notifications";

test("email templates escape user content and use the actual Pro limits", () => {
  const content = emailTemplate({ kind: "pro_active", subscriptionId: randomUUID(), days: 31, startsAt: "2026-10-01T02:00:00Z", expiresAt: "2026-11-01T02:00:00Z" });
  assert.match(content.subject, /Payment successful/);
  assert.match(content.text, /10–15 phases/);
  assert.match(content.text, /12–20 subfeatures/);
  assert.match(content.text, /15–25 tasks/);
  assert.match(content.text, /31 days/);
  assert.match(content.text, /1 November 2026/);
  assert.doesNotMatch(content.text, /Rp|\$\d|invoice/i);
  const reminder = emailTemplate({ kind: "unfinished_plans", plans: [{ id: randomUUID(), title: '<script>alert("x")</script>', done: 2, total: 10 }] }, "id");
  assert.doesNotMatch(reminder.html, /<script>/);
  assert.match(reminder.html, /&lt;script&gt;/);
  assert.match(reminder.text, /2\/10 task selesai/);
  assert.match(reminder.html, /Pengaturan notifikasi/);
  assert.throws(() => emailTemplate({ kind: "social_otp", code: "12345678" }));
});

test("expiry reminders cover exactly H-5, H-2 and H-1; unfinished reminders respect activity and weekly spacing", () => {
  const now = new Date("2026-10-21T02:00:00Z");
  const day = 86400_000;
  for (const expected of [5, 2, 1] as const) assert.equal(expiryReminderDay(new Date(now.getTime() + expected * day), now), expected);
  for (const other of [7, 6, 4, 3, 0, -1]) assert.equal(expiryReminderDay(new Date(now.getTime() + other * day), now), null);
  assert.equal(expiryReminderDay(new Date(now.getTime() + 5 * day + 3 * 3600_000), now), 5);
  assert.equal(unfinishedReminderDue(new Date(now.getTime() - 3 * day), null, now), true);
  assert.equal(unfinishedReminderDue(new Date(now.getTime() - 2 * day), null, now), false);
  assert.equal(unfinishedReminderDue(new Date(now.getTime() - 10 * day), new Date(now.getTime() - 6 * day), now), false);
  assert.equal(unfinishedReminderDue(new Date(now.getTime() - 10 * day), new Date(now.getTime() - 7 * day), now), true);
});

test("recovery proof is bound to the authenticated user, session and expiry", () => {
  const before = process.env.EMAIL_OTP_SECRET;
  process.env.EMAIL_OTP_SECRET = randomUUID() + randomUUID();
  try {
    const proof = createRecoveryProof("synthetic-user", "synthetic-session", 1000);
    assert.equal(validRecoveryProof(proof, "synthetic-user", "synthetic-session", 2000), true);
    assert.equal(validRecoveryProof(proof, "other-user", "synthetic-session", 2000), false);
    assert.equal(validRecoveryProof(proof, "synthetic-user", "other-session", 2000), false);
    assert.equal(validRecoveryProof(proof + "tampered", "synthetic-user", "synthetic-session", 2000), false);
    assert.equal(validRecoveryProof(proof, "synthetic-user", "synthetic-session", 601001), false);
  } finally { if (before === undefined) delete process.env.EMAIL_OTP_SECRET; else process.env.EMAIL_OTP_SECRET = before; }
});

test("social OTP is six digits, one-time, session-bound and throttles concurrent sends and guesses", async () => {
  const oldSecret = process.env.EMAIL_OTP_SECRET, oldDb = process.env.DATABASE_URL, oldEnabled = process.env.SOCIAL_EMAIL_OTP_REQUIRED;
  delete process.env.DATABASE_URL;
  process.env.EMAIL_OTP_SECRET = randomUUID() + randomUUID();
  process.env.SOCIAL_EMAIL_OTP_REQUIRED = "1";
  try {
    assert.equal(socialOtpRequired("google", []), true);
    assert.equal(socialOtpRequired("github", [{ method: "oauth" }]), true);
    assert.equal(socialOtpRequired("github", ["oauth"]), true);
    assert.equal(socialOtpRequired("google", ["oauth_provider/authorization_code"]), true);
    assert.equal(socialOtpRequired("google", ["unrecognized-method"]), true);
    assert.equal(socialOtpRequired("google", ["password"]), false);
    assert.equal(socialOtpRequired("email", [{ method: "password" }]), false);
    const identity: SocialIdentity = { authUserId: randomUUID(), sessionId: randomUUID(), email: "synthetic@example.test", required: true };
    let code = "", sends = 0;
    const sender: typeof sendTransactionalEmail = async (to, content) => { assert.equal(to, identity.email); code = content.text.match(/\b\d{6}\b/)![0]; sends++; return "synthetic-message"; };
    assert.equal(await isSocialSessionVerified(identity), false);
    await Promise.all([issueSocialCode(identity, "en", sender), issueSocialCode(identity, "en", sender)]);
    assert.equal(sends, 1);
    assert.match(code, /^\d{6}$/);
    assert.equal(await verifySocialCode({ ...identity, sessionId: randomUUID() }, code), false);
    assert.equal(await verifySocialCode(identity, "12345678"), false);
    assert.equal(await verifySocialCode(identity, code), true);
    assert.equal(await isSocialSessionVerified(identity), true);
    assert.equal(await verifySocialCode(identity, code), false);
    const locked = { ...identity, sessionId: randomUUID() };
    await issueSocialCode(locked, "en", sender);
    const wrong = code === "000000" ? "999999" : "000000";
    await Promise.all(Array.from({ length: 5 }, () => verifySocialCode(locked, wrong)));
    assert.equal(await verifySocialCode(locked, code), false);
    const failed = { ...identity, sessionId: randomUUID() };
    await assert.rejects(issueSocialCode(failed, "en", async (_to, content) => { code = content.text.match(/\b\d{6}\b/)![0]; throw new Error("synthetic delivery failure"); }));
    assert.equal(await verifySocialCode(failed, code), false);
  } finally {
    for (const [name, value] of [["EMAIL_OTP_SECRET", oldSecret], ["DATABASE_URL", oldDb], ["SOCIAL_EMAIL_OTP_REQUIRED", oldEnabled]]) { if (value === undefined) delete process.env[name!]; else process.env[name!] = value; }
  }
});

test("Brevo retries reuse the delivery identity and redact provider failures", async () => {
  const previous = globalThis.fetch, key = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = randomUUID();
  try {
    const ids: string[] = [];
    globalThis.fetch = async (_input, init) => { const body = JSON.parse(String(init?.body)); ids.push(body.headers.idempotencyKey); return Response.json({ code: "duplicate_parameter" }, { status: 400 }); };
    const content = emailTemplate({ kind: "social_otp", code: "000042" });
    assert.equal(await sendTransactionalEmail("synthetic@example.test", content, "event-a"), "deduplicated");
    await sendTransactionalEmail("synthetic@example.test", content, "event-a");
    assert.equal(ids[0], ids[1]);
    assert.notEqual(ids[0], emailIdempotencyKey("event-b"));
    globalThis.fetch = async () => Response.json({ error: "sensitive provider response" }, { status: 503 });
    await assert.rejects(sendTransactionalEmail("synthetic@example.test", content, "event-a"), cause => cause instanceof EmailSendError && cause.retryable && !cause.message.includes("sensitive"));
  } finally { globalThis.fetch = previous; if (key === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = key; }
});
