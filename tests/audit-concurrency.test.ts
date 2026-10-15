import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { Plan, Task } from "../src/lib/types";

function moduleFixture(path: string, mocks: Record<string, unknown>, environment = {}) {
  const fixtureModule = { exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>> };
  const output = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; }, process: { env: environment }, Date, Map, console });
  return fixtureModule.exports;
}

function generatedPlan(): Plan {
  return {
    id: "fixture",
    title: "Fixture",
    brief: "Kelola akun dan ruang kerja",
    stack: [],
    asumsi: [],
    status: "generating",
    tier: "free",
    userId: "owner",
    features: Array.from({ length: 4 }, (_, index) => ({
      id: `feature-${index + 1}`,
      slug: `fase-${index + 1}`,
      title: `Fase ${index + 1}`,
      icon: "",
      description: "",
      tujuan: "",
      selesaiBila: [],
      status: "direncanakan" as const,
      subFeatures: Array.from({ length: 3 }, (_, subIndex) => ({ title: `Bagian ${index + 1}.${subIndex + 1}`, tasks: [] as Task[] })),
    })),
  };
}

function generatedTask(featureIndex: number): Task {
  return {
    ref: `F${String(featureIndex + 1).padStart(2, "0")}-S01-T01`,
    title: `Simpan data fase ${featureIndex + 1}`,
    layer: "backend",
    phase: featureIndex + 1,
    page: null,
    deps: [],
    status: "pending",
  };
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
  const plan = generatedPlan();
  const finalizer = moduleFixture("src/lib/generated-plan.ts", {
    "./plan-mutation": { withPlanMutation: async (_id: string, work: () => Promise<void>) => work() },
    "./storage": { getPlan: async () => structuredClone(plan), savePlan: async () => { throw new Error("Fixture insert failure"); }, updatePlanStatus: async () => writes.push("ready") },
    "./tasks": {},
    "./generation-lease": {},
    "./generation-quality": { validateFinalPlan: () => [] },
    "./qa-labels": { isAutomaticQaSubFeature: () => false },
  });
  await assert.rejects(finalizer.finalizeGeneratedPlan(plan, "owner"), /insert failure/);
  assert.deepEqual(writes, []);
});

test("parallel feature finalization preserves generated tasks from both stale snapshots", async () => {
  let persisted = generatedPlan();
  const first = structuredClone(persisted);
  const second = structuredClone(persisted);
  first.features[0].subFeatures[0].tasks.push(generatedTask(0));
  second.features[1].subFeatures[0].tasks.push(generatedTask(1));

  let previous = Promise.resolve();
  const finalizer = moduleFixture("src/lib/generated-plan.ts", {
    "./plan-mutation": { withPlanMutation: async (_id: string, work: () => Promise<unknown>) => {
      const running = previous.then(work);
      previous = running.then(() => {}, () => {});
      return running;
    } },
    "./storage": {
      getPlan: async () => structuredClone(persisted),
      savePlan: async (plan: Plan) => { await Promise.resolve(); persisted = structuredClone(plan); },
      updatePlanStatus: async () => { throw new Error("Plan with unfinished phases cannot be ready"); },
    },
    "./tasks": { ensureQaPhase: () => ({ changed: false, ready: false }) },
    "./generation-lease": { ownsGeneration: async () => true },
    "./generation-quality": { validateFinalPlan: () => [] },
    "./qa-labels": { isAutomaticQaSubFeature: () => false },
  });

  const results = await Promise.all([
    finalizer.finalizeGeneratedPlan(first, "owner", { stage: "feature-0", token: "lease-a" }),
    finalizer.finalizeGeneratedPlan(second, "owner", { stage: "feature-1", token: "lease-b" }),
  ]);
  assert.deepEqual(results, [true, true]);
  assert.deepEqual(persisted.features[0].subFeatures[0].tasks.map((task) => task.ref), [generatedTask(0).ref]);
  assert.deepEqual(persisted.features[1].subFeatures[0].tasks.map((task) => task.ref), [generatedTask(1).ref]);
});

test("task mutation returns updated status with detached database snapshots", async () => {
  let status = "pending";
  const snapshot = () => ({ ref: "A", title: "Fixture", status, deps: [], layer: "frontend", phase: 1 });
  const tasks = moduleFixture("src/lib/tasks.ts", {
    "./plan-mutation": { withPlanMutation: async (_id: string, work: () => Promise<void>) => work() },
    "./plan-limits": { structureLimits: () => ({ features: [4, 8], subFeatures: [3, 5], tasks: [8, 12] }) },
    "./storage": { findTask: async () => ({ task: snapshot(), plan: { id: "fixture", status: "ready", features: [{ subFeatures: [{ tasks: [snapshot()] }] }] } }), allTasks: (plan: { features: { subFeatures: { tasks: unknown[] }[] }[] }) => plan.features.flatMap(feature => feature.subFeatures.flatMap(sub => sub.tasks)), updateTask: async (_id: string, _ref: string, patch: { status: string }) => { status = patch.status; return true; }, syncFeatureStatuses: async () => {}, updatePlanStatus: async () => {} },
    "./qa-labels": { isAutomaticQaSubFeature: () => false },
  });
  const result = await tasks.startTask("fixture", "A") as { status: string };
  assert.equal(result.status, "in_progress");
  assert.equal(status, "in_progress");
});
