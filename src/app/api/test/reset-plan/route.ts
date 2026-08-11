import { NextResponse } from "next/server";
import { allTasks, getPlan, updatePlanStatus, updateTask } from "@/lib/storage";

// Endpoint test: reset semua task di plan kembali ke pending, plan status -> ready.
export async function POST(request: Request) {
  const { planId } = await request.json().catch(() => ({} as { planId?: string }));
  if (!planId) return NextResponse.json({ error: "planId wajib" }, { status: 400 });

  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });

  const tasks = allTasks(plan);
  for (const t of tasks) {
    await updateTask(planId, t.ref, {
      status: "pending",
      startedAt: null,
      completedAt: null,
      failReason: null,
      lastFailReason: null,
      retryCount: 0,
    });
  }
  await updatePlanStatus(planId, "ready");

  return NextResponse.json({ ok: true, planId, resetTasks: tasks.length, status: "ready" });
}
