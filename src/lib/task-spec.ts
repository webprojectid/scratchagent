import { z } from "zod";
import type { Feature, Plan, Task } from "./types";
import type { ProductSpec } from "./product-spec";

export const taskDetailSchema = z.object({
  objective: z.string().min(8).max(500),
  requirementIds: z.array(z.string()).min(1).max(8),
  deliverables: z.array(z.string().min(5).max(350)).min(1).max(3),
  acceptanceCriteria: z.array(z.string().min(8).max(400)).min(1).max(3),
  tests: z.array(z.object({ scenario: z.enum(["success", "failure", "duplicate", "concurrency", "recovery"]), action: z.string().min(8).max(400), expected: z.string().min(8).max(400) })).min(1).max(3),
  prerequisiteRequirementIds: z.array(z.string()).max(8).default([]),
});
export type TaskDetail = z.infer<typeof taskDetailSchema>;

export function validateTaskDetails(tasks: { detail?: TaskDetail }[], spec?: ProductSpec, allowedIds?: string[]): string[] {
  if (!spec) return [];
  const known = new Set(spec.requirements.map(requirement => requirement.id));
  const issues: string[] = [];
  for (const [index, task] of tasks.entries()) {
    if (!task.detail) { issues.push(`tasks[${index}]: detail with outcome, acceptance and tests is required`); continue; }
    for (const id of task.detail.requirementIds) if (!known.has(id) || (allowedIds?.length && !allowedIds.includes(id))) issues.push(`tasks[${index}]: ${id} is not owned by this phase`);
    const prerequisites = new Set(spec.requirements.filter(r => task.detail?.requirementIds.includes(r.id)).flatMap(r => r.dependsOn ?? []));
    for (const id of task.detail.prerequisiteRequirementIds) {
      if (!known.has(id)) issues.push(`tasks[${index}]: unknown prerequisite ${id}`);
      else if (!prerequisites.has(id)) issues.push(`tasks[${index}]: prerequisite ${id} is not declared in the canonical requirement graph`);
    }
  }
  for (const requirement of spec.requirements.filter(requirement => allowedIds?.includes(requirement.id))) {
    const linked = tasks.filter(task => task.detail?.requirementIds.includes(requirement.id));
    if (!linked.length) issues.push(`${requirement.id}: no implementing task`);
    const scenarios = new Set(linked.flatMap(task => task.detail?.tests.map(test => test.scenario) ?? []));
    for (const scenario of requirement.verification) if (!scenarios.has(scenario)) issues.push(`${requirement.id}: missing ${scenario} test with expected result`);
  }
  return issues;
}

/** Resolve declared prerequisites after all phases exist; preserve existing local edges. */
export function connectRequirementDependencies(plan: Pick<Plan, "features" | "productSpec">): void {
  if (!plan.productSpec) return;
  const tasks = plan.features.flatMap(feature => feature.subFeatures.flatMap(sub => sub.tasks));
  const byRef = new Map(tasks.map(task => [task.ref, task]));
  const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return (byRef.get(from)?.deps ?? []).some(dep => reaches(dep, target, seen));
  };
  for (const task of tasks) {
    const required = new Set([...(task.detail?.prerequisiteRequirementIds ?? []), ...plan.productSpec.requirements.filter(r => task.detail?.requirementIds.includes(r.id)).flatMap(r => r.dependsOn ?? [])]);
    for (const id of required) {
      const prerequisiteTasks = tasks.filter(other => other.phase < task.phase && other.detail?.requirementIds.includes(id));
      // The consuming task waits for every declared outcome, including its verification.
      for (const predecessor of prerequisiteTasks) if (!task.deps.includes(predecessor.ref) && !reaches(predecessor.ref, task.ref)) task.deps.push(predecessor.ref);
    }
  }
}

export interface PlanQualityMetadata {
  generationMetrics?: Plan["generationMetrics"];
  productSpec?: ProductSpec;
  phaseRequirements?: Record<string, string[]>;
  subfeatureRequirements?: Record<string, string[]>;
  taskDetails?: Record<string, TaskDetail>;
}

export function qualityMetadata(plan: Pick<Plan, "features" | "productSpec" | "generationMetrics">): PlanQualityMetadata {
  return {
    ...(plan.generationMetrics ? { generationMetrics: plan.generationMetrics } : {}),
    ...(plan.productSpec ? { productSpec: plan.productSpec } : {}),
    phaseRequirements: Object.fromEntries(plan.features.filter(f => f.requirementIds?.length).map(f => [f.slug, f.requirementIds!])),
    subfeatureRequirements: Object.fromEntries(plan.features.flatMap(f => f.subFeatures.filter(s => s.requirementIds?.length).map(s => [`${f.slug}::${s.title}`, s.requirementIds!]))),
    taskDetails: Object.fromEntries(plan.features.flatMap(f => f.subFeatures.flatMap(s => s.tasks.filter(t => t.detail).map(t => [t.ref, t.detail!])))),
  };
}

export function hydrateQuality(features: Feature[], meta: PlanQualityMetadata): void {
  for (const feature of features) {
    feature.requirementIds = meta.phaseRequirements?.[feature.slug];
    for (const sub of feature.subFeatures) {
      sub.requirementIds = meta.subfeatureRequirements?.[`${feature.slug}::${sub.title}`];
      for (const task of sub.tasks) task.detail = meta.taskDetails?.[task.ref];
    }
  }
}

export function completionCriteria(task: Task): string[] { return task.detail?.acceptanceCriteria ?? []; }

export function enrichReleaseTasks(plan: Plan): boolean {
  if (!plan.productSpec) return false;
  let changed = false;
  const release = plan.features.at(-1)?.subFeatures.find(sub => /^(?:QA & Integration|QA & Integrasi)$/i.test(sub.title));
  for (const [index, task] of (release?.tasks ?? []).entries()) {
    const prerequisites = [...new Set([...task.deps, ...plan.features.flatMap(f => f.subFeatures.filter(s => s !== release).flatMap(s => s.tasks.map(t => t.ref))), ...(release?.tasks.slice(0, index).map(t => t.ref) ?? [])])];
    if (JSON.stringify(prerequisites) !== JSON.stringify(task.deps)) { task.deps = prerequisites; changed = true; }
    if (task.detail) continue;
    const spec = plan.productSpec;
    const requirements = spec.requirements.filter((_, i) => i % 4 === index);
    task.detail = {
      objective: `${task.title}: ${spec.problem}`.slice(0, 500),
      requirementIds: requirements.map(r => r.id), deliverables: ["Release verification record with evidence, unresolved defects and responsible reviewer"],
      acceptanceCriteria: spec.rollout.releaseChecks.slice(index, index + 1).concat(["Record observed results; unresolved release blockers prevent approval"]),
      tests: requirements.slice(0, 3).map(r => ({ scenario: "success" as const, action: `Verify the implemented workflow: ${r.statement}`.slice(0, 400), expected: "Record evidence against the linked requirement and its implementing tasks; report any discrepancy" })),
      prerequisiteRequirementIds: [],
    };
    changed = true;
  }
  return changed;
}
