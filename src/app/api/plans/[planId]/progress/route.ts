import { NextResponse } from "next/server";
import { getPlan } from "@/lib/storage";
import { allTasks } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });

  const tasks = allTasks(plan);
  const done = tasks.filter((t) => t.status === "done").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;

  return NextResponse.json({
    planId,
    status: plan.status,
    title: plan.title,
    total: tasks.length,
    done,
    failed,
    inProgress,
    pending: tasks.length - done - failed - inProgress,
    features: (plan.features ?? []).map((f: any) => ({
      slug: f.slug,
      title: f.title,
      subFeatures: (f.subFeatures ?? []).map((sf: any) => ({
        title: sf.title,
        tujuan: sf.tujuan,
        selesaiBila: sf.selesaiBila,
        tasks: (sf.tasks ?? []).map((t: any) => ({ ref: t.ref, title: t.title, layer: t.layer, phase: t.phase, page: t.page, deps: t.deps, status: t.status })),
      })),
    })),
  });
}
