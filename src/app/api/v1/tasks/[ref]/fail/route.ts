import { NextResponse } from "next/server";
import { accessPlan, getRequestUser, unauthorized } from "@/lib/api-auth";
import { failTask } from "@/lib/tasks";

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
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
  if (!planId) return NextResponse.json({ error: "planId wajib" }, { status: 400 });

  const { error } = await accessPlan(planId, user, { write: true });
  if (error) return error;

  const task = await failTask(planId, decoded, reason);
  if (!task) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true, ref: decoded, status: task.status });
}
