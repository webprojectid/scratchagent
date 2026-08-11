import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePlanStructure } from "@/lib/generate";
import { savePlan } from "@/lib/storage";
import { consumeQuota, getQuota } from "@/lib/quota";
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
  try {
    const data = input.parse(await request.json());

    if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY || !process.env.LLM_MODEL) {
      return NextResponse.json({ error: "Konfigurasi LLM belum lengkap. Set LLM_BASE_URL, LLM_API_KEY, LLM_MODEL di .env" }, { status: 503 });
    }

    if (!consumeQuota(data.userId)) {
      return NextResponse.json({ error: "Kuota generate harian habis. Coba besok." }, { status: 429 });
    }

    const result = await generatePlanStructure(data.brief, data.techPrefs, data.answers);
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
        createdAt: new Date().toISOString(),
      },
      data.userId,
    );

    return NextResponse.json({ id: planId });
  } catch (error) {
    console.error("[generate]", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map((i) => i.message).join("; ") }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generate gagal" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "shared";
  return NextResponse.json(getQuota(userId));
}
