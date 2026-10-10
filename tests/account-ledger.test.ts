import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDisplayName, updateAccountName } from "@/lib/account-profile";
import { memoryGetOrCreateUser, memoryGetUserById } from "@/lib/memory-store";
import { buildPlanOverview } from "@/lib/plan-overview";
import { updatePlanNotes } from "@/lib/plan-notes";
import { memoryGetPlan, memorySavePlan } from "@/lib/memory-store";
import type { Plan, Task } from "@/lib/types";

test("profile validation accepts Indonesian names and rejects empty, oversized and multiline input", () => {
  assert.equal(validateDisplayName("  Teguh Adhi Wibowo  "), "Teguh Adhi Wibowo");
  for (const value of [null, {}, "", "  ", "a".repeat(81), "Nama\nBaru", "Nama\u0000"]) assert.equal(validateDisplayName(value), null);
});

test("saved names persist on the account and do not change another account", async () => {
  const previousDatabase = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const owner = memoryGetOrCreateUser("ledger-qa@example.test", "Old name");
    const other = memoryGetOrCreateUser("ledger-other@example.test", "Other name");
    assert.equal(await updateAccountName(owner.id, "New name"), true);
    assert.equal(memoryGetUserById(owner.id)?.name, "New name");
    assert.equal(memoryGetUserById(other.id)?.name, "Other name");
    assert.equal(await updateAccountName("missing-account", "Name"), false);
  } finally {
    if (previousDatabase !== undefined) process.env.DATABASE_URL = previousDatabase;
  }
});

function planWithTasks(tasks: Task[]): Plan {
  return { id: "qa-plan", title: "QA", brief: "", stack: [], asumsi: [], status: "ready", features: [{ slug: "auth", title: "Autentikasi", icon: "", description: "", tujuan: "", selesaiBila: [], status: "direncanakan", subFeatures: [{ title: "Login", tasks }] }] };
}
const task = (ref: string, status: Task["status"], deps: string[] = []): Task => ({ ref, title: ref, status, deps, layer: "backend", phase: 1, page: null });

test("next task respects dependencies, counts phases, and never mutates the plan", () => {
  const plan = planWithTasks([task("blocked", "pending", ["unfinished"]), task("done", "done"), task("ready", "pending", ["done"]), task("failure", "failed")]);
  const snapshot = JSON.stringify(plan);
  const overview = buildPlanOverview(plan);
  assert.equal(overview.nextTask?.ref, "ready");
  assert.equal(overview.phases[0].total, 4);
  assert.equal(overview.phases[0].done, 1);
  assert.equal(overview.phases[0].failed, 1);
  assert.equal(overview.phases[0].tasks[0].ref, "blocked");
  assert.equal(JSON.stringify(plan), snapshot);
});

test("project notes survive a concurrent plan save and stay isolated from another project", async () => {
  const previousDatabase = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const plan = planWithTasks([]);
    const other = { ...plan, id: "other-plan" };
    memorySavePlan(plan, "owner@example.test"); memorySavePlan(other, "other@example.test");
    assert.equal(await updatePlanNotes(plan.id, "Keputusan desain\nPeriksa mobile", "2026-10-10T05:00:00Z"), true);
    memorySavePlan(plan, "owner@example.test");
    assert.equal(memoryGetPlan(plan.id)?.accountNotes, "Keputusan desain\nPeriksa mobile");
    assert.equal(memoryGetPlan(other.id)?.accountNotes, undefined);
    assert.equal(await updatePlanNotes("missing", "", "2026-10-10T05:00:00Z"), false);
  } finally { if (previousDatabase !== undefined) process.env.DATABASE_URL = previousDatabase; }
});

test("active work is prioritized and blocked or empty plans have no invented next task", () => {
  assert.equal(buildPlanOverview(planWithTasks([task("ready", "pending"), task("active", "in_progress")])).nextTask?.ref, "active");
  const blocked = buildPlanOverview(planWithTasks([task("blocked", "pending", ["missing"])]));
  assert.equal(blocked.nextTask, null);
  assert.equal(blocked.blocked, true);
  assert.equal(buildPlanOverview(planWithTasks([])).nextTask, null);
});
