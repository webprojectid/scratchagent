import type { Plan } from "./types";
import { allTasks, findTask, findTaskByRef, getPlan, updatePlanStatus, updateTask } from "./storage";

type Task = Plan["features"][0]["subFeatures"][0]["tasks"][0];

const layerOrder: Record<string, number> = { frontend: 0, backend: 1, qa: 2 };

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

export async function getNextTask(planId: string): Promise<NextTaskResult> {
  const plan = await getPlan(planId);
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

  if (tasks.every((t) => t.status === "done")) {
    return { done: true, blocked: false, failedTasks: [], task: null, progress: { phase: { current: 0, total: 0 }, layer: "qa", page: null, checkpoint: false, remainingInLayer: 0 } };
  }

  const eligible = tasks
    .filter((t) => t.status === "pending" && t.deps.every((d: string) => doneRefs.has(d)))
    .sort((a, b) => layerOrder[a.layer] - layerOrder[b.layer] || a.phase - b.phase || a.ref.localeCompare(b.ref));

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

async function resolveByRef(ref: string): Promise<{ task: Task; plan: { id: string } } | null> {
  const result = await findTaskByRef(ref);
  if (result) return { task: result.task, plan: { id: result.plan.id } };
  return null;
}

export async function startTask(planIdOrRef: string, ref?: string): Promise<Task | null> {
  if (ref) {
    const found = await findTask(planIdOrRef, ref);
    if (!found) return null;
    await updateTask(planIdOrRef, ref, { status: "in_progress", startedAt: new Date().toISOString() });
    return found.task;
  }
  const found = await resolveByRef(planIdOrRef);
  if (!found) return null;
  await updateTask(found.plan.id, planIdOrRef, { status: "in_progress", startedAt: new Date().toISOString() });
  return found.task;
}

export async function completeTask(planIdOrRef: string, ref?: string): Promise<Task | null> {
  const pid = ref ? planIdOrRef : (await resolveByRef(planIdOrRef))?.plan.id;
  const r = ref ?? planIdOrRef;
  if (!pid) return null;
  const found = await findTask(pid, r);
  if (!found) return null;
  await updateTask(pid, r, { status: "done", completedAt: new Date().toISOString() });
  const plan = await getPlan(pid);
  if (plan) await checkPlanComplete(pid, plan);
  return found.task;
}

export async function failTask(planIdOrRef: string, reason: string, ref?: string): Promise<Task | null> {
  const pid = ref ? planIdOrRef : (await resolveByRef(planIdOrRef))?.plan.id;
  const r = ref ?? planIdOrRef;
  if (!pid) return null;
  const found = await findTask(pid, r);
  if (!found) return null;
  await updateTask(pid, r, { status: "failed", failReason: reason, lastFailReason: reason });
  return found.task;
}

export async function retryTask(planIdOrRef: string, ref?: string): Promise<Task | null> {
  const pid = ref ? planIdOrRef : (await resolveByRef(planIdOrRef))?.plan.id;
  const r = ref ?? planIdOrRef;
  if (!pid) return null;
  const found = await findTask(pid, r);
  if (!found) return null;
  await updateTask(pid, r, { status: "pending", failReason: null, retryCount: (found.task.retryCount ?? 0) + 1 });
  return found.task;
}

async function checkPlanComplete(planId: string, plan: Plan) {
  const tasks = allTasks(plan);
  if (tasks.length > 0 && tasks.every((t) => t.status === "done")) {
    await updatePlanStatus(planId, "done");
  }
}
