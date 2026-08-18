import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getNextTask } from "@/lib/tasks";
import { RATE_LIMITS, clientKey, getClientIp, rateLimit, rateLimitedResponse } from "@/lib/security";

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await getRequestUser();
  const { error } = await accessPlan(planId, user);
  if (error) return error;

  // Rem laju longgar untuk polling agent CLI (300/menit per key).
  const ip = await getClientIp(request);
  const rl = RATE_LIMITS.agent;
  const retryIn = rateLimit(clientKey(user?.userId, ip), rl.limit, rl.windowMs);
  if (retryIn !== null) return rateLimitedResponse(clientKey(user?.userId, ip), retryIn, { ip, userId: user?.userId ?? null, route: "/api/v1/plans/[id]/next" });

  return NextResponse.json(await getNextTask(planId));
}
