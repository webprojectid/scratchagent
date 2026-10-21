import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { z } from "zod";

function route<T>(file: string, mocks: Record<string, unknown>, env: Record<string, string> = {}) {
  const fixture = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: fixture.exports, module: fixture, process: { env }, Buffer, Date, URL, console,
    require: (name: string) => mocks[name] ?? (name === "next/server" ? { NextResponse } : name === "zod" ? { z } : name === "node:crypto" ? requireCrypto : {}),
  });
  return fixture.exports as T;
}
import * as requireCrypto from "node:crypto";

test("pending OAuth sessions cannot access application APIs before the server OTP gate", async () => {
  let verified = false, created = 0;
  const auth = route<{ getAuthUser(): Promise<unknown> }>("src/lib/api-auth.ts", {
    "next/headers": { headers: async () => new Headers() },
    "@/lib/supabase/session-identity": { getSupabaseSessionIdentity: async () => ({ identity: { authUserId: "synthetic-auth", email: "synthetic@example.test", sessionId: "synthetic-session", required: true }, user: { email_confirmed_at: "2026-10-21" }, issuedAt: 1 }) },
    "./social-email-otp": { isSocialSessionVerified: async () => verified },
    "@/lib/memory-store": { memoryGetOrCreateUser: () => { created++; return { id: "synthetic-id" }; } },
    "./account-store": { trackSession: async () => true },
  }, { NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-public-key" });
  assert.equal(await auth.getAuthUser(), null);
  assert.equal(created, 0);
  verified = true;
  assert.equal((await auth.getAuthUser() as { via: string }).via, "session");
  assert.equal(created, 1);
});

test("OTP route denies cross-origin requests and never accepts an arbitrary recipient", async () => {
  let sends = 0;
  const otp = route<{ POST(request: Request): Promise<Response> }>("src/app/api/auth/social-otp/route.ts", {
    "@/lib/account-api": { sameOrigin: (request: Request) => request.headers.get("origin") === "https://example.test", parseAccountBody: async (request: Request, schema: z.ZodType) => schema.parse(await request.json()) },
    "@/lib/supabase/session-identity": { getSupabaseSessionIdentity: async () => ({ identity: { authUserId: "synthetic", email: "owner@example.test", sessionId: "synthetic-session", required: true } }) },
    "@/lib/social-email-otp": { isSocialSessionVerified: async () => false, issueSocialCode: async () => { sends++; return { verified: false, retryAfter: 60 }; } },
    "@/lib/security": { rateLimit: () => null },
  });
  const request = (body: unknown, origin = "https://example.test") => new Request("https://example.test/api/auth/social-otp", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await otp.POST(request({ action: "send" }, "https://attacker.test"))).status, 403);
  assert.equal((await otp.POST(request({ action: "send", email: "other@example.test" }))).status, 400);
  assert.equal(sends, 0);
  assert.equal((await otp.POST(request({ action: "send", language: "en" }))).status, 200);
  assert.equal(sends, 1);
});

test("verification retry recognizes an already verified session without reusing its consumed code", async () => {
  const otp = route<{ POST(request: Request): Promise<Response> }>("src/app/api/auth/social-otp/route.ts", {
    "@/lib/account-api": { sameOrigin: () => true, parseAccountBody: async (request: Request, schema: z.ZodType) => schema.parse(await request.json()) },
    "@/lib/supabase/session-identity": { getSupabaseSessionIdentity: async () => ({ identity: { authUserId: "synthetic", sessionId: "synthetic-session", required: true } }) },
    "@/lib/social-email-otp": { isSocialSessionVerified: async () => true, verifySocialCode: async () => { throw new Error("Consumed code must not be verified again"); } },
    "@/lib/security": { rateLimit: () => null },
  });
  const response = await otp.POST(new Request("https://example.test/api/auth/social-otp", { method: "POST", body: JSON.stringify({ action: "verify", code: "000000" }) }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).verified, true);
});

test("reset-password route rejects an ordinary session without a recovery proof", async () => {
  let updates = 0;
  const reset = route<{ POST(request: Request): Promise<Response> }>("src/app/api/auth/password-reset/route.ts", {
    "@/lib/account-api": { sameOrigin: () => true },
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "@/lib/supabase/session-identity": { getSupabaseSessionIdentity: async () => ({ identity: { authUserId: "synthetic", sessionId: "synthetic-session" } }) },
    "@/lib/password-recovery": { recoveryCookie: "synthetic", validRecoveryProof: () => false },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { updateUser: async () => { updates++; return {}; } } }) },
  });
  const response = await reset.POST(new Request("https://example.test/api/auth/password-reset", { method: "POST", body: JSON.stringify({ password: "synthetic-new-password" }) }));
  assert.equal(response.status, 403);
  assert.equal(updates, 0);
});

test("scheduled email endpoint requires the cron secret before reading user data", async () => {
  let work = 0;
  const cronSecret = requireCrypto.randomUUID();
  const cron = route<{ GET(request: Request): Promise<Response> }>("src/app/api/cron/email/route.ts", { "@/lib/email-notifications": { scheduleEmailReminders: async () => { work++; }, deliverEmailQueue: async () => ({ sent: 0 }) } }, { CRON_SECRET: cronSecret });
  assert.equal((await cron.GET(new Request("https://example.test/api/cron/email"))).status, 401);
  assert.equal(work, 0);
  assert.equal((await cron.GET(new Request("https://example.test/api/cron/email", { headers: { authorization: `Bearer ${cronSecret}` } }))).status, 200);
  assert.equal(work, 1);
});
