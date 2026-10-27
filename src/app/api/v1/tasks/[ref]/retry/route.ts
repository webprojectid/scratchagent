import { writeOriginGate } from "@/lib/write-origin";
import { taskResponse } from "@/lib/task-response";
import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { accessPlan, getRequestUser, unauthorized } from "@/lib/api-auth";
import { retryTask } from "@/lib/tasks";

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const originGate = writeOriginGate(request);
  if (originGate) return originGate;
  return taskResponse(async () => {
  const user = await getRequestUser();
  if (!user) return unauthorized();

  const { ref } = await params;
  const decoded = decodeURIComponent(ref);
  const planId = new URL(request.url).searchParams.get("planId");
  if (!planId) return NextResponse.json({ error: apiText("planId wajib") }, { status: 400 });

  const { error } = await accessPlan(planId, user, { write: true });
  if (error) return error;

  const task = await retryTask(planId, decoded, { id: user.userId, type: user.via === "token" ? "agent" : "human" });
  if (!task) return NextResponse.json({ error: apiText("Task tidak ditemukan") }, { status: 404 });
  return NextResponse.json({ ok: true, ref: decoded, status: task.status });
  });
}
