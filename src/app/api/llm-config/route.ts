import { NextResponse } from "next/server";
import { getRequestUser, requireAdmin } from "@/lib/api-auth";
import { getLlmConfig, saveLlmConfig } from "@/lib/llm-config";

function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 10) return "****";
  return `${k.slice(0, 6)}...${k.slice(-4)}`;
}

// GET: baca config LLM (admin-only). API key di-mask.
export async function GET(request: Request) {
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const gate = await requireAdmin(user);
  if (gate) return gate;

  const cfg = await getLlmConfig();
  const baseUrl = cfg?.baseUrl || process.env.LLM_BASE_URL || "";
  const model = cfg?.model || process.env.LLM_MODEL || "";
  const apiKey = cfg?.apiKey || process.env.LLM_API_KEY || "";
  return NextResponse.json({
    baseUrl,
    model,
    apiKeySet: !!apiKey,
    apiKeyMasked: maskKey(apiKey),
    source: cfg ? "database" : "env",
  });
}

// POST: simpan config LLM (admin-only). apiKey kosong = pakai yang lama/env.
export async function POST(request: Request) {
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const gate = await requireAdmin(user);
  if (gate) return gate;

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const existing = await getLlmConfig();

  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  let apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) apiKey = existing?.apiKey || process.env.LLM_API_KEY || "";

  await saveLlmConfig({ baseUrl, apiKey, model });
  return NextResponse.json({ ok: true, source: "database" });
}
