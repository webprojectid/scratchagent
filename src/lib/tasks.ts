import { withPlanMutation } from "./plan-mutation";
import { structureLimits } from "./plan-limits";
import { isAutomaticQaSubFeature, isAutomaticQaTaskTitle, QA_COPY } from "./qa-labels";
import type { Plan } from "./types";
import { allTasks, findTask, getPlan, syncFeatureStatuses, updatePlanStatus, updateTask } from "./storage";

type Task = Plan["features"][0]["subFeatures"][0]["tasks"][0];

const layerOrder: Record<string, number> = { frontend: 0, backend: 1, qa: 2 };
// Urutan eksekusi: selesaikan per FASE dulu (fitur per fitur), baru di dalam
// fase urut layer frontend -> backend -> qa. Kalau layer diprioritaskan di atas
// fase, semua frontend lintas fase akan dikerjakan duluan dan fase 1 tidak
// pernah tuntas sebelum fase 2 dimulai.

export interface NextTaskResult {
  done: boolean;
  blocked: boolean;
  failedTasks: { ref: string; title: string; failReason: string | null }[];
  task: { ref: string; title: string; layer: string; phase: number; page: string | null; lastFailReason: string | null } | null;
  progress: {
    phase: { current: number; total: number };
    layer: string;
    page: string | null;
    checkpoint: boolean;
    remainingInLayer: number;
  };
}

export async function getNextTask(planId: string, loadedPlan?: Plan): Promise<NextTaskResult> {
  const plan = loadedPlan?.id === planId ? loadedPlan : await getPlan(planId);
  if (!plan) return { done: true, blocked: false, failedTasks: [], task: null, progress: { phase: { current: 0, total: 0 }, layer: "qa", page: null, checkpoint: false, remainingInLayer: 0 } };

  const tasks = allTasks(plan);
  const doneRefs = new Set(tasks.filter((t) => t.status === "done").map((t) => t.ref));
  const failed = tasks.filter((t) => t.status === "failed");

  if (failed.length > 0) {
    return {
      done: false,
      blocked: true,
      failedTasks: failed.map((t) => ({ ref: t.ref, title: t.title, failReason: t.failReason ?? null })),
      task: null,
      progress: { phase: { current: 0, total: 0 }, layer: "qa", page: null, checkpoint: false, remainingInLayer: 0 },
    };
  }

  const everyFeatureHasTasks = (plan.features ?? []).every((f) =>
    (f.subFeatures ?? []).some((sf) => !isAutomaticQaSubFeature(sf.title) && (sf.tasks ?? []).length > 0),
  );
  if (tasks.length > 0 && everyFeatureHasTasks && tasks.every((t) => t.status === "done")) {
    return { done: true, blocked: false, failedTasks: [], task: null, progress: { phase: { current: 0, total: 0 }, layer: "qa", page: null, checkpoint: false, remainingInLayer: 0 } };
  }

  const eligible = tasks
    .filter((t) => t.status === "pending" && t.deps.every((d: string) => doneRefs.has(d)))
    .sort((a, b) => a.phase - b.phase || layerOrder[a.layer] - layerOrder[b.layer] || a.ref.localeCompare(b.ref));

  const next = eligible[0];
  if (!next) {
    return { done: false, blocked: true, failedTasks: [], task: null, progress: { phase: { current: 0, total: 0 }, layer: "qa", page: null, checkpoint: false, remainingInLayer: 0 } };
  }

  const lastCompleted = tasks.filter((t) => t.status === "done").sort((a, b) => {
    const bt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    const at = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    return bt - at;
  })[0];
  const checkpoint = !lastCompleted ? false : lastCompleted.layer !== next.layer || lastCompleted.phase !== next.phase;

  const phases = [...new Set(tasks.map((t) => t.phase))].sort((a, b) => a - b);
  const remainingInLayer = eligible.filter((t) => t.layer === next.layer).length;

  return {
    done: false,
    blocked: false,
    failedTasks: [],
    task: { ref: next.ref, title: next.title, layer: next.layer, phase: next.phase, page: next.page, lastFailReason: next.lastFailReason ?? null },
    progress: {
      phase: { current: phases.indexOf(next.phase) + 1, total: phases.length },
      layer: next.layer,
      page: next.page,
      checkpoint,
      remainingInLayer,
    },
  };
}

