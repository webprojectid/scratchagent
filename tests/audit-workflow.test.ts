import { test } from "node:test";
import assert from "node:assert/strict";
import { savePlan, getPlan, findTask } from "@/lib/storage";
import { startTask, completeTask, failTask, retryTask, TaskConflict } from "@/lib/tasks";
import { memoryGetOrCreateUser } from "@/lib/memory-store";
import { banUser } from "@/lib/billing";
import { accessPlan } from "@/lib/api-auth";
import { claimGeneration, releaseGeneration, reserveGenerationAttempt } from "@/lib/generation-lease";
import { hasProFeatures } from "@/lib/account-capabilities";
import { writeOriginGate } from "@/lib/write-origin";
import type { Plan } from "@/lib/types";

function fixture(id: string): Plan {
  return { id, title: "Fixture", brief: "Audit fixture", stack: [], asumsi: [], status: "ready", features: [{ slug: "phase", title: "Phase", icon: "folder", description: "Fixture", tujuan: "Test", selesaiBila: [], status: "direncanakan", subFeatures: [{ title: "Sub", tasks: [
    { ref: "A", title: "First", layer: "frontend", phase: 1, page: null, deps: [], status: "pending" },
    { ref: "B", title: "Second", layer: "frontend", phase: 1, page: null, deps: ["A"], status: "pending" },
  ] }] }] };
}
test("task dependency, status transition and current response are enforced", async () => {
  delete process.env.DATABASE_URL;
  const plan = fixture("task-workflow-regression"); await savePlan(plan, "owner");
  await assert.rejects(startTask(plan.id, "B"), TaskConflict);
  await assert.rejects(completeTask(plan.id, "A"), TaskConflict);
  const started = await startTask(plan.id, "A"); assert.equal(started?.status, "in_progress");
  assert.equal((await getPlan(plan.id))?.status, "implementing");
  assert.equal((await startTask(plan.id, "A"))?.status, "in_progress");
  assert.equal((await completeTask(plan.id, "A"))?.status, "done");
  await assert.rejects(retryTask(plan.id, "A"), TaskConflict);
  assert.equal((await startTask(plan.id, "B"))?.status, "in_progress");
  assert.equal((await failTask(plan.id, "B", "Fixture failure"))?.status, "failed");
  assert.equal((await retryTask(plan.id, "B"))?.status, "pending");
  assert.equal((await findTask(plan.id, "B"))?.task.retryCount, 1);
  await retryTask(plan.id, "B"); assert.equal((await findTask(plan.id, "B"))?.task.retryCount, 1);
  await startTask(plan.id, "B"); await completeTask(plan.id, "B");
  assert.equal((await getPlan(plan.id))?.status, "done");
});
test("concurrent task starts cannot reserve different tasks", async () => {
  delete process.env.DATABASE_URL; const plan = fixture("concurrent-tasks"); await savePlan(plan, "owner");
  const results = await Promise.allSettled([startTask(plan.id, "A"), startTask(plan.id, "B")]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
});
test("banned owner cannot mutate plans while scoped read permissions remain", async () => {
  delete process.env.DATABASE_URL; const owner = memoryGetOrCreateUser("banned-fixture@example.test"); const plan = fixture("ban-regression"); await savePlan(plan, owner.id); await banUser(owner.id);
  const user = { userId: owner.id, email: owner.email, via: "token" as const, tokenPolicy: { access: "write" as const, projectIds: [], expiresAt: null, lastUsedAt: null } };
  assert.equal((await accessPlan(plan.id, user, { write: true })).error?.status, 403);
  assert.ok((await accessPlan(plan.id, user)).plan);
});
test("generation claims reject duplicate work and stale release cannot clear newer owner", async () => {
  delete process.env.DATABASE_URL; const key = "lease-regression";
  const leases = await Promise.all([claimGeneration(key, "tasks"), claimGeneration(key, "tasks")]);
  assert.equal(leases.filter(Boolean).length, 1);
  await releaseGeneration(key, "tasks", "wrong-owner"); assert.equal(await claimGeneration(key, "tasks"), null);
  await releaseGeneration(key, "tasks", leases.find(Boolean)!); assert.ok(await claimGeneration(key, "tasks"));
});
test("persistent generation budget preserves normal multi-phase builds and bounds retries", async () => {
  delete process.env.DATABASE_URL;
  for (let i = 0; i < 200; i++) assert.equal(await reserveGenerationAttempt("budget-fixture", "pro"), true);
  assert.equal(await reserveGenerationAttempt("budget-fixture", "pro"), false);
  assert.equal(await reserveGenerationAttempt("another-fixture", "free"), true);
});
test("admin and tier capability is shared without extending CLI role", (context) => {
  const original = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "capability-admin@example.test";
  context.after(() => { if (original === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = original; });
  const owner = { userId: "owner", email: "capability-admin@example.test", via: "session" as const };
  assert.equal(hasProFeatures(owner, "free"), true);
  assert.equal(hasProFeatures({ ...owner, via: "token" }, "free"), false);
  assert.equal(hasProFeatures({ ...owner, email: "user@example.test" }, "free"), false);
  assert.equal(hasProFeatures({ ...owner, email: "user@example.test" }, "pro"), true);
});
test("cross-origin browser writes are blocked and authenticated CLI headers remain usable", () => {
  assert.equal(writeOriginGate(new Request("https://example.test/api", { headers: { origin: "https://attacker.test" } }))?.status, 403);
  assert.equal(writeOriginGate(new Request("https://example.test/api", { headers: { origin: "https://example.test" } })), null);
  assert.equal(writeOriginGate(new Request("https://example.test/api", { headers: { authorization: "Bearer fixture" } })), null);
});
