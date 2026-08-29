import { NextResponse } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getPlan, savePlan, updatePlanStatus } from "@/lib/storage";
import { ensureQaPhase } from "@/lib/tasks";

// Generate SEMUA task di sisi server, digerakkan di background process —
// bukan loop fetch di browser. Dulu loop di plan-client.tsx mati kalau tab
// ditutup/refresh, bikin plan bolong (bug "cuma sampai fase 2").
//
// Cara pakai: POST sekali saat halaman project kebuka dan status "generating".
// Idempoten: kalau generate-all untuk plan ini sudah berjalan, langsung OK.
// Progress tetap dipantau browser via polling /progress (sudah ada).

// Registry in-process: planId -> status loop
const running = new Map<string, { startedAt: number; done: boolean }>();

function featureHasTasks(feature: any): boolean {
  return (feature.subFeatures ?? []).some((sf: any) => (sf.tasks ?? []).length > 0);
}

async function generateAllTasks(planId: string, userId: string, authHeaders: Record<string, string>, origin: string) {
  const state = running.get(planId)!;
  try {
    // Loop sampai semua fitur terisi atau mentok maxBatch (anti infinity loop
    // kalau LLM/gateway konsisten gagal — fitur gagal dicoba lagi di batch berikut).
    const MAX_BATCH = 20;
    for (let batch = 0; batch < MAX_BATCH; batch++) {
      const plan = await getPlan(planId);
      if (!plan) break;

      if (plan.status !== "generating") break;

      const pendingIdx: number[] = [];
      (plan.features ?? []).forEach((f: any, i: number) => {
        if (!featureHasTasks(f)) pendingIdx.push(i);
      });

      if (pendingIdx.length === 0) {
        // Semua fitur terisi -> finalisasi: inject fase "QA & Integrasi" bila
        // belum ada (helper idempoten, dipakai bersama generate-tasks) lalu
        // tandai ready. plan di-fetch fresh di awal iterasi ini (setelah batch
        // sebelumnya tuntas), jadi snapshot-nya tidak basi — ini yang dulu
        // bikin QA & Integrasi bolong saat fitur digenerate paralel.
        const anyTask = (plan.features ?? []).some((f: any) => featureHasTasks(f));
        if (anyTask) {
          const { ready } = ensureQaPhase(plan);
          if (ready) await updatePlanStatus(planId, "ready");
          await savePlan(plan, userId);
        }
        break;
      }

      // Ambil 8 fitur per batch: free tier maksimal 8 fitur, jadi umumnya satu
      // gelombang kelar semua (tidak ada nunggu gelombang kedua).
      const batchIdx = pendingIdx.slice(0, 8);
      await Promise.all(
        batchIdx.map(async (featureIndex) => {
          try {
            // URL absolut dari request asli — di Vercel gak bisa pake localhost
            // (self-loop gagal), dan PORT env gak selalu diset di serverless.
            const base = origin;
            const res = await fetch(`${base}/api/plans/${planId}/generate-tasks`, {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({ featureIndex }),
              signal: AbortSignal.timeout(300_000),
            });
            const data = await res.json().catch(() => null);
            if (data?.error) {
              console.warn(`[generate-all] F${featureIndex + 1} error:`, data.error);
            }
          } catch (err) {
            console.warn(`[generate-all] F${featureIndex + 1} failed:`, err instanceof Error ? err.message : err);
          }
        }),
      );
    }
  } finally {
    state.done = true;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const legacyUserId = new URL(request.url).searchParams.get("userId");
    const user = await getRequestUser(legacyUserId);
    const { plan, error } = await accessPlan(planId, user, { write: true });
    if (error || !plan) return error;
    const ownerId = user?.userId ?? plan.userId ?? "";

    if (plan.status !== "generating") {
      return NextResponse.json({ ok: true, alreadyDone: true, status: plan.status });
    }

    const existing = running.get(planId);
    if (existing && !existing.done) {
      return NextResponse.json({ ok: true, alreadyRunning: true });
    }

    // Teruskan identitas request asli (Bearer token / cookie) ke self-fetch
    // generate-tasks — dulu loop manggil tanpa auth dan 401 semua diam-diam.
    const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
    const bearer = request.headers.get("authorization");
    if (bearer) authHeaders.Authorization = bearer;
    const cookie = request.headers.get("cookie");
    if (cookie) authHeaders.Cookie = cookie;

    running.set(planId, { startedAt: Date.now(), done: false });
    // Fire-and-forget: loop jalan di server process, request balas langsung.
    void generateAllTasks(planId, ownerId, authHeaders, new URL(request.url).origin);

    return NextResponse.json({ ok: true, started: true, features: (plan.features ?? []).length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generate-all gagal" }, { status: 500 });
  }
}
