import { writeOriginGate } from "@/lib/write-origin";
import { claimGeneration, releaseGeneration, ownsGeneration } from "@/lib/generation-lease";
import { finalizeGeneratedPlan } from "@/lib/generated-plan";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { accessPlan, getRequestUser } from "@/lib/api-auth";
import { getPlan } from "@/lib/storage";

// Each invocation fills one batch. Progress polling starts the next batch;
// reopening a project resumes its remaining phases without regenerating tasks.

function featureHasTasks(feature: import("@/lib/types").Feature): boolean {
  return (feature.subFeatures ?? []).some((sf) => (sf.tasks ?? []).length > 0);
}

async function generateAllTasks(planId: string, userId: string, authHeaders: Record<string, string>, origin: string, lease: string, legacyUserId?: string) {
  try {
    // One batch stays within the route budget, including model repair.
    const MAX_BATCH = 1;
    for (let batch = 0; batch < MAX_BATCH; batch++) {
      if (!await ownsGeneration(planId, "tasks", lease)) break;
      const plan = await getPlan(planId);
      if (!plan) break;

      if (plan.status !== "generating") break;

      const pendingIdx: number[] = [];
      (plan.features ?? []).forEach((f, i: number) => {
        if (!featureHasTasks(f)) pendingIdx.push(i);
      });

      if (pendingIdx.length === 0) {
        // Semua fitur terisi -> finalisasi: inject fase "QA & Integrasi" bila
        // belum ada (helper idempoten, dipakai bersama generate-tasks) lalu
        // tandai ready. plan di-fetch fresh di awal iterasi ini (setelah batch
        // sebelumnya tuntas), jadi snapshot-nya tidak basi — ini yang dulu
        // bikin QA & Integrasi bolong saat fitur digenerate paralel.
        const anyTask = (plan.features ?? []).some((f) => featureHasTasks(f));
        if (anyTask) {
          await finalizeGeneratedPlan(plan, plan.userId ?? userId, { stage: "tasks", token: lease });
        }
        break;
      }

      // Ambil 8 fitur per batch: free tier maksimal 8 fitur, jadi umumnya satu
      // gelombang kelar semua (tidak ada nunggu gelombang kedua).
      const batchIdx = pendingIdx.slice(0, 8);
      let rateLimited = false;
      await Promise.all(
        batchIdx.map(async (featureIndex) => {
          try {
            // URL absolut dari request asli — di Vercel gak bisa pake localhost
            // (self-loop gagal), dan PORT env gak selalu diset di serverless.
            const base = origin;
            const legacyQuery = legacyUserId ? `?userId=${encodeURIComponent(legacyUserId)}` : "";
            const res = await fetch(`${base}/api/plans/${planId}/generate-tasks${legacyQuery}`, {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({ featureIndex }),
              signal: AbortSignal.timeout(265_000),
            });
            const data = await res.json().catch(() => null);
            if (res.status === 429) rateLimited = true;
            if (data?.error) {
              console.warn(`[generate-all] F${featureIndex + 1} error:`, data.error);
            }
          } catch (err) {
            console.warn(`[generate-all] F${featureIndex + 1} failed:`, err instanceof Error ? err.message : err);
          }
        }),
      );
      if (rateLimited) break;
    }
  } finally {
    await releaseGeneration(planId, "tasks", lease);
  }
}

// Loop task bisa berjalan menit — after() menjaga function tetap hidup di Vercel.
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const originGate = writeOriginGate(request);
  if (originGate) return originGate;
  try {
    const { planId } = await params;
    const legacyUserId = new URL(request.url).searchParams.get("userId");
    const user = await getRequestUser(legacyUserId);
    const { plan, error } = await accessPlan(planId, user, { write: true });
    if (error || !plan) return error;
    if (plan.physical) return NextResponse.json({ ok: plan.status === "ready", skipped: true, message: "Hardware tasks are generated with the engineering plan." });
    const ownerId = plan.userId ?? "";

    if (plan.status !== "generating") {
      return NextResponse.json({ ok: true, alreadyDone: true, status: plan.status });
    }

    const lease = await claimGeneration(planId, "tasks");
    if (!lease) {
      return NextResponse.json({ ok: true, alreadyRunning: true });
    }

    // Teruskan identitas request asli (Bearer token / cookie) ke self-fetch
    // generate-tasks — dulu loop manggil tanpa auth dan 401 semua diam-diam.
    const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
    const bearer = request.headers.get("authorization");
    if (bearer) authHeaders.Authorization = bearer;
    const cookie = request.headers.get("cookie");
    if (cookie) authHeaders.Cookie = cookie;

    // Fire-and-forget: loop jalan di server process, request balas langsung.
    const legacyIdentity = user?.via === "legacy-dev" ? user.email ?? user.userId : undefined;
    after(() => generateAllTasks(planId, ownerId, authHeaders, new URL(request.url).origin, lease, legacyIdentity));

    return NextResponse.json({ ok: true, started: true, features: (plan.features ?? []).length });
  } catch (error) {
    console.error("[generate-all]", error);
    return NextResponse.json({ error: "Tasks could not be generated. Please try again." }, { status: 500 });
  }
}
