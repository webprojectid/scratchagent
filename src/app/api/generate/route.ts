import { writeOriginGate } from "@/lib/write-origin";
import { resolveLlmProviders } from "@/lib/llm-config";
import { apiText } from "@/lib/ui-messages";
import { getAccountSettings, saveProjectState } from "@/lib/account-store";
import { handoffSettingsSchema, resolveHandoff, effectiveTechPrefs } from "@/lib/account-preferences";
import { NextResponse } from "next/server";
import { scheduleGeneration } from "@/lib/run-generation";
import { z } from "zod";
import { getRequestUser, planOwnerKey, unauthorized } from "@/lib/api-auth";
import { savePlan, deletePlan } from "@/lib/storage";
import { refundQuota, consumeQuota, getQuota } from "@/lib/quota";
import { getAccountState, isAdminEmail } from "@/lib/billing";
import { RATE_LIMITS, blockedIpResponse, clientKey, getClientIp, logSecurity, rateLimit, rateLimitedResponse } from "@/lib/security";
import { randomUUID } from "crypto";

const input = z.object({
  brief: z.string().trim().min(3).max(5000),
  techPrefs: z.object({
    mode: z.enum(["auto", "custom"]),
    frontend: z.string().optional(),
    backend: z.string().optional(),
    database: z.string().optional(),
    deployment: z.string().optional(),
  }),
  handoff: handoffSettingsSchema.partial().optional(),
  userId: z.string().default("shared"),
  answers: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .optional()
    .default([]),
});

// Batas maksimum function Vercel untuk paket Hobby: generasi butuh waktu panjang.
export const maxDuration = 300;

export async function POST(request: Request) {
  const originGate = writeOriginGate(request);
  if (originGate) return originGate;
  const ip = await getClientIp(request);

  // IP yang diblokir admin dari Pusat Keamanan ditolak sebelum apa pun
  // (menghentikan serangan biaya LLM dari IP yang sudah ditandai).
  const blocked = await blockedIpResponse(request, ip);
  if (blocked) return blocked;

  try {
    const data = input.parse(await request.json());

    // Identitas dari session/token; body userId cuma fallback di mode dev polos.
    const user = await getRequestUser(data.userId);
    if (!user) {
      await logSecurity("auth_failed", { route: "/api/generate", reason: "no identity" }, { ip, request });
      return unauthorized();
    }
    if (user.tokenPolicy && (user.tokenPolicy.access === "read" || user.tokenPolicy.projectIds.length)) return NextResponse.json({ error: apiText("Token ini tidak dapat membuat proyek baru.") }, { status: 403 });
    const ownerId = planOwnerKey(user);
    const handoff = resolveHandoff((await getAccountSettings(user.userId)).handoff, data.handoff);
    const techPrefs = effectiveTechPrefs(data.techPrefs, handoff);

    // Rem kedua selain kuota harian: maks 10 generate per 10 menit per akun.
    const rl = RATE_LIMITS.generate;
    const retryIn = rateLimit(clientKey(user.userId, ip), rl.limit, rl.windowMs);
    if (retryIn !== null) return rateLimitedResponse(clientKey(user.userId, ip), retryIn, { ip, userId: user.userId, route: "/api/generate" });

    // Tier + status banned: Pro bypass kuota, banned ditolak total.
    const account = await getAccountState(user.userId);
    if (account?.bannedAt) {
      await logSecurity("access_denied", { route: "/api/generate", reason: "banned" }, { ip, userId: user.userId, request });
      return NextResponse.json({ error: apiText("Akun ini telah diblokir secara permanen.") }, { status: 403 });
    }
    const tier = account?.tier ?? "free";
    // Designated admin bypasses the daily quota limit,
    // tapi pemakaian tetap tercatat di usage_events dengan tier asli untuk
    // audit. Batas struktur PRD (jumlah fase/sub-fitur/task) tetap tier akun.

    if (!(await resolveLlmProviders()).length) {
      return NextResponse.json({ error: apiText("Konfigurasi LLM belum lengkap. Konfigurasikan provider melalui Developer Setting") }, { status: 503 });
    }

    const receipt = await consumeQuota(ownerId, tier, { skipLimit: await isAdminEmail(user.email) });
    if (!receipt) {
      await logSecurity("quota_exhausted", { route: "/api/generate", tier }, { ip, userId: user.userId, request });
      return NextResponse.json({ error: apiText("Kuota generate harian habis. Coba besok.") }, { status: 429 });
    }

    // ASINKRON: balas planId seketinda dengan plan kerangka (status generating),
    // generate jalan di background lewat after(). Dulu generate blocking 1-5
    // menit di satu function — di Vercel pasti kena batas waktu function dan
    // user menerima "Misi gagal: Unexpected token" berupa halaman error.
    const planId = randomUUID();
    try {
    await savePlan(
      {
        id: planId,
        title: data.brief.slice(0, 48),
        brief: data.brief,
        stack: [],
        asumsi: [],
        status: "generating",
        features: [],
        tier,
        createdAt: new Date().toISOString(),
      },
      ownerId,
    );

    await saveProjectState(planId, { generationSettings: handoff, generationInput: { techPrefs, answers: data.answers } });
    } catch (error) {
      await refundQuota(receipt);
      await deletePlan(planId);
      throw error;
    }

    let scheduled: boolean;
    try {
      scheduled = await scheduleGeneration(
      {
        planId,
        brief: data.brief,
        techPrefs,
        handoff,
        answers: data.answers,
        tier,
        ownerId,
        userId: user.userId,
        receipt,
        ip,
      },
      1,
    );
    } catch (error) {
      await refundQuota(receipt);
      await deletePlan(planId);
      throw error;
    }

    if (!scheduled) {
      await refundQuota(receipt);
      await deletePlan(planId);
      return NextResponse.json({ error: "Generation limit reached. Please try again later." }, { status: 429 });
    }
    return NextResponse.json({ id: planId, async: true });
  } catch (error) {
    console.error("[generate]", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map((i) => i.message).join("; ") }, { status: 400 });
    return NextResponse.json({ error: "Generation could not be started. Please try again." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getRequestUser(searchParams.get("userId"));
  if (!user) return unauthorized();
  const account = await getAccountState(user.userId);
  const tier = account?.tier ?? "free";
  return NextResponse.json(await getQuota(planOwnerKey(user), tier, { unlimited: await isAdminEmail(user.email) }));
}
