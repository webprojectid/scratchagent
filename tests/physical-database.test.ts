import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import * as quality from "@/lib/task-spec";
import * as hardware from "@/lib/physical-storage";
import * as diagrams from "@/lib/arch-fallback";
import * as qa from "@/lib/qa-labels";
import * as metrics from "@/lib/generation-metrics";
import type { Plan } from "@/lib/types";
import { physicalBrief, physicalInput, physicalFoundation, physicalEngineering } from "./fixtures/physical-plan";

test("physical migration preserves software rows and round-trips hardware disciplines, metadata and evidence in PostgreSQL", { timeout: 60_000 }, async () => {
  const pg = new PGlite();
  try {
    await pg.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    for (const entry of journal.entries) await pg.exec(readFileSync(`drizzle/${entry.tag}.sql`, "utf8"));
    const db = drizzle(pg);
    const owner = randomUUID(), other = randomUUID(), planId = randomUUID();
    await pg.query("INSERT INTO users(id,email) VALUES($1,$2),($3,$4)", [owner, "physical-db@example.test", other, "other-db@example.test"]);
    const legacySubscription = await pg.query<{tier:string}>("INSERT INTO subscriptions(user_id) VALUES($1) RETURNING tier",[owner]);
    assert.equal(legacySubscription.rows[0].tier,"pro");
    const maxSubscription = await pg.query<{tier:string}>("INSERT INTO subscriptions(user_id,tier) VALUES($1,'max') RETURNING tier",[other]);
    assert.equal(maxSubscription.rows[0].tier,"max");
    const require = createRequire(import.meta.url);
    const mocks: Record<string, unknown> = {
      "@/db": { getDb: () => db, withDatabaseTransaction: async (operation: () => Promise<unknown>) => operation() }, "@/db/schema": schema,
      "./plan-mutation": { withPlanMutation: async (_id: string, operation: () => Promise<unknown>) => operation() },
      "./task-spec": quality, "./physical-storage": hardware, "./arch-fallback": diagrams, "./qa-labels": qa, "./generation-metrics": metrics,
      "./account-store": { getProjectGenerationSettings: async () => null }, "./memory-store": {}, "./demo": {},
    };
    const fixtureModule = { exports: {} };
    const output = ts.transpileModule(readFileSync("src/lib/storage.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    runInNewContext(output, { module: fixtureModule, exports: fixtureModule.exports, process: { env: { DATABASE_URL: "offline-postgres" } }, crypto: globalThis.crypto, console, Date, Buffer, require: (name: string) => name in mocks ? mocks[name] : require(name) });
    const storage = fixtureModule.exports as typeof import("@/lib/storage");
    const plan: Plan = { id: planId, title: "Synthetic physical storage", brief: physicalBrief, stack: [], asumsi: [], status: "ready", physical: { version: 1, revision: 1, input: physicalInput, spec: { ...physicalFoundation, ...physicalEngineering } }, features: [{ slug: "assembly", title: "Assembly", icon: "settings", description: "Synthetic plan", tujuan: "Check storage", selesaiBila: [], status: "direncanakan", subFeatures: [{ title: "Review", tasks: [{ ref: "F01-S01-T01", title: "Synthetic physical review", layer: "assembly", phase: 1, deps: [], page: null, status: "in_progress", hardware: { discipline: "assembly", executor: "human", tools: [], inputs: [], evidenceKind: "physical", evidence: [], reviewRequired: true, revision: 1 } }] }] }] };
    await storage.savePlan(plan, owner);
    const progressModule = { exports: {} as typeof import("@/lib/plan-progress") };
    const progressOutput = ts.transpileModule(readFileSync("src/lib/plan-progress.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(progressOutput, { module: progressModule, exports: progressModule.exports, process: { env: { DATABASE_URL: "synthetic-test" } }, require: (name: string) => mocks[name] ?? require(name) });
    const progress = await progressModule.exports.getProgressRevision(planId);
    assert.deepEqual(progress?.physical, plan.physical, "Database progress must retain hardware classification for the Max access gate.");
    assert.equal((await pg.query<{ layer: string | null }>("SELECT layer FROM tasks WHERE plan_id=$1", [planId])).rows[0].layer, null);
    assert.equal((await storage.getPlan(planId))!.features[0].subFeatures[0].tasks[0].layer, "assembly");
    assert.equal((await storage.getPlan(planId))!.databaseSchema, "");
    assert.equal((await storage.listPlans(other)).length, 0);
    const h = structuredClone(plan.features[0].subFeatures[0].tasks[0].hardware!);
    h.evidence.push({ id: randomUUID(), kind: "physical", outcome: "pass", report: "Synthetic human report, not an executed device test.", actor: owner, actorType: "human", revision: 1, createdAt: new Date().toISOString() });
    assert.equal(await storage.updateTask(planId, "F01-S01-T01", { hardware: h, status: "in_progress" }, "in_progress"), true);
    assert.equal((await storage.getPlan(planId))!.features[0].subFeatures[0].tasks[0].hardware!.evidence.length, 1);
    await storage.savePlan(plan, owner);
    assert.equal((await storage.getPlan(planId))!.features[0].subFeatures[0].tasks[0].hardware!.evidence.length, 1, "An older document save must not overwrite current evidence.");
    const layer = await pg.query<{ is_nullable: string }>("SELECT is_nullable FROM information_schema.columns WHERE table_name='tasks' AND column_name='layer'");
    assert.equal(layer.rows[0].is_nullable, "YES");
    const software: Plan = { ...plan, id: randomUUID(), physical: undefined, features: structuredClone(plan.features) };
    const task = software.features[0].subFeatures[0].tasks[0]; task.hardware = undefined; task.layer = "frontend";
    await storage.savePlan(software, owner);
    assert.equal((await progressModule.exports.getProgressRevision(software.id))?.physical, undefined);
    assert.equal((await pg.query<{ layer: string }>("SELECT layer FROM tasks WHERE plan_id=$1", [software.id])).rows[0].layer, "frontend");
  } finally { await pg.close(); }
});
