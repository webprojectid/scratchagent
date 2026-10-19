import { getGenerationWork } from "@/lib/generation-checkpoint-store";
import { getProjectState } from "@/lib/account-store";
import { writeOriginGate } from "@/lib/write-origin";
import { NextResponse } from "next/server";
import { scheduleGeneration } from "@/lib/run-generation";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { allTasks, getPlan } from "@/lib/storage";
import { getProgressRevision, type ProgressRevision } from "@/lib/plan-progress";
import { RATE_LIMITS, clientKey, getClientIp, rateLimit, rateLimitedResponse } from "@/lib/security";

// Each request can resume one persisted structure section in after().
export const maxDuration = 300;

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const ip = await getClientIp(request);
  const key = `progress:${clientKey(user?.userId, ip)}`;
  const retryIn = rateLimit(key, RATE_LIMITS.agent.limit, RATE_LIMITS.agent.windowMs);
  if (retryIn !== null) return rateLimitedResponse(key, retryIn, { ip, userId: user?.userId ?? null, route: "/api/plans/[id]/progress" });
  const { plan: header, error } = await accessPlan(planId, user, { loadPlan: getProgressRevision });
  if (error || !header) return error;
  const revision = header as ProgressRevision;
  const etag = `"${revision.progressVersion}"`;
  const responseHeaders = { ETag: etag, "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };
  const needsContinuation = header.status === "generating" && revision.featureCount === 0 &&
    !!user && (!user.tokenPolicy || user.tokenPolicy.access === "write") && !writeOriginGate(request);
  if (request.headers.get("if-none-match") === etag && !needsContinuation && header.status !== "generating") {
    return new NextResponse(null, { status: 304, headers: responseHeaders });
  }
  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404, headers: responseHeaders });

  if (needsContinuation && plan.status === "generating" && plan.features.length === 0) {
    const writeAccess = user
      ? await accessPlan(planId, user, { write: true, loadPlan: async () => plan })
      : null;
    if (writeAccess?.plan && user) {
      const snapshot = await getProjectState(planId);
      await scheduleGeneration(
        {
          planId,
          brief: plan.brief,
          techPrefs: snapshot.generationInput?.techPrefs ?? { mode: 'auto' },
          handoff: snapshot.generationSettings ?? undefined,
          answers: snapshot.generationInput?.answers ?? [],
          tier: plan.tier ?? 'free',
          ownerId: plan.userId ?? '',
          userId: user.userId,
          receipt: { userId: plan.userId ?? '', tier: plan.tier ?? 'free' },
        },
        2,
      );
    }
  }

  const generationFailure = plan.status === "generating" && !plan.features.length ? (await getGenerationWork(plan.id))?.failure : undefined;
  const tasks = allTasks(plan);
  const done = tasks.filter((t) => t.status === "done").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;

  return NextResponse.json({
    planId,
    generationFailure,
    status: plan.status,
    title: plan.title,
    total: tasks.length,
    done,
    failed,
    inProgress,
    pending: tasks.length - done - failed - inProgress,
    features: (plan.features ?? []).map((f) => ({
      slug: f.slug,
      title: f.title,
      subFeatures: (f.subFeatures ?? []).map((sf) => ({
        title: sf.title,
        tujuan: sf.tujuan,
        selesaiBila: sf.selesaiBila,
        tasks: (sf.tasks ?? []).map((t) => ({ detail: t.detail, ref: t.ref, title: t.title, layer: t.layer, phase: t.phase, page: t.page, deps: t.deps, status: t.status })),
      })),
    })),
  }, { headers: responseHeaders });
}
