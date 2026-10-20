import { test } from "node:test";
import assert from "node:assert/strict";
import { checkpointedSection, emptyGenerationCheckpoint, runGenerationSlice, type GenerationCheckpoint, type GenerationUsage } from "../src/lib/generation-checkpoint";
import { schemaRepairFeedback } from "../src/lib/generation-contract";
import { z } from "zod";

test("serialized slices resume accepted sections without repeat calls or duplicate usage", async () => {
  let checkpoint = emptyGenerationCheckpoint();
  const calls: string[] = [];
  let lastUsage: GenerationUsage | undefined;
  const operation = async () => {
    const usage = { tokensIn: 0, tokensOut: 0, models: [] as string[] };
    const section = (stage: string) => checkpointedSection(stage, stage, usage, async () => {
      calls.push(stage); usage.tokensIn += 10; usage.tokensOut += 20;
      if (!usage.models.includes("gemini")) usage.models.push("gemini");
      return { text: stage };
    });
    const outline = await section("outline");
    const rest = await Promise.all([section("architecture"), section("requirements")]);
    lastUsage = usage;
    return [outline, ...rest];
  };
  let result;
  for (let slice = 0; slice < 4; slice++) {
    const before = calls.length;
    result = await runGenerationSlice(checkpoint, async saved => { checkpoint = JSON.parse(JSON.stringify(saved)) as GenerationCheckpoint; }, operation);
    assert.ok(calls.length - before <= 1);
    if (result.done) break;
  }
  assert.equal(result?.done, true);
  assert.deepEqual(calls, ["outline", "architecture", "requirements"]);
  assert.deepEqual(lastUsage, { tokensIn: 30, tokensOut: 60, models: ["gemini"] });
});

test("failed persistence and failed model calls cannot masquerade as saved progress", async () => {
  const checkpoint = emptyGenerationCheckpoint();
  await assert.rejects(runGenerationSlice(checkpoint, async () => { throw new Error("storage unavailable"); }, () => checkpointedSection("outline", "brief", undefined, async () => "accepted")), /storage unavailable/);
  const fresh = emptyGenerationCheckpoint();
  await assert.rejects(runGenerationSlice(fresh, async () => {}, () => checkpointedSection("outline", "brief", undefined, async () => { throw new Error("gateway unavailable"); })), /gateway unavailable/);
  assert.equal(Object.keys(fresh.entries).length, 0);
});

test("the running backend stage is persisted before the model responds and cleared after acceptance", async () => {
  let checkpoint = emptyGenerationCheckpoint();
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const persist = async (saved: GenerationCheckpoint) => { checkpoint = structuredClone(saved); };
  const run = runGenerationSlice(checkpoint, persist, () => checkpointedSection("discovery", "brief", undefined, async () => {
    await waiting;
    return "accepted";
  }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(checkpoint.activeStage, "discovery");
  assert.equal(Object.keys(checkpoint.entries).length, 0);
  release();
  assert.equal((await run).done, true);
  assert.equal(checkpoint.activeStage, undefined);
  assert.equal(Object.values(checkpoint.entries)[0].stage, "discovery");
});

test("different prompts and independent projects never reuse another result", async () => {
  const checkpoint = emptyGenerationCheckpoint();
  let count = 0;
  const section = (prompt: string) => checkpointedSection("outline", prompt, undefined, async () => ++count);
  assert.equal((await runGenerationSlice(checkpoint, async () => {}, () => section("a"))).done, true);
  assert.equal((await runGenerationSlice(checkpoint, async () => {}, () => section("b"))).done, true);
  await Promise.all([runGenerationSlice(emptyGenerationCheckpoint(), async () => {}, () => section("a")), runGenerationSlice(emptyGenerationCheckpoint(), async () => {}, () => section("a"))]);
  assert.equal(count, 4);
});

test("repair feedback names exact field paths without including invalid input values", () => {
  const result = z.object({ assumptions: z.array(z.string()), stack: z.array(z.string()) }).safeParse({ assumptions: [{ secret: "private fixture" }], stack: { nested: [] } });
  assert.equal(result.success, false);
  if (result.success) return;
  const feedback = schemaRepairFeedback(result.error).join("; ");
  assert.match(feedback, /assumptions\[0\].*string/);
  assert.match(feedback, /stack.*array/);
  assert.doesNotMatch(feedback, /private fixture/);
});

test("rejected sections retain usage across recovery without charging replayed sections twice", async () => {
  let checkpoint = emptyGenerationCheckpoint();
  let attempts = 0;
  let lastUsage: GenerationUsage | undefined;
  const operation = async () => {
    const usage = { tokensIn: 0, tokensOut: 0, models: [] as string[] };
    lastUsage = usage;
    return checkpointedSection("database", "one brief", usage, async () => {
      attempts++; usage.tokensIn += 10; usage.tokensOut += 20;
      if (attempts === 1) throw new Error("rejected draft");
      return "accepted";
    });
  };
  const persist = async (saved: GenerationCheckpoint) => { checkpoint = structuredClone(saved); };
  await assert.rejects(runGenerationSlice(checkpoint, persist, operation), /rejected draft/);
  assert.equal(Object.keys(checkpoint.failedUsage ?? {}).length, 1);
  assert.equal((await runGenerationSlice(checkpoint, persist, operation)).done, true);
  assert.deepEqual(lastUsage, { tokensIn: 20, tokensOut: 40, models: [] });
  await runGenerationSlice(checkpoint, persist, operation);
  assert.equal(attempts, 2);
  assert.deepEqual(lastUsage, { tokensIn: 20, tokensOut: 40, models: [] });
});
