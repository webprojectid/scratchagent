import { test, before } from "node:test";
import assert from "node:assert/strict";
import { progressPollDelay, startProgressPolling } from "@/lib/progress-polling";
import { getProgressRevision, progressVersion } from "@/lib/plan-progress";
import { accessPlan, type AuthUser } from "@/lib/api-auth";
import { memorySavePlan } from "@/lib/memory-store";
import type { Plan } from "@/lib/types";
import { getNextTask } from "@/lib/tasks";

before(() => { delete process.env.DATABASE_URL; });
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function environment(hidden = false) {
  let listener = () => {};
  const timers: { callback: () => void; delay: number; cancelled: boolean }[] = [];
  return { timers, setHidden(value: boolean) { hidden = value; listener(); },
    env: { hidden: () => hidden, onVisibility(callback: () => void) { listener = callback; return () => { listener = () => {}; }; },
      schedule(callback: () => void, delay: number) { const item = { callback, delay, cancelled: false }; timers.push(item); return () => { item.cancelled = true; }; } } };
}

test("idle requests drop from 1200/hour to 120 ready or 30 done; active generation stays responsive", () => {
  assert.equal(progressPollDelay("generating"), 3000);
  assert.equal(progressPollDelay("implementing"), 10000);
  assert.equal(3600000 / progressPollDelay("ready"), 120);
  assert.equal(3600000 / progressPollDelay("done"), 30);
  assert.equal(progressPollDelay("generating", 4), 48000);
});
test("hidden tabs make no requests and resume when visible", async () => {
  const fixture = environment(true); let requests = 0;
  const stop = startProgressPolling("ready", async () => { requests++; return true; }, fixture.env);
  assert.equal(requests, 0);
  fixture.setHidden(false); await flush(); assert.equal(requests, 1);
  fixture.setHidden(true); assert.equal(fixture.timers[0].cancelled, true);
  stop(); fixture.setHidden(false); assert.equal(requests, 1);
});
test("visibility changes abort requests without overlapping another poll", async () => {
  const fixture = environment(); let requests = 0; let signal!: AbortSignal; let release!: (value: boolean) => void;
  const stop = startProgressPolling("generating", s => { requests++; signal = s; return new Promise(resolve => { release = resolve; }); }, fixture.env);
  fixture.setHidden(true); assert.equal(signal.aborted, true);
  fixture.setHidden(false); assert.equal(requests, 1);
  release(true); await flush(); assert.equal(fixture.timers.length, 1);
  stop(); assert.equal(fixture.timers[0].cancelled, true);
});
test("failed polls back off and stopping an in-flight request creates no timer", async () => {
  const fixture = environment();
  const stop = startProgressPolling("implementing", async () => false, fixture.env);
  await flush(); assert.equal(fixture.timers[0].delay, 20000);
  stop();
  const pending = environment(); let release!: (value: boolean) => void;
  const stopPending = startProgressPolling("ready", () => new Promise(resolve => { release = resolve; }), pending.env);
  stopPending(); release(true); await flush(); assert.equal(pending.timers.length, 0);
});

const plan: Plan = { id: "egress-plan", title: "Example", brief: "brief", stack: [], asumsi: [], status: "ready", features: [] };
const owner: AuthUser = { userId: "owner-id", email: "egress@example.test", via: "session" };
test("revision stays stable for identical content and changes for status, task edits and deletions", () => {
  const version = progressVersion(plan);
  assert.equal(progressVersion(structuredClone(plan)), version);
  assert.notEqual(progressVersion({ ...plan, status: "implementing" }), version);
  const feature = { slug: "search", title: "Search", subFeatures: [{ title: "API", tasks: [{ ref: "F01-S01-T01", status: "pending", title: "Search API" }] }] };
  const withTask = { ...plan, features: [feature] } as Plan;
  const changed = structuredClone(withTask); changed.features[0].subFeatures[0].tasks[0].status = "done";
  assert.notEqual(progressVersion(withTask), progressVersion(changed));
  assert.notEqual(progressVersion(withTask), version);
});
test("compact revision reads retain owner, admin, demo and token-scope gates", async () => {
  memorySavePlan(plan, owner.email!);
  const access = (user: AuthUser | null) => accessPlan(plan.id, user, { loadPlan: getProgressRevision });
  assert.ok((await access(owner)).plan);
  assert.equal((await access(null)).error?.status, 401);
  assert.equal((await access({ ...owner, email: "other@example.test", userId: "other" })).error?.status, 404);
  assert.ok((await access({ ...owner, email: "teguhends@gmail.com", userId: "admin" })).plan);
  assert.equal((await access({ ...owner, tokenPolicy: { access: "read", expiresAt: null, lastUsedAt: null, projectIds: ["different-plan"] } })).error?.status, 403);
  assert.ok((await accessPlan("demo", null, { loadPlan: getProgressRevision })).plan);
  assert.equal((await accessPlan("missing", owner, { loadPlan: getProgressRevision })).error?.status, 404);
});
test("CLI scheduling reuses the authorized snapshot and preserves dependency and checkpoint behavior", async () => {
  const task = (ref: string, status: "done" | "pending", deps: string[], phase: number) => ({ ref, title: ref, status, deps, phase, layer: "backend" as const, page: null });
  const snapshot: Plan = { ...plan, id: "cli-egress", features: [{ slug: "api", title: "API", icon: "", description: "", tujuan: "", selesaiBila: [], status: "direncanakan", subFeatures: [{ title: "Tasks", tasks: [task("first", "done", [], 1), task("second", "pending", ["first"], 2)] }] }] };
  const result = await getNextTask(snapshot.id, snapshot);
  assert.equal(result.task?.ref, "second");
  assert.equal(result.progress.checkpoint, true);
  assert.equal(result.progress.phase.current, 2);
  assert.equal(await getProgressRevision(snapshot.id), undefined);
});
