import { claimGeneration, releaseGeneration, reserveGenerationAttempt, withGenerationLease } from "./generation-lease";
import { recordAccountActivity } from "./account-store";
import type { HandoffSettings } from "./account-preferences";
import { after } from "next/server";
import { generatePlanStructure } from "./generate";
import { savePlan, deletePlan, updatePlanTitle } from "./storage";
import { finalizeQuota, refundQuota, recordUsage, type QuotaReceipt } from "./quota";
import { logSecurity } from "./security";

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
  /** Receipt kuota dari saat user menekan generate. Retry memakai receipt yang
   * sama tanpa eventId (kuota sudah dibayar di percobaan pertama). */
  receipt: QuotaReceipt;
  ip?: string;
}

/**
 * Jalankan generate struktur PRD di background (after) dan pulihkan kalau
 * gagal: kuota dikembalikan, kerangka plan dibuang. Aman dipanggil ulang
 * (retry) — retry memakai receipt tanpa eventId supaya kuota tidak dobel.
 */
export async function scheduleGeneration(job: GenerationJob, tryNo = 1): Promise<boolean> {
  const lease = await claimGeneration(job.planId, "structure", 4);
  if (!lease) return false;
  try {
    if (!await reserveGenerationAttempt(job.userId, job.tier)) {
      await releaseGeneration(job.planId, "structure", lease);
      return false;
    }
    after(async () => {
      try {
        const result = await generatePlanStructure(job.brief, job.techPrefs, job.answers, job.tier, job.handoff);
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
          if (job.receipt.eventId) await finalizeQuota(job.receipt, job.planId, result.usage);
          else await recordUsage(job.userId, job.tier, job.planId, result.usage);
          await recordAccountActivity(job.userId, "generation_complete", "Struktur PRD selesai disusun", job.planId, `generation:${job.planId}`);
          await logSecurity("generate", { planId: job.planId, tier: job.tier, features: result.features.length, tokens: result.usage.tokensIn + result.usage.tokensOut, tryNo }, { ip: job.ip, userId: job.userId });
        });
      } catch (error) {
        await withGenerationLease(job.planId, "structure", lease, async () => {
          await refundQuota(job.receipt);
          await recordAccountActivity(job.userId, "generation_failed", "Generate PRD gagal; kuota dikembalikan", null);
          await deletePlan(job.planId);
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
