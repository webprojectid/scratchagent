import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await getRequestUser();
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;
  if (plan.physical) {
    if (new URL(_request.url).searchParams.get("protocol") !== "2") return NextResponse.json({ error: "This hardware plan requires a CLI supporting protocol v2." }, { status: 426 });
    const { renderPhysicalPrd, renderPhysicalHandoff } = await import("@/lib/physical-document");
    return NextResponse.json({ ...plan, protocol: 2, document: renderPhysicalPrd(plan), agentHandoff: renderPhysicalHandoff(plan) });
  }

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
    generationSettings: plan.generationSettings ?? null,
    requirements: plan.requirements ?? null,
    userFlow: plan.userFlow ?? [],
    architecture: plan.architecture ?? "",
    databaseSchema: plan.databaseSchema ?? "",
    features: (plan.features ?? []).map((f) => ({
      title: f.title,
      icon: f.icon,
      description: f.description,
      tujuan: f.tujuan,
      selesaiBila: f.selesaiBila,
      subFeatures: (f.subFeatures ?? []).map((s) => ({
        title: s.title,
        tujuan: s.tujuan ?? "", selesaiBila: s.selesaiBila ?? [],
        tasks: (s.tasks ?? []).map((t) => ({ ref: t.ref, title: t.title, layer: t.layer, phase: t.phase, status: t.status, deps: t.deps, page: t.page })),
      })),
    })),
  });
}
