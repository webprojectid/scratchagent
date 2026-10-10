import type { Plan } from "@/lib/types";

export function buildPlanOverview(plan: Plan) {
  const allTasks = plan.features.flatMap(feature => feature.subFeatures.flatMap(part => part.tasks));
  const completed = new Set(allTasks.filter(task => task.status === "done").map(task => task.ref));
  const active = allTasks.find(task => task.status === "in_progress");
  const available = allTasks.find(task => task.status === "pending" && task.deps.every(ref => completed.has(ref)));
  const next = active ?? available;
  const activityDates = [plan.createdAt, plan.accountNotesUpdatedAt, ...allTasks.flatMap(task => [task.startedAt, task.completedAt])]
    .flatMap(date => { const value = date ? new Date(date).getTime() : NaN; return Number.isFinite(value) ? [new Date(value).toISOString()] : []; })
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return {
    id: plan.id,
    brief: plan.brief,
    notes: plan.accountNotes ?? "",
    lastActivityAt: activityDates.length > 0 ? activityDates[0] : null,
    phases: plan.features.map(feature => {
      const tasks = feature.subFeatures.flatMap(part => part.tasks);
      return {
        slug: feature.slug,
        title: feature.title,
        total: tasks.length,
        done: tasks.filter(task => task.status === "done").length,
        active: tasks.filter(task => task.status === "in_progress").length,
        failed: tasks.filter(task => task.status === "failed").length,
        tasks: tasks.map(task => ({ ref: task.ref, title: task.title, layer: task.layer, status: task.status })),
      };
    }),
    nextTask: next ? { ref: next.ref, title: next.title, layer: next.layer, status: next.status } : null,
    blocked: !next && allTasks.some(task => task.status === "pending"),
  };
}

export type PlanOverview = ReturnType<typeof buildPlanOverview>;
