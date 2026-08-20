import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser, planOwnerKey, unauthorized } from "@/lib/api-auth";
import { generatePlanStructure } from "@/lib/generate";
import { savePlan } from "@/lib/storage";
import { consumeQuota, finalizeQuota, getQuota, refundQuota } from "@/lib/quota";
import { getAccountState } from "@/lib/billing";
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

export async function POST(request: Request) {
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
    const ownerId = planOwnerKey(user);

    // Rem kedua selain kuota harian: maks 10 generate per 10 menit per akun.
    const rl = RATE_LIMITS.generate;
    const retryIn = rateLimit(clientKey(user.userId, ip), rl.limit, rl.windowMs);
    if (retryIn !== null) return rateLimitedResponse(clientKey(user.userId, ip), retryIn, { ip, userId: user.userId, route: "/api/generate" });

    // Tier + status banned: Pro bypass kuota, banned ditolak total.
    const account = await getAccountState(user.userId);
    if (account?.bannedAt) {
      await logSecurity("access_denied", { route: "/api/generate", reason: "banned" }, { ip, userId: user.userId, request });
      return NextResponse.json({ error: "Akun ini telah diblokir secara permanen." }, { status: 403 });
    }
    const tier = account?.tier ?? "free";

    if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY || !process.env.LLM_MODEL) {
      return NextResponse.json({ error: "Konfigurasi LLM belum lengkap. Set LLM_BASE_URL, LLM_API_KEY, LLM_MODEL di .env" }, { status: 503 });
    }

    const receipt = await consumeQuota(ownerId, tier);
    if (!receipt) {
      await logSecurity("quota_exhausted", { route: "/api/generate", tier }, { ip, userId: user.userId, request });
      return NextResponse.json({ error: "Kuota generate harian habis. Coba besok." }, { status: 429 });
    }

    try {
      const result = await generatePlanStructure(data.brief, data.techPrefs, data.answers, tier);
      const planId = randomUUID();
      await savePlan(
        {
          id: planId,
          title: result.title,
          brief: data.brief,
          stack: result.stack,
          techStack: result.techStack,
          asumsi: result.asumsi,
          requirements: result.requirements,
          userFlow: result.userFlow,
          architecture: result.architecture,
          databaseSchema: result.databaseSchema,
          status: "generating",
          features: result.features as never,
          warnings: result.warnings,
          tier,
          createdAt: new Date().toISOString(),
        },
        ownerId,
      );

      await finalizeQuota(receipt, planId, result.usage);
      await logSecurity("generate", { planId, tier, features: result.features.length, tokens: result.usage.tokensIn + result.usage.tokensOut }, { ip, userId: user.userId, request });
      return NextResponse.json({ id: planId, warnings: result.warnings });
    } catch (error) {
      await refundQuota(receipt);
      throw error;
    }
  } catch (error) {
    console.error("[generate]", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map((i) => i.message).join("; ") }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generate gagal" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getRequestUser(searchParams.get("userId"));
  if (!user) return unauthorized();
  const account = await getAccountState(user.userId);
  const tier = account?.tier ?? "free";
  return NextResponse.json(await getQuota(planOwnerKey(user), tier));
}
