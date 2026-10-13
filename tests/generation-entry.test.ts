import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import ts from "typescript";

function routeFixture(file: string, mocks: Record<string, unknown>) {
  const fixtureModule = { exports: {} as Record<string, (request: Request, context?: unknown) => Promise<Response>> };
  const output = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => {
    if (!(name in mocks)) throw new Error(`Unexpected route dependency: ${name}`);
    return mocks[name];
  }, process: { env: {} }, Date, Map, URL, console: { error() {} } });
  return fixtureModule.exports;
}

function generationEntry(schedulingFails = false) {
  const calls: string[] = [];
  const user = { userId: randomUUID(), email: "fixture@example.test" };
  const routes = routeFixture("src/app/api/generate/route.ts", {
    "@/lib/write-origin": { writeOriginGate: () => null },
    "@/lib/llm-config": { resolveLlmProviders: async () => [{ baseUrl: "https://provider.example/v1", apiKey: "fixture", models: ["model"] }] },
    "@/lib/ui-messages": { apiText: (value: string) => value },
    "@/lib/account-store": { getAccountSettings: async () => ({ handoff: {} }), saveProjectState: async () => {} },
    "@/lib/account-preferences": { handoffSettingsSchema: z.object({}), resolveHandoff: () => ({}), effectiveTechPrefs: (prefs: unknown) => prefs },
    "next/server": { NextResponse }, zod: { z }, crypto: { randomUUID },
    "@/lib/run-generation": { scheduleGeneration: async () => { calls.push("schedule"); if (schedulingFails) throw new Error("Fixture scheduling failure"); return true; } },
    "@/lib/api-auth": { getRequestUser: async () => user, planOwnerKey: () => user.userId },
    "@/lib/storage": { savePlan: async () => calls.push("save"), deletePlan: async () => calls.push("delete") },
    "@/lib/quota": { consumeQuota: async () => ({ userId: user.userId, tier: "free", eventId: "fixture" }), refundQuota: async () => calls.push("refund") },
    "@/lib/billing": { getAccountState: async () => ({ tier: "free" }), isAdminEmail: () => false },
    "@/lib/security": { getClientIp: async () => "fixture", blockedIpResponse: async () => null, RATE_LIMITS: { generate: { limit: 10, windowMs: 600000 } }, rateLimit: () => null, clientKey: () => "fixture", logSecurity: async () => {} },
  });
  return { calls, invoke: () => routes.POST(new Request("https://example.test/api/generate", { method: "POST", body: JSON.stringify({ brief: "Fixture plan", techPrefs: { mode: "auto" } }) })) };
}

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
