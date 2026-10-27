import { randomUUID } from "node:crypto";
import type { Task } from "./types";
import { z } from "zod";
import { withPlanMutation } from "./plan-mutation";
import { allTasks, getPlan, updatePlanStatus, updateTask, syncFeatureStatuses } from "./storage";
import { TaskConflict } from "./tasks";
import type { TaskActor } from "./physical-tasks";

export const physicalEvidenceInput = z.object({
  action: z.enum(["evidence", "review", "wait", "resume", "invalidate"]), revision: z.number().int().positive(),
  report: z.string().trim().min(5).max(4000).optional(), requestId: z.string().uuid().optional(),
  reason: z.enum(["parts", "human", "review", "tool"]).optional(),
  outcome: z.enum(["pass", "fail", "inconclusive"]).optional(),
}).strict();
export async function changePhysicalEvidence(planId: string, ref: string, input: z.infer<typeof physicalEvidenceInput>, actor: TaskActor) {
  return withPlanMutation(planId, async () => {
    const plan = await getPlan(planId);
    const task: Task | undefined = plan && (allTasks(plan) as Task[]).find(t => t.ref === ref);
    if (!plan?.physical || !task?.hardware) throw new TaskConflict("Physical task not found.");
    if (plan.status === "generating") throw new TaskConflict("Wait for generation to finish.");
    const hardware = structuredClone(task.hardware);
    if (hardware.revision !== input.revision) throw new TaskConflict("Task revision changed. Refresh before trying again.");
    if (input.action === "evidence") {
      if (!input.report) throw new TaskConflict("Describe the actual verification result.");
      if (task.status !== "in_progress") throw new TaskConflict("Start the task before recording its results.");
      if (hardware.evidenceKind === "physical" && actor.type !== "human") throw new TaskConflict("Physical results must be reported through an authenticated human session.");
      if (input.requestId && hardware.evidence.some(e => e.id === input.requestId)) return task;
      if (hardware.evidence.filter(e => e.revision === hardware.revision).length >= 100) throw new TaskConflict("This task has reached its evidence limit. Create a reviewed design revision before continuing.");
      hardware.evidence.push({ id: input.requestId ?? randomUUID(), kind: hardware.evidenceKind, outcome: input.outcome ?? "inconclusive", report: input.report, actor: actor.id, actorType: actor.type, revision: hardware.revision, createdAt: new Date().toISOString() });
      hardware.review = undefined;
      if (hardware.waitReason === "review") hardware.waitReason = undefined;
    } else if (input.action === "review") {
      if (actor.type !== "human") throw new TaskConflict("A human session is required for review.");
      if (hardware.evidence.filter(e => e.revision === hardware.revision && e.kind === hardware.evidenceKind).at(-1)?.outcome !== "pass") throw new TaskConflict("Record passing evidence before reviewing it.");
      hardware.review = { actor: actor.id, revision: hardware.revision, createdAt: new Date().toISOString() };
      if (hardware.waitReason === "review") hardware.waitReason = undefined;
    } else if (input.action === "wait") {
      if (task.status === "done") throw new TaskConflict("Completed tasks cannot be put on hold.");
      if (!input.reason) throw new TaskConflict("Choose a reason for waiting.");
      hardware.waitReason = input.reason;
    } else if (input.action === "resume") {
      if (actor.type !== "human" && hardware.waitReason !== "tool") throw new TaskConflict("The owner must confirm the human prerequisite is available.");
      hardware.waitReason = undefined;
      if (actor.type === "human") hardware.invalidated = false;
    } else {
      if (actor.type !== "human") throw new TaskConflict("Only a human session can invalidate a design revision.");
      const affected = new Set([ref]);
      let changed = true;
      while (changed) { changed = false; for (const candidate of allTasks(plan) as Task[]) if (!affected.has(candidate.ref) && candidate.deps.some(d => affected.has(d))) { affected.add(candidate.ref); changed = true; } }
      for (const candidate of (allTasks(plan) as Task[]).filter(t => affected.has(t.ref))) {
        if (!candidate.hardware) continue;
        const next = { ...candidate.hardware, revision: candidate.hardware.revision + 1, invalidated: true, review: undefined, waitReason: "human" as const };
        if (!await updateTask(planId, candidate.ref, { hardware: next, status: "pending", completedAt: null, startedAt: null }, candidate.status)) throw new TaskConflict("Task changed during invalidation.");
      }
      await updatePlanStatus(planId, "implementing");
      await syncFeatureStatuses(planId);
      return (await getPlan(planId))?.features.flatMap(f => f.subFeatures.flatMap(s => s.tasks)).find(t => t.ref === ref);
    }
    if (!await updateTask(planId, ref, { hardware, status: task.status }, task.status)) throw new TaskConflict("Task changed. Refresh and try again.");
    return { ...task, hardware };
  });
}