export class TaskConflict extends Error {
  constructor(message: string) { super(message); this.name = "TaskConflict"; }
}
async function transitionTask(planId: string, ref: string, action: "start" | "complete" | "fail" | "retry", reason?: string): Promise<Task | null> {
  return withPlanMutation(planId, async () => {
    const found = await findTask(planId, ref);
    if (!found) return null;
    const { task, plan } = found;
    const target = { start: "in_progress", complete: "done", fail: "failed", retry: "pending" }[action] as Task["status"];
    if (task.status === target) return task;
    if (action === "start") {
      if (task.status !== "pending") throw new TaskConflict("Only pending tasks can be started.");
      if (plan.status === "generating") throw new TaskConflict("Wait for plan generation to finish.");
      if (allTasks(plan).some(candidate => candidate.status === "in_progress" && candidate.ref !== ref)) throw new TaskConflict("Another task is already running.");
      const next = await getNextTask(planId, plan);
      if (next.task?.ref !== ref) throw new TaskConflict("Complete earlier tasks and dependencies before starting this task.");
    } else if (action === "retry") {
      if (task.status !== "failed") throw new TaskConflict("Only failed tasks can be retried.");
    } else if (task.status !== "in_progress") throw new TaskConflict("Start the task before completing or failing it.");
    const patch: Partial<Task> = { status: target };
    if (action === "start") patch.startedAt = new Date().toISOString();
    if (action === "complete") patch.completedAt = new Date().toISOString();
    if (action === "fail") { patch.failReason = reason ?? "Task failed"; patch.lastFailReason = patch.failReason; }
    if (action === "retry") { patch.failReason = null; patch.retryCount = (task.retryCount ?? 0) + 1; patch.startedAt = null; patch.completedAt = null; }
    if (!await updateTask(planId, ref, patch, task.status)) throw new TaskConflict("Task changed. Refresh the plan and try again.");
    await syncFeatureStatuses(planId);
    if (action === "start" && plan.status === "ready") await updatePlanStatus(planId, "implementing");
    if (action === "complete") { const current = await getPlan(planId); if (current) await checkPlanComplete(planId, current); }
    return { ...task, ...patch };
  });
}
export const startTask = (planId: string, ref: string) => transitionTask(planId, ref, "start");
export const completeTask = (planId: string, ref: string) => transitionTask(planId, ref, "complete");
export const failTask = (planId: string, ref: string, reason: string) => transitionTask(planId, ref, "fail", reason);
export const retryTask = (planId: string, ref: string) => transitionTask(planId, ref, "retry");

async function checkPlanComplete(planId: string, plan: Plan) {
  const tasks = allTasks(plan);
  // Plan baru sah dianggap done kalau SEMUA fitur sudah punya task dan
  // semuanya selesai. Fitur yang belum ke-generate (loop generate-tasks
  // di browser mati di tengah) tidak boleh dihitung tuntas — dulu bug ini
  // bikin plan 8 fitur dengan 2 fitur berisi dianggap "done".
  const everyFeatureHasTasks = (plan.features ?? []).every((f) =>
    (f.subFeatures ?? []).some((sf) => !isAutomaticQaSubFeature(sf.title) && (sf.tasks ?? []).length > 0),
  );
  if (tasks.length > 0 && everyFeatureHasTasks && tasks.every((t) => t.status === "done")) {
    await updatePlanStatus(planId, "done");
  }
}

