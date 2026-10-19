import { mergeGenerationMetrics } from "./generation-metrics";
import { connectRequirementDependencies, enrichReleaseTasks, validateTaskDetails } from "./task-spec";
import type { Plan } from "./types";
import { withPlanMutation } from "./plan-mutation";
import { getPlan, savePlan, persistTaskDependencies, updatePlanStatus } from "./storage";
import { ensureQaPhase } from "./tasks";
import { ownsGeneration } from "./generation-lease";
import { validateFinalPlan } from "./generation-quality";
import { isAutomaticQaSubFeature } from "./qa-labels";

const QUALITY_WARNING_PREFIX = "Plan is not ready:";

export async function finalizeGeneratedPlan(plan: Plan, ownerId: string, lease?: { stage: string; token: string }): Promise<boolean> {
  return withPlanMutation(plan.id, async () => {
    if (lease && !await ownsGeneration(plan.id, lease.stage, lease.token, true)) return false;
    if (lease?.stage.startsWith("feature-")) {
      const index = Number(lease.stage.slice("feature-".length));
      const current = await getPlan(plan.id);
      const incoming = plan.features[index];
      const target = current?.features[index];
      if (!current || !incoming || !target || incoming.id !== target.id || incoming.title !== target.title) {
        throw new Error("The generated phase no longer matches the stored plan.");
      }
      // Other phases may have finished while this model call was running.
      // Merge only this phase under the plan lock so memory mode cannot lose them.
      if (!target.subFeatures.some(sub => sub.tasks.length > 0)) {
        target.subFeatures = incoming.subFeatures;
        current.generationMetrics = mergeGenerationMetrics(current.generationMetrics, plan.generationMetrics);
        await savePlan(current, ownerId);
      }
    } else if (!lease) {
      await savePlan(plan, ownerId);
    }
    const stored = await getPlan(plan.id);
    if (!stored) throw new Error("Generated plan was not saved.");
    const { changed, ready } = ensureQaPhase(stored);
    const allFeaturesHaveTasks = stored.features.length > 0 && stored.features.every(feature =>
      feature.subFeatures.some(sub => !isAutomaticQaSubFeature(sub.title) && sub.tasks.length > 0)
    );
    const detailChanged = allFeaturesHaveTasks && enrichReleaseTasks(stored);
    if (allFeaturesHaveTasks && stored.productSpec) {
      connectRequirementDependencies(stored);
      await persistTaskDependencies(stored);
    }
    const qualityIssues = allFeaturesHaveTasks ? [
      ...validateFinalPlan(stored),
      ...stored.features.flatMap(f => validateTaskDetails(f.subFeatures.filter(s => !isAutomaticQaSubFeature(s.title)).flatMap(s => s.tasks), stored.productSpec, f.requirementIds)),
    ] : [];
    const priorWarnings = stored.warnings ?? [];
    const nextWarnings = priorWarnings.filter(warning => !warning.startsWith(QUALITY_WARNING_PREFIX));
    if (allFeaturesHaveTasks && qualityIssues.length > 0) {
      nextWarnings.push(`${QUALITY_WARNING_PREFIX} ${qualityIssues.length} structure checks failed. Review the incomplete phases before implementation.`);
    }
    const warningsChanged = nextWarnings.length !== priorWarnings.length ||
      nextWarnings.some((warning, index) => warning !== priorWarnings[index]);
    if (warningsChanged) stored.warnings = nextWarnings;
    if (changed || detailChanged || warningsChanged) await savePlan(stored, ownerId);
    if (ready && allFeaturesHaveTasks && qualityIssues.length === 0 && stored.status === "generating") {
      await updatePlanStatus(plan.id, "ready");
    }
    return true;
  });
}
