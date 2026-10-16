import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as cleanup } from "@/app/api/admin/cleanup/route";
import { POST as reset } from "@/app/api/test/reset-plan/route";
import { GET as seed } from "@/app/api/test/seed-plan/route";
import { GET as create } from "@/app/api/test/create-generating/route";
import { GET as fast } from "@/app/api/test/generate-fast/route";
import { isWhitelistedAdmin } from "@/lib/security";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { NextResponse } from "next/server";
import ts from "typescript";

test("retired debug endpoints cannot mutate plans in any environment", async () => {
  const original = process.env.NODE_ENV;
  try {
    for (const environment of ["development", "test", "production"]) {
      process.env.NODE_ENV = environment;
      for (const handler of [cleanup, reset, seed, create, fast]) {
        const response = await handler();
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: "Not found" });
      }
    }
  } finally { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; }
});

test("rate-limit administrator whitelist uses the configured email list", () => {
  const original = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "rate-admin@example.test";
  try {
    assert.equal(isWhitelistedAdmin("u:RATE-ADMIN@EXAMPLE.TEST"), true);
    assert.equal(isWhitelistedAdmin("u:rate-admin-extra@example.test"), false);
    assert.equal(isWhitelistedAdmin("u:other@example.test"), false);
    assert.equal(isWhitelistedAdmin("u:admin@example.test"), false);
  } finally { if (original === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = original; }
});

function taskGeneration(owner?: string) {
  const savedOwners: string[] = [];
  const plan = { userId: owner, status: "generating", features: [{ title: "Feature", subFeatures: [{ title: "Sub", tasks: [] }] }] };
  const mocks: Record<string, unknown> = {
    "@/lib/write-origin": { writeOriginGate: () => null },
    "@/lib/generation-lease": { claimGeneration: async () => "lease", releaseGeneration: async () => {}, ownsGeneration: async () => true, reserveGenerationAttempt: async () => true },
    "@/lib/generated-plan": { finalizeGeneratedPlan: async (_plan: unknown, owner: string) => { savedOwners.push(owner); return true; } },
    "next/server": { NextResponse }, "@/lib/ui-messages": { apiText: (value: string) => value },
    "@/lib/api-auth": { getRequestUser: async () => ({ userId: "acting-admin" }), accessPlan: async () => ({ plan }) },
    "@/lib/generate": { generateTasksForFeature: () => { throw new Error("Mock mode must not call an LLM"); }, buildTaskRef: (_fi: number, _si: number, number: number) => `F01-S01-T${number}`, assignTasksToSubFeatures: (items: unknown[]) => new Map([[0, items.map((_, index) => index)]]), sanitizeDeps: (nodes: { ref: string; deps: string[] }[]) => new Map(nodes.map(node => [node.ref, node.deps])) },
    "@/lib/storage": { savePlan: async (_plan: unknown, owner: string) => { savedOwners.push(owner); }, updatePlanStatus: async () => {} },
    "@/lib/tasks": { ensureQaPhase: () => ({ ready: false }) },
  };
  const fixtureModule = { exports: {} as { POST: (request: Request, context: unknown) => Promise<Response> } };
  const output = ts.transpileModule(readFileSync("src/app/api/plans/[planId]/generate-tasks/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }, process: { env: { MOCK_LLM: "1" } }, URL });
  return { savedOwners, invoke: () => fixtureModule.exports.POST(new Request("https://example.invalid/api", { method: "POST", body: JSON.stringify({ featureIndex: 0 }) }), { params: Promise.resolve({ planId: "fixture-plan" }) }) };
}

test("task generation cannot assign an orphaned plan to a fallback account", async () => {
  const fixture = taskGeneration();
  assert.equal((await fixture.invoke()).status, 409);
  assert.deepEqual(fixture.savedOwners, []);
});
test("admin task generation keeps the original plan owner", async () => {
  const fixture = taskGeneration("original-owner");
  assert.equal((await fixture.invoke()).status, 200);
  assert.deepEqual(fixture.savedOwners, ["original-owner"]);
});
