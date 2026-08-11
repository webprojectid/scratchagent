import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { startTask } from "@/lib/tasks";

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { ref } = await params;
  const decoded = decodeURIComponent(ref);
  const planId = new URL(request.url).searchParams.get("planId");
  const task = planId ? await startTask(planId, decoded) : await startTask(decoded);
  if (!task) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true, ref: decoded, status: task.status });
}
