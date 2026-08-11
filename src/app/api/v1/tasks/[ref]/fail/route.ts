import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { failTask } from "@/lib/tasks";

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const user = await getAuthUser();
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
  const task = planId ? await failTask(planId, reason, decoded) : await failTask(decoded, reason);
  if (!task) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true, ref: decoded, status: task.status });
}
