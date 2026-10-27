import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { IDEAS_PER_PLAN_LIMIT } from "@/lib/plan-limits";
import type { Plan } from "@/lib/types";

function fixture(initialTier: "free" | "pro", used = 0) {
  let tier = initialTier;
  let plan: Plan = { id: "synthetic-plan", userId: "synthetic-owner", tier: "pro", title: "Synthetic", brief: "Synthetic brief", stack: [], asumsi: [], features: [], status: "ready", ideas: Array.from({ length: used }, () => ({ text: "Existing synthetic idea", createdAt: "2026-01-01T00:00:00Z" })) };
  let lease = false, calls = 0, saves = 0;
  let releaseProvider!: () => void, providerStarted!: () => void;
  const started = new Promise<void>(resolve => { providerStarted = resolve; });
  const provider = new Promise<void>(resolve => { releaseProvider = resolve; });
  const mocks: Record<string, unknown> = {
    "next/server": { NextResponse },
    "@/lib/write-origin": { writeOriginGate: () => null },
    "@/lib/api-auth": { getRequestUser: async () => ({ userId: "synthetic-owner", via: "session" }), accessPlan: async () => ({ plan: structuredClone(plan) }) },
    "@/lib/billing": { getAccountState: async () => ({ tier }) },
    "@/lib/account-capabilities": { hasProFeatures: (_user: unknown, value: string) => value === "pro" },
    "@/lib/ui-messages": { apiText: (value: string) => value },
    "@/lib/account-store": { recordAccountActivity: async () => {} },
    "@/lib/security": { RATE_LIMITS: { ideas: { limit: 10, windowMs: 1000 } }, clientKey: () => "synthetic", getClientIp: async () => "synthetic", rateLimit: () => null, logSecurity: async () => {} },
    "@/lib/plan-limits": { IDEAS_PER_PLAN_LIMIT },
    "@/lib/generation-lease": { claimGeneration: async () => { if (lease) return null; lease = true; return "synthetic-lease"; }, releaseGeneration: async () => { lease = false; } },
    "@/lib/plan-mutation": { withPlanMutation: async (_id: string, operation: () => Promise<unknown>) => operation() },
    "@/lib/storage": { getPlan: async () => structuredClone(plan), savePlan: async (value: Plan) => { saves++; plan = structuredClone(value); } },
    "@/lib/generate": {
      convertIdeaToFeature: async () => { calls++; providerStarted(); await provider; return { title: "Synthetic additional phase", subFeatures: [{ title: "Synthetic capability", tujuan: "Synthetic objective", selesaiBila: ["Observable result"] }] }; },
      generateTasksForFeature: async (_brief: string, _title: string, _sub: string[], _index: number, modelTier: string) => { assert.equal(modelTier, initialTier); return { tasks: [{ id: "t1", title: "Synthetic task", layer: "backend", deps: [] }] }; },
      assignTasksToSubFeatures: () => new Map([[0, [0]]]), buildTaskRef: () => "F01-S01-T01", sanitizeDeps: () => new Map(),
    },
  };
  const mod = { exports: {} as Record<string, (request: Request, context: unknown) => Promise<Response>> };
  runInNewContext(ts.transpileModule(readFileSync("src/app/api/plans/[planId]/ideas/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: mod, exports: mod.exports, require: (name: string) => { assert.ok(name in mocks, name); return mocks[name]; }, structuredClone, process: { env: {} }, console });
  return { started, releaseProvider, calls: () => calls, saves: () => saves, saved: () => plan, setTier: (value: typeof tier) => { tier = value; }, invoke: (method = "POST") => mod.exports[method](new Request("https://example.test/api", { method, ...(method === "POST" ? { body: JSON.stringify({ idea: "Add a synthetic export workflow" }) } : {}) }), { params: Promise.resolve({ planId: plan.id }) }) };
}

test("Free cannot add ideas and the displayed allowance is zero", async () => {
  const run = fixture("free");
  assert.equal((await run.invoke()).status, 403);
  assert.equal((await (await run.invoke("GET")).json()).limit, 0);
  assert.equal(run.calls(), 0);
});

test("concurrent Pro ideas serialize before AI work and respect the two-idea allowance", async () => {
  const run = fixture("pro", 1);
  const first = run.invoke();
  await run.started;
  assert.equal((await run.invoke()).status, 409);
  run.releaseProvider();
  assert.equal((await first).status, 200);
  assert.equal(run.calls(), 1);
  assert.equal(run.saves(), 1);
  assert.equal(run.saved().ideas?.length, 2);
  assert.equal((await run.invoke()).status, 409);
  assert.equal(run.calls(), 1);
});

test("Pro allowance and membership changes block a late idea without saving", async () => {
  assert.equal((await fixture("pro", 2).invoke()).status, 409);
  const run = fixture("pro", 1);
  const pending = run.invoke();
  await run.started;
  run.setTier("free");
  run.releaseProvider();
  assert.equal((await pending).status, 409);
  assert.equal(run.saves(), 0);
  assert.equal(run.saved().ideas?.length, 1);
});
