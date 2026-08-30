import { after } from "next/server";
import { generatePlanStructure } from "./generate";
import { savePlan, deletePlan, updatePlanTitle } from "./storage";
import { finalizeQuota, refundQuota, type QuotaReceipt } from "./quota";
import { logSecurity } from "./security";

export interface GenerationJob {
  planId: string;
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
export function scheduleGeneration(job: GenerationJob, tryNo = 1) {
  after(async () => {
    try {
      const result = await generatePlanStructure(job.brief, job.techPrefs, job.answers, job.tier);
      await savePlan(
        {
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
        },
        job.ownerId,
      );
      await updatePlanTitle(job.planId, result.title);
      await finalizeQuota(job.receipt, job.planId, result.usage);
      await logSecurity("generate", { planId: job.planId, tier: job.tier, features: result.features.length, tokens: result.usage.tokensIn + result.usage.tokensOut, tryNo }, { ip: job.ip, userId: job.userId });
    } catch (error) {
      await refundQuota(job.receipt);
      await deletePlan(job.planId);
      console.error(`[generate][bg try${tryNo}]`, error);
    }
  });
}
