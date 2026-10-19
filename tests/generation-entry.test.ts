import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import ts from "typescript";
import { readRequestJson, RequestJsonError } from "@/lib/request-json";

function routeFixture(file: string, mocks: Record<string, unknown>) {
  const fixtureModule = { exports: {} as Record<string, (request: Request, context?: unknown) => Promise<Response>> };
  const output = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => {
    if (name === "@/lib/generation-checkpoint-store") return { getGenerationWork: async () => null };
    if (!(name in mocks)) throw new Error(`Unexpected route dependency: ${name}`);
    return mocks[name];
  }, process: { env: {} }, Date, Map, URL, console: { error() {} } });
  return fixtureModule.exports;
}

function generationEntry(schedulingFails = false, options: { authenticated?: boolean; legacy?: boolean; tier?: "free" | "pro"; emailVerified?: boolean } = {}) {
  const calls: string[] = [];
  const identities: (string | undefined)[] = [];
  let charged = 0;
  const user = { userId: randomUUID(), email: "fixture@example.test", via: "session", emailVerified: options.emailVerified };
  const routes = routeFixture("src/app/api/generate/route.ts", {
    "@/lib/write-origin": { writeOriginGate: () => null },
    "@/lib/llm-config": { resolveLlmProviders: async () => [{ baseUrl: "https://provider.example/v1", apiKey: "fixture", models: ["model"] }] },
    "@/lib/ui-messages": { apiText: (value: string) => value },
    "@/lib/account-store": { getAccountSettings: async () => ({ handoff: {} }), saveProjectState: async () => {} },
    "@/lib/account-preferences": { handoffSettingsSchema: z.object({}), resolveHandoff: () => ({}), effectiveTechPrefs: (prefs: unknown) => prefs },
    "next/server": { NextResponse }, zod: { z }, crypto: { randomUUID },
    "@/lib/run-generation": { scheduleGeneration: async () => { calls.push("schedule"); if (schedulingFails) throw new Error("Fixture scheduling failure"); return true; } },
    "@/lib/api-auth": { getRequestUser: async (id?: string) => { identities.push(id); return options.authenticated === false ? null : user; }, legacyDevMode: () => !!options.legacy, planOwnerKey: () => user.userId, unauthorized: () => NextResponse.json({ error: "Please sign in again or use a valid access token.", code: "AUTH_REQUIRED" }, { status: 401 }) },
    "@/lib/request-json": { readRequestJson, RequestJsonError },
    "@/lib/storage": { savePlan: async () => calls.push("save"), deletePlan: async () => calls.push("delete") },
    "@/lib/quota": { consumeQuota: async () => { charged++; return { userId: user.userId, tier: options.tier ?? "free", eventId: "fixture" }; }, refundQuota: async () => calls.push("refund") },
    "@/lib/billing": { getAccountState: async () => ({ tier: options.tier ?? "free" }), isAdminEmail: () => false },
    "@/lib/security": { getClientIp: async () => "fixture", blockedIpResponse: async () => null, RATE_LIMITS: { generate: { limit: 10, windowMs: 600000 } }, rateLimit: () => null, clientKey: () => "fixture", logSecurity: async () => {} },
  });
  return { calls, identities, charged: () => charged, invoke: (body = JSON.stringify({ brief: "Fixture plan", techPrefs: { mode: "auto" } })) => routes.POST(new Request("https://example.test/api/generate", { method: "POST", body })) };
}

test("unauthenticated generation rejects valid, malformed and empty bodies before parsing or charging", async () => {
  for (const body of ["{}", "{broken", ""]) {
    const fixture = generationEntry(false, { authenticated: false });
    const response = await fixture.invoke(body);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, "AUTH_REQUIRED");
    assert.equal(fixture.charged(), 0);
    assert.deepEqual(fixture.calls, []);
  }
});

test("authenticated malformed, invalid and oversized input never starts or charges generation", async () => {
  for (const [body, status, code] of [["{broken", 400, "INVALID_JSON"], ["{}", 400, "INVALID_INPUT"], ["x".repeat(65_537), 413, "PAYLOAD_TOO_LARGE"]] as const) {
    const fixture = generationEntry();
    const response = await fixture.invoke(body);
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
    assert.equal(fixture.charged(), 0);
    assert.deepEqual(fixture.calls, []);
  }
});

test("body identity is ignored in production and remains available only in legacy development", async () => {
  const body = JSON.stringify({ brief: "Fixture", techPrefs: { mode: "auto" }, userId: "spoof@example.test" });
  const normal = generationEntry();
  assert.equal((await normal.invoke(body)).status, 200);
  assert.deepEqual(normal.identities, [undefined]);
  const legacy = generationEntry(false, { legacy: true });
  assert.equal((await legacy.invoke(body)).status, 200);
  assert.deepEqual(legacy.identities, ["spoof@example.test"]);
});