function setQaCapacityWarning(plan: Plan, active: boolean): boolean {
  const warnings = plan.warnings ?? [];
  const next = warnings.filter((warning) => warning !== QA_COPY.id.capacityWarning && warning !== QA_COPY.en.capacityWarning);
  if (active) next.push(plan.generationSettings?.language === "en" ? QA_COPY.en.capacityWarning : QA_COPY.id.capacityWarning);
  if (next.length === warnings.length && next.every((warning, index) => warning === warnings[index])) return false;
  plan.warnings = next;
  return true;
}

/**
 * Finalisasi struktur plan dengan QA pada fitur/fase terakhir. Task yang sudah
 * ada tidak dipotong untuk membuka ruang. `ready` berarti setiap fitur punya
 * task reguler dan keempat task QA muat dalam batas paket; caller menyimpan
 * mutasi dan hanya mengubah status ke ready jika nilai ini true.
 */
export function ensureQaPhase(plan: Plan): { changed: boolean; ready: boolean } {
  const features = plan.features ?? [];
  if (features.length === 0 || features.some((feature) =>
    !(feature.subFeatures ?? []).some((sub) => !isAutomaticQaSubFeature(sub.title) && (sub.tasks ?? []).length > 0)
  )) return { changed: false, ready: false };

  const limits = structureLimits(plan.tier);
  const qaCopy = plan.generationSettings?.language === "en" ? QA_COPY.en : QA_COPY.id;
  const lastFeature = features.at(-1)!;
  const subFeatures = lastFeature.subFeatures ?? [];
  const qaSubFeature = subFeatures.find((sub) => isAutomaticQaSubFeature(sub.title));
  let changed = false;
  if (qaSubFeature && !Array.isArray(qaSubFeature.tasks)) {
    qaSubFeature.tasks = [];
    changed = true;
  }
  // Repair the old off-by-one QA phase without replacing its tasks or status.
  for (const task of qaSubFeature?.tasks ?? []) {
    if (task.layer === "qa" && isAutomaticQaTaskTitle(task.title) && task.phase !== features.length) {
      task.phase = features.length;
      changed = true;
    }
  }
  const existingTitles = new Set((qaSubFeature?.tasks ?? []).filter((task) => task.layer === "qa").map((task) => task.title));
  const missingTitles = qaCopy.tasks.filter((_, index) =>
    !existingTitles.has(QA_COPY.id.tasks[index]) && !existingTitles.has(QA_COPY.en.tasks[index])
  );
  const taskCount = subFeatures.reduce((sum, sub) => sum + (sub.tasks ?? []).length, 0);
  const hasCapacity = features.length <= limits.features[1]
    && subFeatures.length + (qaSubFeature ? 0 : 1) <= limits.subFeatures[1]
    && taskCount + missingTitles.length <= limits.tasks[1];

  if (!hasCapacity) {
    return { changed: setQaCapacityWarning(plan, true) || changed, ready: false };
  }

  changed = setQaCapacityWarning(plan, false) || changed;
  let target = qaSubFeature;
  if (!target) {
    target = { title: qaCopy.subFeature, tasks: [] };
    subFeatures.push(target);
    changed = true;
  }

  const refs = new Set(features.flatMap((feature) => (feature.subFeatures ?? []).flatMap((sub) => (sub.tasks ?? []).map((task) => task.ref))));
  let nextRef = 1;
  for (const title of missingTitles) {
    let ref: string;
    do {
      ref = `F${String(features.length).padStart(2, "0")}-S99-T${String(nextRef++).padStart(2, "0")}`;
    } while (refs.has(ref));
    refs.add(ref);
    target.tasks.push({
      ref,
      title,
      layer: "qa",
      phase: features.length,
      page: null,
      deps: [],
      status: "pending",
      retryCount: 0,
      lastFailReason: null,
      failReason: null,
      startedAt: null,
      completedAt: null,
    });
    changed = true;
  }
  return { changed, ready: true };
}
