import { NextResponse } from "next/server";
import { scheduleGeneration } from "@/lib/run-generation";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { allTasks } from "@/lib/storage";

// Pelacak kick watchdog per instance server (cukup perkiraan, bukan sumber kebenaran).
const generationKicks = new Map<string, { n: number; at: number }>();

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const { plan, error } = await accessPlan(planId, user);
  if (error || !plan) return error;

  // Watchdog plan zombie: plan asinkron yang function-nya mati di tengah jalan
  // (kena batas waktu Vercel / crash) tertinggal status generating dengan 0
  // fase selamanya. Kalau umurnya sudah lewat batas, kick ulang generasinya
  // (maksimal 3 kali per instance server) tanpa memotong kuota baru.
  const zombieAgeMs = plan.createdAt ? Date.now() - new Date(plan.createdAt).getTime() : 0;
  if (plan.status === 'generating' && (plan.features ?? []).length === 0 && zombieAgeMs > 7 * 60_000) {
    const kick = generationKicks.get(planId);
    const bolehKick = !kick || (kick.n < 3 && Date.now() - kick.at > 5 * 60_000);
    if (bolehKick) {
      generationKicks.set(planId, { n: (kick?.n ?? 0) + 1, at: Date.now() });
      scheduleGeneration(
        {
          planId,
          brief: plan.brief,
          techPrefs: { mode: 'auto' },
          answers: [],
          tier: plan.tier ?? 'free',
          ownerId: plan.userId ?? '',
          userId: plan.userId ?? '',
          receipt: { userId: plan.userId ?? '', tier: plan.tier ?? 'free' },
        },
        (kick?.n ?? 0) + 2,
      );
    }
  }

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
