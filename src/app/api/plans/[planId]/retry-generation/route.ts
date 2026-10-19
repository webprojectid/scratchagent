import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { writeOriginGate } from "@/lib/write-origin";
import { claimGeneration, releaseGeneration, withGenerationLease } from "@/lib/generation-lease";
import { getGenerationWork, saveGenerationWork } from "@/lib/generation-checkpoint-store";
import { consumeQuota, refundQuota, type QuotaReceipt } from "@/lib/quota";
import { isAdminEmail } from "@/lib/billing";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const originError = writeOriginGate(request);
  if (originError) return originError;
  const user = await getRequestUser(new URL(request.url).searchParams.get("userId"));
  const { planId } = await params;
  const { plan, error } = await accessPlan(planId, user, { write: true });
  if (error || !plan) return error;
  if (!user || !plan.userId || plan.status !== "generating" || plan.features.length) return NextResponse.json({ error: "This plan cannot be resumed here." }, { status: 409 });
  const lease = await claimGeneration(plan.id, "structure");
  if (!lease) return NextResponse.json({ error: "Generation is already running." }, { status: 409 });
  let receipt: QuotaReceipt | null = null;
  let committed = false;
  try {
    const response = await withGenerationLease(plan.id, "structure", lease, async () => {
      const saved = await getGenerationWork(plan.id);
      if (!saved?.failure?.paused) return NextResponse.json({ error: "Generation is not paused." }, { status: 409 });
      receipt = await consumeQuota(plan.userId!, plan.tier ?? "free", { skipLimit: await isAdminEmail(user.email) });
      if (!receipt) return NextResponse.json({ error: "Your plan allowance is currently used. Try again when it resets." }, { status: 429 });
      await saveGenerationWork(plan.id, { checkpoint: saved.checkpoint, receipt });
      committed = true;
      // Authenticated progress polling schedules the next saved section.
      return NextResponse.json({ ok: true });
    });
    return response ?? NextResponse.json({ error: "Generation changed. Refresh this plan." }, { status: 409 });
  } catch {
    if (receipt && !committed) await refundQuota(receipt);
    return NextResponse.json({ error: "The saved plan could not be resumed. Please try again." }, { status: 500 });
  } finally {
    await releaseGeneration(plan.id, "structure", lease);
  }
}
