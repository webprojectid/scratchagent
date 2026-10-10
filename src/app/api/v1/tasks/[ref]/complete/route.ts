import { apiText } from "@/lib/ui-messages";
import { recordAccountActivity } from "@/lib/account-store";
import { NextResponse } from "next/server";
import { accessPlan, getRequestUser, unauthorized } from "@/lib/api-auth";
import { completeTask } from "@/lib/tasks";

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const user = await getRequestUser();
  if (!user) return unauthorized();

  const { ref } = await params;
  const decoded = decodeURIComponent(ref);
  const planId = new URL(request.url).searchParams.get("planId");
  if (!planId) return NextResponse.json({ error: apiText("planId wajib") }, { status: 400 });

  const { error } = await accessPlan(planId, user, { write: true });
  if (error) return error;

  const task = await completeTask(planId, decoded);
  if (!task) return NextResponse.json({ error: apiText("Task tidak ditemukan") }, { status: 404 });
  await recordAccountActivity(user.userId, "agent_work", "Agent menyelesaikan task: " + decoded, planId);
  return NextResponse.json({ ok: true, ref: decoded, status: task.status });
}
