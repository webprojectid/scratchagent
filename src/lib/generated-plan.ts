import type { Plan } from "./types";
import { withPlanMutation } from "./plan-mutation";
import { getPlan, savePlan, updatePlanStatus } from "./storage";
import { ensureQaPhase } from "./tasks";
import { ownsGeneration } from "./generation-lease";

export async function finalizeGeneratedPlan(plan: Plan, ownerId: string, lease?: { stage: string; token: string }): Promise<boolean> {
  return withPlanMutation(plan.id, async () => {
    if (lease && !await ownsGeneration(plan.id, lease.stage, lease.token, true)) return false;
    await savePlan(plan, ownerId);
    const stored = await getPlan(plan.id);
    if (!stored) throw new Error("Generated plan was not saved.");
    const { changed } = ensureQaPhase(stored);
    if (changed) await savePlan(stored, ownerId);
    const complete = stored.features.length > 0 && stored.features.every(feature => feature.subFeatures.some(sub => sub.tasks.length > 0));
    if (complete && stored.status === "generating") await updatePlanStatus(plan.id, "ready");
    return true;
  });
}
