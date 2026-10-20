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
    const section = (stage: string) => checkpointedSection(stage, stage, usage, async sectionUsage => {
      assert.ok(sectionUsage);
      calls.push(stage); sectionUsage.tokensIn += 10; sectionUsage.tokensOut += 20;
      if (!sectionUsage.models.includes("gemini")) sectionUsage.models.push("gemini");
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
    return checkpointedSection("database", "one brief", usage, async sectionUsage => {
      assert.ok(sectionUsage);
      attempts++; sectionUsage.tokensIn += 10; sectionUsage.tokensOut += 20;
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

test("three independent calls share one wave and isolated usage without starting dependent work", async () => {
  let checkpoint = emptyGenerationCheckpoint();
  const calls: string[] = [];
  let active = 0, peak = 0;
  let latest: GenerationUsage | undefined;
  const operation = async () => {
    const usage: GenerationUsage = { tokensIn: 0, tokensOut: 0, models: [] };
    latest = usage;
    const section = (stage: string) => checkpointedSection(stage, stage, usage, async own => {
      assert.ok(own); calls.push(stage); active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 10));
      active--; own.tokensIn += 10; own.tokensOut += 20; own.models.push('fixture');
      return stage;
    });
    await Promise.all(['architecture', 'database', 'requirements'].map(section));
    return section('review');
  };
  const save = async (saved: GenerationCheckpoint) => { checkpoint = structuredClone(saved); };
  assert.deepEqual(await runGenerationSlice(checkpoint, save, operation, { concurrency: 3 }), { done: false });
  assert.equal(peak, 3);
  assert.equal(Object.keys(checkpoint.entries).length, 3);
  assert.deepEqual(latest, { tokensIn: 30, tokensOut: 60, models: ['fixture'] });
  assert.equal((await runGenerationSlice(checkpoint, save, operation, { concurrency: 3 })).done, true);
  assert.deepEqual(calls, ['architecture', 'database', 'requirements', 'review']);
  assert.deepEqual(latest, { tokensIn: 40, tokensOut: 80, models: ['fixture'] });
  for (const entry of Object.values(checkpoint.entries)) assert.equal(entry.usage.tokensIn, 10);
});

test("a paused sibling waits for running calls and preserves a later failure with accepted peers", async () => {
  const checkpoint = emptyGenerationCheckpoint();
  let peerFinished = false;
  await assert.rejects(runGenerationSlice(checkpoint, async () => {}, async () => {
    await Promise.all([
      (async () => { await checkpointedSection('outline', 'first', undefined, async () => 'saved'); await checkpointedSection('review', 'dependent', undefined, async () => 'must pause'); })(),
      checkpointedSection('database', 'second', undefined, async () => { await new Promise(resolve => setTimeout(resolve, 15)); peerFinished = true; throw new Error('invalid database'); }),
      checkpointedSection('requirements', 'third', undefined, async () => { await new Promise(resolve => setTimeout(resolve, 25)); return 'also saved'; }),
    ]);
  }, { concurrency: 3 }), /invalid database/);
  assert.equal(peerFinished, true);
  assert.equal(Object.keys(checkpoint.entries).length, 2);
  assert.equal(Object.keys(checkpoint.failedUsage ?? {}).length, 1);
  assert.equal(checkpoint.activeStage, 'database');
});

test("duplicate simultaneous sections share a call and expired slices start no new calls", async () => {
  const checkpoint = emptyGenerationCheckpoint();
  let calls = 0;
  const section = () => checkpointedSection('outline', 'same', undefined, async () => { calls++; return 'saved'; });
  assert.equal((await runGenerationSlice(checkpoint, async () => {}, () => Promise.all([section(), section()]), { concurrency: 3 })).done, true);
  assert.equal(calls, 1);
  assert.equal((await runGenerationSlice(emptyGenerationCheckpoint(), async () => {}, section, { budgetMs: -1 })).done, false);
  assert.equal(calls, 1);
});

test("extra parallel capacity never starts a dependent chain after the wave completes", async () => {
  const calls: string[] = [];
  const result = await runGenerationSlice(emptyGenerationCheckpoint(), async () => {}, async () => {
    await checkpointedSection('discovery', 'brief', undefined, async () => { calls.push('discovery'); });
    await checkpointedSection('outline', 'outline', undefined, async () => { calls.push('outline'); });
  }, { concurrency: 3 });
  assert.equal(result.done, false);
  assert.deepEqual(calls, ['discovery']);
});
