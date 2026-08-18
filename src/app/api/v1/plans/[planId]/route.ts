import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await getRequestUser();
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    brief: plan.brief,
    tier: plan.tier ?? "free",
    warnings: plan.warnings ?? [],
    // Ide tambahan dari user (kolom chat, Pro maks 2/project). WAJIB dibaca
    // agent sebagai referensi tambahan saat mengerjakan task.
    ideas: (plan.ideas ?? []).map((i) => ({ text: i.text, phase: i.phase ?? null, featureTitle: i.featureTitle ?? null })),
    stack: plan.stack,
    asumsi: plan.asumsi,
    features: (plan.features ?? []).map((f) => ({
      title: f.title,
      icon: f.icon,
      description: f.description,
      tujuan: f.tujuan,
      selesaiBila: f.selesaiBila,
      subFeatures: (f.subFeatures ?? []).map((s) => ({
        title: s.title,
        tasks: (s.tasks ?? []).map((t) => ({ ref: t.ref, title: t.title, layer: t.layer, phase: t.phase, status: t.status })),
      })),
    })),
  });
}
