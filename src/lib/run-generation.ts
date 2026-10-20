import { canResumeGeneration, nextGenerationFailure } from "./generation-recovery";
import { claimGeneration, releaseGeneration, reserveGenerationAttempt, withGenerationLease } from "./generation-lease";
import { recordAccountActivity } from "./account-store";
import type { HandoffSettings } from "./account-preferences";
import { after } from "next/server";
import { generatePlanStructure } from "./generate";
import { savePlan, updatePlanTitle, getPlan } from "./storage";
import { emptyGenerationCheckpoint, runGenerationSlice } from "./generation-checkpoint";
import { clearGenerationWork, getGenerationWork, saveGenerationWork } from "./generation-checkpoint-store";
import { finalizeQuota, refundQuota, recordUsage, type QuotaReceipt } from "./quota";
import { logSecurity } from "./security";
import { GenerationOutputRejected } from "./generation-output";

export interface GenerationJob {
  planId: string;
  handoff?: HandoffSettings;
  brief: string;
  techPrefs: {
    mode: "auto" | "custom";
    frontend?: string;
    backend?: string;
    database?: string;
    deployment?: string;
  };
  answers: { question: string; answer: string }[];
  tier: "free" | "pro";
  ownerId: string;
  userId: string;
  /** Continuations recover the original receipt from the saved checkpoint. */
  receipt: QuotaReceipt;
  ip?: string;
}

/** One bounded wave per invocation; polling resumes saved work. */
export async function scheduleGeneration(job: GenerationJob, tryNo = 1): Promise<boolean> {
  if (!canResumeGeneration((await getGenerationWork(job.planId))?.failure)) return false;
  const lease = await claimGeneration(job.planId, "structure", 200);
  if (!lease) return false;
  try {
    if (!await reserveGenerationAttempt(job.userId, job.tier)) {
      await releaseGeneration(job.planId, "structure", lease);
      return false;
    }
    if (job.receipt.eventId) {
      const initialized = await withGenerationLease(job.planId, "structure", lease, async () => {
        if (!await getGenerationWork(job.planId)) {
          await saveGenerationWork(job.planId, { checkpoint: emptyGenerationCheckpoint(), receipt: job.receipt });
        }
        return true;
      });
      if (!initialized) {
        await releaseGeneration(job.planId, "structure", lease);
        return false;
      }
    }
    after(async () => {
      let receipt = job.receipt;
      let loaded = false;
      let acceptedBefore = 0;
      try {
        const plan = await getPlan(job.planId);
        if (!plan || plan.status !== "generating" || plan.features.length) return;
        const saved = await getGenerationWork(job.planId);
        receipt = saved?.receipt ?? job.receipt;
        loaded = true;
        const checkpoint = saved?.checkpoint ?? emptyGenerationCheckpoint();
        const persist = async (next: typeof checkpoint) => {
          const stored = await withGenerationLease(job.planId, "structure", lease, async () => {
            await saveGenerationWork(job.planId, { ...saved, checkpoint: next, receipt });
            return true;
          });
          if (!stored) throw new Error("Generation was superseded.");
        };
        if (!saved) await persist(checkpoint);
        const completedBefore = Object.keys(checkpoint.entries).length;
        acceptedBefore = completedBefore;
        const slice = await runGenerationSlice(checkpoint, persist, () =>
          generatePlanStructure(job.brief, job.techPrefs, job.answers, job.tier, job.handoff), { concurrency: 3 });
        if (!slice.done) {
          if (Object.keys(checkpoint.entries).length > completedBefore) {
            await withGenerationLease(job.planId, "structure", lease, async () => {
              const work = await getGenerationWork(job.planId);
              if (work?.failure) await saveGenerationWork(job.planId, { ...work, failure: undefined });
            });
          }
          return;
        }
        const result = slice.value;
        await withGenerationLease(job.planId, "structure", lease, async () => {
          await savePlan({
            id: job.planId,
            title: result.title,
            brief: job.brief,
            stack: result.stack,
            techStack: result.techStack,
            asumsi: result.asumsi,
            requirements: result.requirements,
            userFlow: result.userFlow,
            architecture: result.architecture,
            productSpec: result.productSpec,
            generationMetrics: result.usage.requests,
            databaseSchema: result.databaseSchema,
            status: "generating",
            features: result.features as never,
            warnings: result.warnings,
            tier: job.tier,
            createdAt: new Date().toISOString(),
          }, job.ownerId);
          await updatePlanTitle(job.planId, result.title);
          // Watchdog retries have no reservation event; record their successful
          // model usage without finalizing the original reservation again.
          if (receipt.eventId) await finalizeQuota(receipt, job.planId, result.usage);
          else await recordUsage(job.userId, job.tier, job.planId, result.usage);
          await clearGenerationWork(job.planId);
          await recordAccountActivity(job.userId, "generation_complete", "Struktur PRD selesai disusun", job.planId, `generation:${job.planId}`);
          await logSecurity("generate", { planId: job.planId, tier: job.tier, features: result.features.length, tokens: result.usage.tokensIn + result.usage.tokensOut, tryNo }, { ip: job.ip, userId: job.userId });
        });
      } catch (error) {
        if (loaded) await withGenerationLease(job.planId, "structure", lease, async () => {
          const work = await getGenerationWork(job.planId);
          if (!work) return;
          const madeProgress = Object.keys(work.checkpoint.entries).length > acceptedBefore;
          const failure = nextGenerationFailure(madeProgress ? undefined : work.failure);
          if (error instanceof GenerationOutputRejected) {
            failure.paused = true;
            failure.message = `The ${error.stage} section needs correction. Accepted sections are saved and allowance restored.`;
          }
          await saveGenerationWork(job.planId, { ...work, failure });
          if (failure.paused) {
            await refundQuota(receipt);
            await recordAccountActivity(job.userId, "generation_failed", "PRD generation paused; accepted sections saved and allowance restored", job.planId);
          }
        });
        console.error(`[generate][bg try${tryNo}]`, error);
      } finally {
        await releaseGeneration(job.planId, "structure", lease);
      }
    });
  } catch (error) {
    await releaseGeneration(job.planId, "structure", lease);
    throw error;
  }
  return true;
}
