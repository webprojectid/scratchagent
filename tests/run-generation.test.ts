import * as recovery from "../src/lib/generation-recovery";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as checkpoints from "../src/lib/generation-checkpoint";
import * as outputContract from "../src/lib/generation-output";

function scheduler(fail: boolean | Error = false, ownsLease = true, registrationFails = false, split = false, readFails = false, initialWork: unknown = null) {
  let clock = 1000000;
  const calls: { kind: string; args: unknown[] }[] = [];
  let work: (() => Promise<void>) | undefined;
  let saved: unknown = initialWork;
  const record = (kind: string) => async (...args: unknown[]) => { calls.push({ kind, args }); };
  const mocks: Record<string, unknown> = {
    "./generation-recovery": { nextGenerationFailure: (previous: Parameters<typeof recovery.nextGenerationFailure>[0]) => recovery.nextGenerationFailure(previous, clock), canResumeGeneration: (previous: Parameters<typeof recovery.canResumeGeneration>[0]) => recovery.canResumeGeneration(previous, clock) },
    "./generation-checkpoint": checkpoints,
    "./generation-output": outputContract,
    "./generation-checkpoint-store": { getGenerationWork: async () => { if (readFails) throw new Error("Storage unavailable"); return saved; }, saveGenerationWork: async (_id: string, value: unknown) => { saved = structuredClone(value); calls.push({ kind: "checkpoint", args: [] }); }, clearGenerationWork: record("clear") },
    "./generation-lease": { claimGeneration: async () => "lease", releaseGeneration: record("release"), withGenerationLease: async (_plan: string, _stage: string, _token: string, action: () => Promise<void>) => ownsLease ? action() : null, reserveGenerationAttempt: async () => true },
    "next/server": { after: (callback: () => Promise<void>) => { if (registrationFails) throw new Error("Fixture scheduling failure"); work = callback; } },
    "./generate": { generatePlanStructure: async () => {
      if (fail) throw fail instanceof Error ? fail : new Error("Fixture failure");
      if (split) for (const section of ["outline", "requirements"]) await checkpoints.checkpointedSection(section, section, undefined, async () => section);
      return { title: "Fixture", stack: [], features: [], usage: { tokensIn: 2, tokensOut: 3 } };
    } },
    "./storage": { getPlan: async () => ({ status: "generating", features: [] }), savePlan: record("save"), deletePlan: record("delete"), updatePlanTitle: record("title") },
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
  return { advanceClock: () => { clock += 70000; }, calls, savedWork: () => saved, schedule: fixtureModule.exports.scheduleGeneration, run: async () => { assert.ok(work); await work(); } };
}
const job = { planId: "fixture-plan", ownerId: "fixture-owner", userId: "fixture-user", tier: "free", brief: "Fixture", techPrefs: { mode: "auto" }, answers: [], receipt: { userId: "fixture-user", tier: "free", eventId: "fixture-receipt" } };

test("an exhausted targeted validation repair pauses once instead of starting three fresh loops", async () => {
  const fixture = scheduler(new outputContract.GenerationOutputRejected('database', ['Missing canonical room table']));
  await fixture.schedule(job); await fixture.run();
  const saved = fixture.savedWork() as { failure: recovery.GenerationFailure };
  assert.equal(saved.failure.paused, true);
  assert.equal(saved.failure.attempts, 1);
  assert.match(saved.failure.message, /database/);
  assert.equal(fixture.calls.filter(call => call.kind === 'refund').length, 1);
  fixture.advanceClock();
  assert.equal(await fixture.schedule(job), false);
  assert.equal(fixture.calls.filter(call => call.kind === 'refund').length, 1);
});

test("a successful section resets prior provider failures before the next section", async () => {
  const fixture = scheduler(false, true, false, true, false, {
    checkpoint: checkpoints.emptyGenerationCheckpoint(), receipt: job.receipt,
    failure: { attempts: 2, paused: false, retryAt: 0, message: "Temporary provider failure" },
  });
  await fixture.schedule(job); await fixture.run();
  assert.equal((fixture.savedWork() as { failure?: unknown }).failure, undefined);
  assert.equal(fixture.calls.some(call => call.kind === "refund"), false);
});

test("successful background generation preserves owner and finalizes quota once", async () => {
  const fixture = scheduler(); await fixture.schedule(job); await fixture.run();
  assert.equal(fixture.calls.find(call => call.kind === "save")?.args[1], job.ownerId);
  assert.equal(fixture.calls.filter(call => call.kind === "finalize").length, 1);
  assert.equal(fixture.calls.some(call => call.kind === "refund" || call.kind === "delete"), false);
});

test("the quota receipt is durable before the initial background callback begins", async () => {
  const fixture = scheduler();
  await fixture.schedule(job);
  assert.equal((fixture.savedWork() as { receipt: { eventId: string } }).receipt.eventId, job.receipt.eventId);
  assert.equal(fixture.calls.some(call => call.kind === "save" || call.kind === "finalize"), false);
});

test("a paused generation keeps its reservation and resumes using the original receipt", async () => {
  const fixture = scheduler(false, true, false, true);
  await fixture.schedule(job); await fixture.run();
  assert.equal(fixture.calls.some(call => ["save", "refund", "delete", "finalize"].includes(call.kind)), false);
  await fixture.schedule({ ...job, receipt: { userId: job.userId, tier: "free" } }); await fixture.run();
  assert.equal(fixture.calls.filter(call => call.kind === "finalize").length, 1);
  assert.equal((fixture.calls.find(call => call.kind === "finalize")?.args[0] as { eventId: string }).eventId, job.receipt.eventId);
  assert.equal(fixture.calls.some(call => call.kind === "usage" || call.kind === "refund"), false);
});

test("a checkpoint read failure preserves the plan and its original reservation for retry", async () => {
  const fixture = scheduler(false, true, false, false, true);
  await assert.rejects(fixture.schedule({ ...job, receipt: { userId: job.userId, tier: "free" } }), /Storage unavailable/);
  assert.equal(fixture.calls.some(call => ["refund", "delete", "clear", "save"].includes(call.kind)), false);
});
test("failed generation preserves accepted work and its reservation during bounded recovery", async () => {
  const fixture = scheduler(true); await fixture.schedule(job); await fixture.run();
  const saved = fixture.savedWork() as { failure: { attempts: number; paused: boolean } };
  assert.equal(saved.failure.attempts, 1);
  assert.equal(saved.failure.paused, false);
  assert.equal(fixture.calls.some(call => ["refund", "delete", "clear", "finalize"].includes(call.kind)), false);
  assert.equal(await fixture.schedule(job), false, "backoff prevents repeated polling from generating calls");
});
test("a watchdog retry records usage without finalizing an old receipt again", async () => {
  const fixture = scheduler(); await fixture.schedule({ ...job, receipt: { userId: job.userId, tier: "free" } }); await fixture.run();
  assert.equal(fixture.calls.filter(call => call.kind === "usage").length, 1);
  assert.equal(fixture.calls.some(call => call.kind === "finalize"), false);
});

test("a superseded worker cannot save, refund, or delete its replacement's plan", async () => {
  for (const fail of [false, true]) {
    const fixture = scheduler(fail, false);
    if (await fixture.schedule(job)) await fixture.run();
    assert.equal(fixture.calls.some(call => ["save", "refund", "delete", "finalize"].includes(call.kind)), false);
    assert.equal(fixture.calls.filter(call => call.kind === "release").length, 1);
  }
});

test("failed background registration releases the lease for a later retry", async () => {
  const fixture = scheduler(false, true, true);
  await assert.rejects(fixture.schedule(job), /scheduling failure/);
  assert.equal(fixture.calls.filter(call => call.kind === "release").length, 1);
});

test("three failures pause generation, refund exactly once and retain its checkpoint", async () => {
  const fixture = scheduler(true);
  for (let attempt = 0; attempt < 3; attempt++) { assert.equal(await fixture.schedule(job), true); await fixture.run(); fixture.advanceClock(); }
  const saved = fixture.savedWork() as { failure: { attempts: number; paused: boolean }; checkpoint: unknown };
  assert.equal(saved.failure.attempts, 3); assert.equal(saved.failure.paused, true); assert.ok(saved.checkpoint);
  assert.equal(fixture.calls.filter(call => call.kind === "refund").length, 1);
  assert.equal(await fixture.schedule(job), false);
  assert.equal(fixture.calls.filter(call => call.kind === "refund").length, 1);
  assert.equal(fixture.calls.some(call => call.kind === "delete" || call.kind === "clear"), false);
});
