import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import ts from "typescript";

test("independent route bundles share memory generation leases, budgets and mutation locks", async () => {
  const shared = {};
  function load<T>(file: string, mocks: Record<string, unknown>): T {
    const mod = { exports: {} };
    const output = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(output, { module: mod, exports: mod.exports, globalThis: shared, process: { env: {} }, require: (name: string) => { assert.ok(name in mocks, name); return mocks[name]; } });
    return mod.exports as T;
  }
  const unexpected = () => { throw new Error("Unexpected database operation"); };
  const mutationMocks = { "drizzle-orm": {}, "@/db": { getDb: unexpected, withDatabaseTransaction: unexpected } };
  const firstMutation = load<typeof import("@/lib/plan-mutation")>("src/lib/plan-mutation.ts", mutationMocks);
  const secondMutation = load<typeof import("@/lib/plan-mutation")>("src/lib/plan-mutation.ts", mutationMocks);
  const leaseMocks = (mutation: typeof firstMutation) => ({ "node:crypto": { randomUUID }, "drizzle-orm": {}, "@/db": { getDb: unexpected }, "@/db/schema": {}, "./plan-mutation": mutation });
  const first = load<typeof import("@/lib/generation-lease")>("src/lib/generation-lease.ts", leaseMocks(firstMutation));
  const second = load<typeof first>("src/lib/generation-lease.ts", leaseMocks(secondMutation));
  const token = await first.claimGeneration("synthetic-plan", "structure");
  assert.ok(token);
  assert.equal(await second.claimGeneration("synthetic-plan", "structure"), null);
  assert.equal(await second.ownsGeneration("synthetic-plan", "structure", token), true);
  await second.releaseGeneration("synthetic-plan", "structure", token);
  assert.ok(await first.claimGeneration("synthetic-plan", "structure"));
  for (let i = 0; i < 200; i++) assert.equal(await (i % 2 ? first : second).reserveGenerationAttempt("synthetic-account", "pro"), true);
  assert.equal(await first.reserveGenerationAttempt("synthetic-account", "pro"), false);
  assert.equal(await second.reserveGenerationAttempt("synthetic-account", "pro"), false);
  let release!: () => void, started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const events: string[] = [];
  const pending = firstMutation.withPlanMutation("synthetic-mutation", async () => { events.push("first"); started(); await barrier; events.push("released"); });
  await ready;
  const waiting = secondMutation.withPlanMutation("synthetic-mutation", async () => { events.push("second"); });
  await Promise.resolve();
  assert.deepEqual(events, ["first"]);
  release();
  await Promise.all([pending, waiting]);
  assert.deepEqual(events, ["first", "released", "second"]);
});
