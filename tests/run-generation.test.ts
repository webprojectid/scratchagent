import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function scheduler(fail = false) {
  const calls: { kind: string; args: unknown[] }[] = [];
  let work: (() => Promise<void>) | undefined;
  const record = (kind: string) => async (...args: unknown[]) => { calls.push({ kind, args }); };
  const mocks: Record<string, unknown> = {
    "next/server": { after: (callback: () => Promise<void>) => { work = callback; } },
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
  const module = { exports: {} as { scheduleGeneration: (job: unknown) => void } };
  const output = ts.transpileModule(readFileSync("src/lib/run-generation.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module, exports: module.exports, require: (name: string) => {
    if (!(name in mocks)) throw new Error(`Unexpected generation dependency: ${name}`);
    return mocks[name];
  }, console: { log() {}, error() {} }, process: { on() { throw new Error("Generation must not add a process exit listener"); } } });
  return { calls, schedule: module.exports.scheduleGeneration, run: async () => { assert.ok(work); await work(); } };
}
const job = { planId: "fixture-plan", ownerId: "fixture-owner", userId: "fixture-user", tier: "free", brief: "Fixture", techPrefs: { mode: "auto" }, answers: [], receipt: { userId: "fixture-user", tier: "free", eventId: "fixture-receipt" } };

test("successful background generation preserves owner and finalizes quota once", async () => {
  const fixture = scheduler(); fixture.schedule(job); await fixture.run();
  assert.equal(fixture.calls.find(call => call.kind === "save")?.args[1], job.ownerId);
  assert.equal(fixture.calls.filter(call => call.kind === "finalize").length, 1);
  assert.equal(fixture.calls.some(call => call.kind === "refund" || call.kind === "delete"), false);
});
test("failed generation refunds the receipt and deletes only its failed plan", async () => {
  const fixture = scheduler(true); fixture.schedule(job); await fixture.run();
  assert.equal(fixture.calls.filter(call => call.kind === "refund").length, 1);
  assert.deepEqual(fixture.calls.find(call => call.kind === "delete")?.args, [job.planId]);
  assert.equal(fixture.calls.some(call => call.kind === "save" || call.kind === "finalize"), false);
});
test("a watchdog retry records usage without finalizing an old receipt again", async () => {
  const fixture = scheduler(); fixture.schedule({ ...job, receipt: { userId: job.userId, tier: "free" } }); await fixture.run();
  assert.equal(fixture.calls.filter(call => call.kind === "usage").length, 1);
  assert.equal(fixture.calls.some(call => call.kind === "finalize"), false);
});
