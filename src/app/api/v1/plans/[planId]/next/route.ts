import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getNextTask } from "@/lib/tasks";
import { recordAccountActivity } from "@/lib/account-store";
import { RATE_LIMITS, clientKey, getClientIp, rateLimit, rateLimitedResponse } from "@/lib/security";

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await getRequestUser();
  // Rem laju longgar untuk polling agent CLI (300/menit per key).
  const ip = await getClientIp(request);
  const rl = RATE_LIMITS.agent;
  const retryIn = rateLimit(clientKey(user?.userId, ip), rl.limit, rl.windowMs);
  if (retryIn !== null) return rateLimitedResponse(clientKey(user?.userId, ip), retryIn, { ip, userId: user?.userId ?? null, route: "/api/v1/plans/[id]/next" });
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;
  const next = await getNextTask(planId, plan);
  if (user && next.blocked) await recordAccountActivity(user.userId, "agent_blocked", "Agent menunggu penyelesaian dependensi", planId, `blocked:${planId}:${next.failedTasks.map(task => task.ref).join(",")}`);
  if (user && next.progress.checkpoint) await recordAccountActivity(user.userId, "checkpoint", "Checkpoint agent perlu ditinjau", planId, `checkpoint:${planId}:${next.task?.ref}`);
  return NextResponse.json(next);
}
