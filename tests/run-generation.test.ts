import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function scheduler(fail = false, ownsLease = true, registrationFails = false) {
  const calls: { kind: string; args: unknown[] }[] = [];
  let work: (() => Promise<void>) | undefined;
  const record = (kind: string) => async (...args: unknown[]) => { calls.push({ kind, args }); };
  const mocks: Record<string, unknown> = {
    "./generation-lease": { claimGeneration: async () => "lease", releaseGeneration: record("release"), withGenerationLease: async (_plan: string, _stage: string, _token: string, action: () => Promise<void>) => ownsLease ? action() : null, reserveGenerationAttempt: async () => true },
    "next/server": { after: (callback: () => Promise<void>) => { if (registrationFails) throw new Error("Fixture scheduling failure"); work = callback; } },
    "./generate": { generatePlanStructure: async () => { if (fail) throw new Error("Fixture failure"); return { title: "Fixture", stack: [], features: [], usage: { tokensIn: 2, tokensOut: 3 } }; } },
    "./storage": { savePlan: record("save"), deletePlan: record("delete"), updatePlanTitle: record("title") },
    "./quota": { finalizeQuota: record("finalize"), refundQuota: record("refund"), recordUsage: record("usage") },
    "./account-store": { recordAccountActivity: record("activity") },
    "./security": { logSecurity: record("security") },
    "./business-rules-detector": { detectBusinessRules: () => [] },
    "@/db": { getDb: () => { throw new Error("Tests must not access a database"); } },
    "@/db/schema-upgrade": { businessRules: {} },
    "drizzle-orm": { eq: () => {} },
  };
  const fixtureModule = { exports: {} as { scheduleGeneration: (job: unknown) => Promise<boolean> } };
  const output = ts.transpileModule(readFileSync("src/lib/run-generation.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => {
    if (!(name in mocks)) throw new Error(`Unexpected generation dependency: ${name}`);
    return mocks[name];
  }, console: { log() {}, error() {} }, process: { on() { throw new Error("Generation must not add a process exit listener"); } } });
  return { calls, schedule: fixtureModule.exports.scheduleGeneration, run: async () => { assert.ok(work); await work(); } };
}
const job = { planId: "fixture-plan", ownerId: "fixture-owner", userId: "fixture-user", tier: "free", brief: "Fixture", techPrefs: { mode: "auto" }, answers: [], receipt: { userId: "fixture-user", tier: "free", eventId: "fixture-receipt" } };

test("successful background generation preserves owner and finalizes quota once", async () => {
  const fixture = scheduler(); await fixture.schedule(job); await fixture.run();
  assert.equal(fixture.calls.find(call => call.kind === "save")?.args[1], job.ownerId);
  assert.equal(fixture.calls.filter(call => call.kind === "finalize").length, 1);
  assert.equal(fixture.calls.some(call => call.kind === "refund" || call.kind === "delete"), false);
});
test("failed generation refunds the receipt and deletes only its failed plan", async () => {
  const fixture = scheduler(true); await fixture.schedule(job); await fixture.run();
  assert.equal(fixture.calls.filter(call => call.kind === "refund").length, 1);
  assert.deepEqual(fixture.calls.find(call => call.kind === "delete")?.args, [job.planId]);
  assert.equal(fixture.calls.some(call => call.kind === "save" || call.kind === "finalize"), false);
});
test("a watchdog retry records usage without finalizing an old receipt again", async () => {
  const fixture = scheduler(); await fixture.schedule({ ...job, receipt: { userId: job.userId, tier: "free" } }); await fixture.run();
  assert.equal(fixture.calls.filter(call => call.kind === "usage").length, 1);
  assert.equal(fixture.calls.some(call => call.kind === "finalize"), false);
});

test("a superseded worker cannot save, refund, or delete its replacement's plan", async () => {
  for (const fail of [false, true]) {
    const fixture = scheduler(fail, false);
    await fixture.schedule(job);
    await fixture.run();
    assert.equal(fixture.calls.some(call => ["save", "refund", "delete", "finalize"].includes(call.kind)), false);
    assert.equal(fixture.calls.filter(call => call.kind === "release").length, 1);
  }
});

test("failed background registration releases the lease for a later retry", async () => {
  const fixture = scheduler(false, true, true);
  await assert.rejects(fixture.schedule(job), /scheduling failure/);
  assert.equal(fixture.calls.filter(call => call.kind === "release").length, 1);
});
