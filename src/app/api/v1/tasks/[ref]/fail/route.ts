import { writeOriginGate } from "@/lib/write-origin";
import { taskResponse } from "@/lib/task-response";
import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { accessPlan, getRequestUser, unauthorized } from "@/lib/api-auth";
import { failTask } from "@/lib/tasks";
import { recordAccountActivity } from "@/lib/account-store";

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const originGate = writeOriginGate(request);
  if (originGate) return originGate;
  return taskResponse(async () => {
  const user = await getRequestUser();
  if (!user) return unauthorized();

  const { ref } = await params;
  const decoded = decodeURIComponent(ref);
  let reason = "Tanpa alasan";
  try {
    const body = await request.json();
    reason = body?.reason ?? reason;
  } catch {
    try {
      reason = (await request.text()) || reason;
    } catch {
      /* empty */
    }
  }
  const planId = new URL(request.url).searchParams.get("planId");
  if (!planId) return NextResponse.json({ error: apiText("planId wajib") }, { status: 400 });

  const { error } = await accessPlan(planId, user, { write: true });
  if (error) return error;

  const task = await failTask(planId, decoded, reason, { id: user.userId, type: user.via === "token" ? "agent" : "human" });
  if (!task) return NextResponse.json({ error: apiText("Task tidak ditemukan") }, { status: 404 });
  await recordAccountActivity(user.userId, "agent_blocked", `Task ${decoded} gagal dan perlu ditinjau`, planId);
  return NextResponse.json({ ok: true, ref: decoded, status: task.status });
  });
}
