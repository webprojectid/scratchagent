import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { writeOriginGate } from "@/lib/write-origin";
import { readRequestJson, RequestJsonError } from "@/lib/request-json";
import { changePhysicalEvidence, physicalEvidenceInput } from "@/lib/physical-evidence";
import { actorFor } from "@/lib/physical-tasks";
import { TaskConflict } from "@/lib/tasks";
import { RATE_LIMITS, clientKey, getClientIp, rateLimit, rateLimitedResponse } from "@/lib/security";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string; ref: string }> }) {
  const origin = writeOriginGate(request); if (origin) return origin;
  const { planId, ref } = await params;
  const user = await getRequestUser();
  const { plan, error } = await accessPlan(planId, user, { write: true });
  if (error || !plan || !user) return error;
  if (!plan.physical) return NextResponse.json({ error: "Not a hardware project." }, { status: 400 });
  const ip = await getClientIp(request), key = clientKey(user.userId, ip);
  const retry = rateLimit(`hardware-evidence:${key}`, RATE_LIMITS.agent.limit, RATE_LIMITS.agent.windowMs);
  if (retry !== null) return rateLimitedResponse(key, retry, { ip, userId: user.userId, route: "/api/plans/[id]/hardware-tasks/[ref]" });
  try {
    const parsed = physicalEvidenceInput.safeParse(await readRequestJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Invalid evidence request." }, { status: 400 });
    const task = await changePhysicalEvidence(planId, ref, parsed.data, actorFor(user));
    return NextResponse.json({ task });
  } catch (failure) {
    if (failure instanceof TaskConflict) return NextResponse.json({ error: failure.message }, { status: 409 });
    if (failure instanceof RequestJsonError) return NextResponse.json({ error: "Invalid request body." }, { status: failure.status });
    return NextResponse.json({ error: "Evidence could not be saved. Try again." }, { status: 503 });
  }
}
