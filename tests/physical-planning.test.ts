import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { generatePhysicalPlan, validatePhysicalEngineering, validatePhysicalFoundation, validatePhysicalRoadmap } from "@/lib/physical-generation";
import { physicalDefaults, physicalDraftSchema, physicalInputSchema, physicalSource } from "@/lib/physical-domain";
import { checkpointedSection, emptyGenerationCheckpoint, runGenerationSlice } from "@/lib/generation-checkpoint";
import { defaultHandoff, effectiveTechPrefs } from "@/lib/account-preferences";
import { renderAgentHandoff, renderPrdMd, createZip } from "@/lib/zip";
import { physicalExportFiles } from "@/lib/physical-document";
import { physicalTaskIssues, nextPhysicalTask } from "@/lib/physical-tasks";
import { physicalMetadata, hydratePhysical } from "@/lib/physical-storage";
import { savePlan, getPlan, allTasks } from "@/lib/storage";
import { startTask, completeTask, failTask, retryTask, ensureQaPhase } from "@/lib/tasks";
import { switchProjectDraft } from "@/lib/project-draft";
import { changePhysicalEvidence } from "@/lib/physical-evidence";
import type { callLlm } from "@/lib/generate";
import type { Plan, Task } from "@/lib/types";
import { physicalBrief, physicalInput, physicalFoundation, physicalEngineering, physicalPhases, physicalOutline } from "./fixtures/physical-plan";

function fixtureProvider() {
  const calls: string[] = [];
  const provider: typeof callLlm = async (schema, prompt, usage, options = {}) => checkpointedSection(options.stage ?? "outline", prompt, usage, async tally => {
    calls.push(options.stage ?? "outline");
    assert.match(options.role ?? "", /systems engineer/);
    assert.equal(options.normalization, "contract");
    assert.ok(options.contract?.includes('"properties"'));
    const raw = options.stage === "discovery" ? physicalFoundation : options.stage === "architecture" ? physicalEngineering : options.stage === "outline" ? physicalOutline : prompt.includes('Expand ONLY phase 1:') ? physicalPhases[0] : physicalPhases[1];
    const value = schema.parse(structuredClone(raw));
    assert.deepEqual(options.validate?.(value), []);
    if (tally) { tally.tokensIn += 7; tally.tokensOut += 11; tally.models.push("synthetic-model"); }
    return value;
  });
  return { calls, provider };
}
async function fixturePlan(tier: "free" | "pro" = "free"): Promise<Plan> {
  const result = await generatePhysicalPlan(physicalBrief, physicalInput, tier, defaultHandoff, fixtureProvider().provider);
  return { ...result, features: result.features as unknown as Plan["features"], id: randomUUID(), status: "ready", tier, generationSettings: defaultHandoff };
}

