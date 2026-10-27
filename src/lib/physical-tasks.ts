import type { Plan, Task } from "./types";
import type { NextTaskResult } from "./tasks";

export type TaskActor = { id: string; type: "human" | "agent" };
export const actorFor = (user: { userId: string; via: string }): TaskActor => ({ id: user.userId, type: user.via === "session" || user.via === "legacy-dev" ? "human" : "agent" });
export function physicalTaskIssues(task: Task, action: "start" | "complete", actor?: TaskActor): string[] {
  const h = task.hardware;
  if (!h) return ["Physical task metadata is missing."];
  const issues: string[] = [];
  if (!actor) issues.push("Physical tasks require an authenticated executor.");
  if (actor?.type === "agent" && (h.executor === "human" || h.evidenceKind === "physical")) issues.push("This task requires a human. Continue with another runnable digital task or wait for the owner.");
  if (h.waitReason) issues.push(`Task is waiting for ${h.waitReason}.`);
  if (h.invalidated) issues.push("The design changed; evidence needs revalidation.");
  if (action === "complete") {
    const latest = h.evidence.filter(e => e.revision === h.revision && e.kind === h.evidenceKind).at(-1);
    if (!latest || latest.outcome !== "pass" || h.evidenceKind === "physical" && latest.actorType !== "human") issues.push(`Add passing ${h.evidenceKind} evidence for revision ${h.revision} before completing this task.`);
    if (h.reviewRequired && h.review?.revision !== h.revision) issues.push("A human review is required for this revision.");
  }
  return issues;
}
export function nextPhysicalTask(plan: Plan, actor?: TaskActor): NextTaskResult {
  const tasks = plan.features.flatMap(p => p.subFeatures.flatMap(w => w.tasks));
  const current = tasks.filter(t => t.status !== "done" || t.hardware?.invalidated);
  const done = new Set(tasks.filter(t => t.status === "done" && !t.hardware?.invalidated).map(t => t.ref));
  const available = current.filter(t => t.status === "pending" && t.deps.every(id => done.has(id)) && !physicalTaskIssues(t, "start", actor).length).sort((a, b) => a.phase - b.phase || a.ref.localeCompare(b.ref));
  const running = current.find(t => t.status === "in_progress" && !t.hardware?.waitReason);
  const next = running ? undefined : available[0];
  return { done: plan.status !== "generating" && tasks.length > 0 && !current.length, blocked: !next && current.length > 0,
    failedTasks: current.filter(t => t.status === "failed").map(t => ({ ref: t.ref, title: t.title, failReason: t.failReason ?? null })),
    task: next ? { ref: next.ref, title: next.title, layer: next.layer, phase: next.phase, page: null, lastFailReason: next.lastFailReason ?? null, detail: next.detail, hardware: next.hardware } : null,
    waiting: current.filter(t => !next || t.ref !== next.ref).map(t => ({ ref: t.ref, reason: t.hardware?.waitReason ?? (t.status === "in_progress" ? "in_progress" : t.hardware?.evidenceKind === "physical" || t.hardware?.executor === "human" ? "human" : "dependency") })),
    progress: { phase: { current: next?.phase ?? 0, total: plan.features.length }, layer: next?.layer ?? "systems", page: null, checkpoint: false, remainingInLayer: available.length },
  };
}