test("email verification remains unchanged for both Free and Pro generation", async () => {
  for (const tier of ["free", "pro"] as const) {
    const fixture = generationEntry(false, { tier, emailVerified: false });
    assert.equal((await fixture.invoke()).status, 200);
    assert.equal(fixture.charged(), 1);
    assert.deepEqual(fixture.calls, ["save", "schedule"]);
  }
});

test("a saved provider configuration starts generation without LLM environment values", async () => {
  const fixture = generationEntry();
  const response = await fixture.invoke();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).async, true);
  assert.deepEqual(fixture.calls, ["save", "schedule"]);
});

test("a scheduling failure refunds the reservation and removes its unused skeleton", async () => {
  const fixture = generationEntry(true);
  assert.equal((await fixture.invoke()).status, 500);
  assert.deepEqual(fixture.calls, ["save", "schedule", "refund", "delete"]);
});

test("read-only progress polling cannot restart generation for a banned account", async () => {
  let scheduled = 0;
  const plan = { id: "fixture", userId: "owner", title: "Fixture", status: "generating", createdAt: new Date(Date.now() - 480000).toISOString(), features: [] };
  const routes = routeFixture("src/app/api/plans/[planId]/progress/route.ts", {
    "@/lib/write-origin": { writeOriginGate: () => null },
    "@/lib/account-store": { getProjectState: async () => ({}) },
    "next/server": { NextResponse },
    "@/lib/run-generation": { scheduleGeneration: async () => { scheduled++; } },
    "@/lib/api-auth": { getRequestUser: async () => ({ userId: "owner" }), accessPlan: async (_id: string, _user: unknown, options: { write?: boolean }) => options.write ? { error: NextResponse.json({}, { status: 403 }) } : { plan: { ...plan, progressVersion: "fixture", featureCount: 0 } } },
    "@/lib/storage": { getPlan: async () => plan, allTasks: () => [] },
    "@/lib/plan-progress": {},
    "@/lib/security": { getClientIp: async () => "fixture", clientKey: () => "fixture", rateLimit: () => null, RATE_LIMITS: { agent: {} } },
  });
  assert.equal((await routes.GET(new Request("https://example.test/api/plans/fixture/progress"), { params: Promise.resolve({ planId: "fixture" }) })).status, 200);
  assert.equal(scheduled, 0);
});

test("unchanged progress resumes a fresh structure only with write and origin permission", async () => {
  for (const mode of ["write", "read", "cross-origin"] as const) {
    let scheduled = 0;
    const plan = { id: "fixture", userId: "owner", title: "Fixture", brief: "Brief", status: "generating", createdAt: new Date().toISOString(), features: [] };
    const routes = routeFixture("src/app/api/plans/[planId]/progress/route.ts", {
      "@/lib/write-origin": { writeOriginGate: () => mode === "cross-origin" ? new Response(null, { status: 403 }) : null },
      "@/lib/account-store": { getProjectState: async () => ({}) },
      "next/server": { NextResponse },
      "@/lib/run-generation": { scheduleGeneration: async () => { scheduled++; } },
      "@/lib/api-auth": { getRequestUser: async () => ({ userId: "owner", tokenPolicy: { access: mode === "read" ? "read" : "write" } }), accessPlan: async () => ({ plan: { ...plan, progressVersion: "unchanged", featureCount: 0 } }) },
      "@/lib/storage": { getPlan: async () => plan, allTasks: () => [] },
      "@/lib/plan-progress": {},
      "@/lib/security": { getClientIp: async () => "fixture", clientKey: () => "fixture", rateLimit: () => null, RATE_LIMITS: { agent: {} } },
    });
    const response = await routes.GET(new Request("https://example.test/api/plans/fixture/progress", { headers: { "If-None-Match": '"unchanged"' } }), { params: Promise.resolve({ planId: "fixture" }) });
    assert.equal(response.status, 200);
    assert.equal(scheduled, mode === "write" ? 1 : 0);
  }
});

test("the completed structure snapshot returns full PRD data only after the plan access gate", async () => {
  const plan = { id: "fixture", title: "Generated title", asumsi: ["Proposed provider choice"], architecture: "Generated architecture", databaseSchema: "Generated database", requirements: { fungsional: ["Requested workflow"], nonFungsional: ["Enforced invariant"] } };
  let authenticated = true;
  const routes = routeFixture("src/app/api/plans/[planId]/route.ts", {
    "@/lib/write-origin": {}, "@/lib/account-capabilities": {}, "@/lib/ui-messages": {}, "@/lib/billing": {}, "@/lib/storage": {}, "@/lib/security": {},
    "next/server": { NextResponse },
    "@/lib/api-auth": { getRequestUser: async () => authenticated ? { userId: "owner" } : null, accessPlan: async (_id: string, user: unknown) => user ? { plan } : { error: NextResponse.json({}, { status: 401 }) } },
  });
  const request = new Request("https://example.test/api/plans/fixture");
  const response = await routes.GET(request, { params: Promise.resolve({ planId: "fixture" }) });
  assert.deepEqual(await response.json(), plan);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  authenticated = false;
  assert.equal((await routes.GET(request, { params: Promise.resolve({ planId: "fixture" }) })).status, 401);
});
