import { NextResponse } from "next/server";
import { getPlan } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const plan = await getPlan(planId);
  if (!plan) return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });

  return NextResponse.json({
    id: plan.id,
    title: plan.title,
    brief: plan.brief,
    stack: plan.stack,
    asumsi: plan.asumsi,
    features: (plan.features ?? []).map((f: any) => ({
      title: f.title,
      icon: f.icon,
      description: f.description,
      tujuan: f.tujuan,
      selesaiBila: f.selesaiBila,
      subFeatures: (f.subFeatures ?? []).map((s: any) => ({
        title: s.title,
        tasks: (s.tasks ?? []).map((t: any) => ({ ref: t.ref, title: t.title, layer: t.layer, phase: t.phase, status: t.status })),
      })),
    })),
  });
}
