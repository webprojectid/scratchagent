import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function moduleFixture(path: string, mocks: Record<string, unknown>, environment = {}) {
  const fixtureModule = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> };
  const output = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; }, process: { env: environment }, Date, Map, console });
  return fixtureModule.exports;
}
test("quota check and reservation serialize the last Free slot across transactions", async () => {
  let usages = 2;
  let queue = Promise.resolve();
  const db = { transaction: async (operation: (tx: unknown) => Promise<void>) => {
    let release: (() => void) | undefined;
    const tx = {
      execute: async () => { const previous = queue; queue = new Promise<void>(resolve => { release = resolve; }); await previous; },
      select: () => ({ from: () => ({ where: async () => { const count = usages; await Promise.resolve(); return Array.from({ length: count }, (_, index) => ({ id: index })); } }) }),
      insert: () => ({ values: () => ({ returning: async () => [{ id: `usage-${++usages}` }] }) }),
    };
    try { await operation(tx); } finally { release?.(); }
  } };
  const quota = moduleFixture("src/lib/quota.ts", { "@/db": { getDb: () => db }, "@/db/schema": { usageEvents: {} }, "drizzle-orm": { sql: () => ({}), and: () => {}, eq: () => {}, gte: () => {} }, "@/lib/memory-store": {} }, { DATABASE_URL: "fixture", QUOTA_GENERATE_DAILY: "3" });
  const receipts = await Promise.all([quota.consumeQuota("owner"), quota.consumeQuota("owner")]);
  assert.equal(receipts.filter(Boolean).length, 1);
  assert.equal(usages, 3);
});
test("finalization does not mark Ready when saving generated tasks fails", async () => {
  const writes: string[] = [];
  const finalizer = moduleFixture("src/lib/generated-plan.ts", {
    "./plan-mutation": { withPlanMutation: async (_id: string, work: () => Promise<void>) => work() },
    "./storage": { savePlan: async () => { throw new Error("Fixture insert failure"); }, updatePlanStatus: async () => writes.push("ready") },
    "./tasks": {},
    "./generation-lease": {},
  });
  await assert.rejects(finalizer.finalizeGeneratedPlan({ id: "fixture" }, "owner"), /insert failure/);
  assert.deepEqual(writes, []);
});
test("task mutation returns updated status with detached database snapshots", async () => {
  let status = "pending";
  const snapshot = () => ({ ref: "A", title: "Fixture", status, deps: [], layer: "frontend", phase: 1 });
  const tasks = moduleFixture("src/lib/tasks.ts", {
    "./plan-mutation": { withPlanMutation: async (_id: string, work: () => Promise<void>) => work() },
    "./storage": { findTask: async () => ({ task: snapshot(), plan: { id: "fixture", status: "ready", features: [{ subFeatures: [{ tasks: [snapshot()] }] }] } }), allTasks: (plan: { features: { subFeatures: { tasks: unknown[] }[] }[] }) => plan.features.flatMap(feature => feature.subFeatures.flatMap(sub => sub.tasks)), updateTask: async (_id: string, _ref: string, patch: { status: string }) => { status = patch.status; return true; }, syncFeatureStatuses: async () => {}, updatePlanStatus: async () => {} },
  });
  const result = await tasks.startTask("fixture", "A") as { status: string };
  assert.equal(result.status, "in_progress");
  assert.equal(status, "in_progress");
});