test("hardware draft preserves incomplete manual choices; submission rejects them and unknown categories", () => {
  const draft = { ...physicalDefaults(), choices: { sensors: { mode: "custom", value: "" } } };
  assert.equal(physicalDraftSchema.safeParse(draft).success, true);
  assert.equal(physicalInputSchema.safeParse(draft).success, false);
  assert.equal(physicalInputSchema.safeParse({ ...draft, choices: { frontend: { mode: "manual", value: "React" } } }).success, false);
  assert.equal(physicalInputSchema.safeParse(physicalInput).success, true);
});
test("switching domains preserves the software draft and never shares hardware configuration", () => {
  const values = new Map<string, string>([["rv_prefs", '{"mode":"auto","frontend":"React"}'], ["rv_answers", "software answers"], ["rv_handoff", "software handoff"]]);
  const store = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const original = [...values.entries()];
  switchProjectDraft(store, "software", "software");
  assert.deepEqual([...values.entries()], original);
  switchProjectDraft(store, "software", "physical");
  assert.equal(store.getItem("rv_prefs"), null);
  store.setItem("rv_prefs", '{"domain":"physical"}');
  store.setItem("rv_answers", "hardware answers");
  switchProjectDraft(store, "physical", "software");
  for (const [key, value] of original) assert.equal(store.getItem(key), value);
  switchProjectDraft(store, "software", "physical");
  assert.equal(store.getItem("rv_prefs"), '{"domain":"physical"}');
});
test("hardware does not inherit the account's software stack defaults", () => {
  const settings = { ...defaultHandoff, stack: { frontend: "React", backend: "Node.js", database: "PostgreSQL", deployment: "Vercel" } };
  assert.deepEqual(effectiveTechPrefs({ mode: "auto", domain: "physical", hardware: physicalInput }, settings), { mode: "auto", domain: "physical", hardware: physicalInput });
  assert.equal(effectiveTechPrefs({ mode: "auto" }, settings).frontend, "React");
});
test("grounding preserves quoted briefs and refuses invented facts or ungrounded precision", () => {
  const source = physicalSource(physicalBrief, physicalInput);
  assert.deepEqual(validatePhysicalFoundation(physicalFoundation, source), []);
  const bad = structuredClone(physicalFoundation);
  bad.requirements[0].statement = "The robot must operate for 720 hours.";
  assert.ok(validatePhysicalFoundation(bad, source).some(v => /numeric/.test(v)));
  bad.requirements[0].sourceQuote = "Not present in the brief";
  assert.ok(validatePhysicalFoundation(bad, source).some(v => /exact excerpt/.test(v)));
});
test("manual choices, source status, conditional sections and BOM unknowns survive validation", () => {
  const ids = physicalFoundation.requirements.map(r => r.id);
  assert.deepEqual(validatePhysicalEngineering(physicalEngineering, physicalInput, ids), []);
  const bad = structuredClone(physicalEngineering);
  bad.components[0].unitPrice = 12;
  assert.ok(validatePhysicalEngineering(bad, physicalInput, ids).some(v => /prices/.test(v)));
  bad.sections = bad.sections.filter(s => s.id !== "interfaces");
  assert.ok(validatePhysicalEngineering(bad, physicalInput, ids).some(v => /interfaces/.test(v)));
  bad.sections.find(s => s.id === "learning")!.applicability = "required";
  assert.ok(validatePhysicalEngineering(bad, physicalInput, ids).some(v => /excluded/.test(v)));
});
test("physical roadmap rejects fake AI-only assembly, missing coverage, unknown dependencies and cycles", () => {
  const raw = structuredClone({ phases: [physicalPhases[1]] });
  raw.phases[0].packages[0].tasks[0].executor = "ai" as never;
  raw.phases[0].packages[0].tasks[0].deps = ["T01"] as never;
  const issues = validatePhysicalRoadmap(raw, ["R01", "R02", "R03"], "free");
  assert.ok(issues.some(v => /human/.test(v)));
  assert.ok(issues.some(v => /cycle/.test(v)));
  assert.ok(issues.some(v => /R03/.test(v)));
});
test("both tiers generate a hardware contract with checkpointed per-phase calls, stable IDs and no software QA injection", async () => {
  for (const tier of ["free", "pro"] as const) {
    const checkpoint = emptyGenerationCheckpoint(), mock = fixtureProvider();
    let result: Awaited<ReturnType<typeof generatePhysicalPlan>> | undefined;
    for (let i = 0; i < 8 && !result; i++) {
      const slice = await runGenerationSlice(checkpoint, async () => {}, () => generatePhysicalPlan(physicalBrief, physicalInput, tier, defaultHandoff, mock.provider), { concurrency: 3 });
      if (slice.done) result = slice.value;
    }
    assert.ok(result);
    assert.deepEqual(mock.calls.sort(), ["architecture", "discovery", "outline", "tasks", "tasks"].sort());
    assert.equal(result.usage.tokensIn, 35);
    assert.equal(result.databaseSchema, "");
    assert.equal(result.productSpec, undefined);
    const plan = { ...result, id: randomUUID(), status: "ready", features: result.features as unknown as Plan["features"] } as Plan;
    assert.equal(ensureQaPhase(plan).changed, false);
    const tasks = allTasks(plan) as Task[];
    assert.equal(tasks[0].layer, "firmware"); assert.equal(tasks[1].layer, "assembly");
    assert.deepEqual(tasks[1].deps, [tasks[0].ref]);
    assert.ok(tasks.every(task => task.hardware?.evidence.length === 0));
    const meta = physicalMetadata(plan); const features = structuredClone(plan.features);
    features.forEach(f => f.subFeatures.forEach(w => w.tasks.forEach(t => { t.hardware = undefined; t.layer = "qa"; })));
    hydratePhysical(features, meta);
    assert.equal(features[0].subFeatures[0].tasks[0].layer, "firmware");
  }
});
test("exports keep BOM formula-safe and planned artifacts separate from executed files", async () => {
  const plan = await fixturePlan();
  plan.physical!.spec!.components[0].candidate = "=IMPORTDATA(unsafe)";
  const files = physicalExportFiles(plan);
  assert.match(files.find(f => f.name === "BOM.csv")!.content, /'=IMPORTDATA/);
  const manifest = JSON.parse(files.find(f => f.name === "artifacts-manifest.json")!.content);
  assert.ok(manifest.artifacts.every((a: { status: string }) => a.status === "planned"));
  assert.match(renderPrdMd(plan), /Verification|verification/);
  assert.doesNotMatch(renderPrdMd(plan), /## 6\. Database Schema/);
  assert.match(renderAgentHandoff(plan), /physical validation/);
  assert.ok(createZip(plan).byteLength > 1000);
});
test("execution requires real evidence, refuses agent human review, handles replay and invalidates downstream revisions", async () => {
  delete process.env.DATABASE_URL;
  const plan = await fixturePlan();
  const human = { id: "synthetic-owner", type: "human" as const }, agent = { id: "synthetic-agent", type: "agent" as const };
  await savePlan(plan, "synthetic-owner@example.test");
  const [digital, physical] = allTasks(plan) as Task[];
  assert.equal(nextPhysicalTask(plan, agent).task?.ref, digital.ref);
  await startTask(plan.id, digital.ref, agent);
  await assert.rejects(completeTask(plan.id, digital.ref, agent), /evidence/);
  await changePhysicalEvidence(plan.id, digital.ref, { action: "evidence", revision: 1, report: "Synthetic test result remains inconclusive." }, agent);
  await assert.rejects(completeTask(plan.id, digital.ref, agent), /passing/);
  const requestId = randomUUID();
  const record = { action: "evidence" as const, outcome: "pass" as const, revision: 1, report: "Synthetic digital test result recorded by the offline harness.", requestId };
  await changePhysicalEvidence(plan.id, digital.ref, record, agent);
  await changePhysicalEvidence(plan.id, digital.ref, record, agent);
  assert.equal((allTasks((await getPlan(plan.id))!) as Task[])[0].hardware!.evidence.length, 2);
  await completeTask(plan.id, digital.ref, agent);
  const afterDigital = (await getPlan(plan.id))!;
  assert.equal(nextPhysicalTask(afterDigital, agent).done, false);
  assert.ok(nextPhysicalTask(afterDigital, agent).waiting?.some(v => v.reason === "human"));
  await assert.rejects(startTask(plan.id, physical.ref, agent), /human/);
  await startTask(plan.id, physical.ref, human);
  await assert.rejects(changePhysicalEvidence(plan.id, physical.ref, { ...record, requestId: randomUUID() }, agent), /human/);
  await changePhysicalEvidence(plan.id, physical.ref, { ...record, requestId: randomUUID(), report: "Synthetic human-reported observation; not an actual physical test." }, human);
  await assert.rejects(completeTask(plan.id, physical.ref, human), /review/);
  await assert.rejects(changePhysicalEvidence(plan.id, physical.ref, { action: "review", revision: 1 }, agent), /human/);
  await changePhysicalEvidence(plan.id, physical.ref, { action: "review", revision: 1 }, human);
  await completeTask(plan.id, physical.ref, human);
  assert.equal((await getPlan(plan.id))!.status, "done");
  await changePhysicalEvidence(plan.id, digital.ref, { action: "invalidate", revision: 1 }, human);
  const updated = (await getPlan(plan.id))!;
  assert.equal(updated.status, "implementing");
  assert.ok((allTasks(updated) as Task[]).every(t => t.status === "pending" && t.hardware!.invalidated && t.hardware!.revision === 2));
  assert.equal(nextPhysicalTask(updated, agent).done, false);
  await assert.rejects(changePhysicalEvidence(plan.id, digital.ref, { action: "review", revision: 1 }, human), /revision/);
  assert.ok(physicalTaskIssues((allTasks(updated) as Task[])[0], "complete", human).some(v => /evidence/.test(v)));
});
test("a failed hardware attempt cannot reuse a passing result from its earlier revision", async () => {
  delete process.env.DATABASE_URL;
  const plan = await fixturePlan();
  const agent = { id: "synthetic-agent", type: "agent" as const };
  await savePlan(plan, "synthetic-owner@example.test");
  const task = (allTasks(plan) as Task[])[0];
  await startTask(plan.id, task.ref, agent);
  await changePhysicalEvidence(plan.id, task.ref, { action: "evidence", revision: 1, outcome: "pass", report: "Synthetic earlier passing test before the failure." }, agent);
  await failTask(plan.id, task.ref, "Synthetic later test failed", agent);
  await retryTask(plan.id, task.ref, agent);
  await startTask(plan.id, task.ref, agent);
  await assert.rejects(completeTask(plan.id, task.ref, agent), /revision 2/);
});
test("a parked physical task allows independent digital work without reporting the plan done", async () => {
  delete process.env.DATABASE_URL;
  const plan = await fixturePlan();
  const [digital, physical] = allTasks(plan) as Task[];
  physical.phase = 1; physical.deps = [];
  digital.phase = 2; digital.deps = [];
  await savePlan(plan, "synthetic-owner@example.test");
  const human = { id: "synthetic-owner", type: "human" as const }, agent = { id: "synthetic-agent", type: "agent" as const };
  await startTask(plan.id, physical.ref, human);
  await changePhysicalEvidence(plan.id, physical.ref, { action: "wait", revision: 1, reason: "parts" }, human);
  assert.equal(nextPhysicalTask((await getPlan(plan.id))!, agent).task?.ref, digital.ref);
  await startTask(plan.id, digital.ref, agent);
  assert.equal((await getPlan(plan.id))!.status, "implementing");
});
