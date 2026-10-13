import { test } from "node:test";
import assert from "node:assert/strict";
import { savePlan, getPlan, listPlans, updateTask, findTask, deletePlan } from "@/lib/storage";
import type { Plan } from "@/lib/types";

test("storage preserves owner isolation through task updates and deletion", async () => {
  delete process.env.DATABASE_URL;
  const id = "storage-audit-plan";
  const plan: Plan = { id, title: "Audit fixture", brief: "Fixture", stack: [], asumsi: [], status: "ready", features: [{
    slug: "feature", title: "Feature", icon: "folder", description: "Fixture", tujuan: "Test", selesaiBila: [], status: "direncanakan",
    subFeatures: [{ title: "Sub", tasks: [{ ref: "F01-S01-T01", title: "Task", layer: "frontend", phase: 1, page: null, deps: [], status: "pending", retryCount: 0, lastFailReason: null, failReason: null, startedAt: null, completedAt: null }] }],
  }] };
  await savePlan(plan, "storage-owner@example.test");
  assert.equal((await getPlan(id))?.userId, "storage-owner@example.test");
  assert.equal((await listPlans("other-storage-user@example.test")).length, 0);
  assert.equal((await listPlans("storage-owner@example.test")).length, 1);
  await updateTask(id, "F01-S01-T01", { status: "done" });
  assert.equal((await findTask(id, "F01-S01-T01"))?.task.status, "done");
  assert.equal((await getPlan(id))?.userId, "storage-owner@example.test");
  assert.equal(await deletePlan(id), true);
  assert.equal(await getPlan(id), undefined);
});
