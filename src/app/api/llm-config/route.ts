import { writeOriginGate } from "@/lib/write-origin";
import { validateProviderUrl } from "@/lib/provider-network";
import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser, requireAdmin } from "@/lib/api-auth";
import { resolveProviderKeys } from "@/lib/llm-provider-input";
import { getLlmConfig, normalizeProviders, saveLlmConfig } from "@/lib/llm-config";

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
    providers: (cfg?.providers ?? []).map((p) => ({
      baseUrl: p.baseUrl,
      models: p.models,
      apiKeySet: !!p.apiKey,
      apiKeyMasked: maskKey(p.apiKey),
    })),
  });
}

const providerInput = z.object({
  baseUrl: z.string().trim().min(1),
  sourceIndex: z.number().int().min(0).max(7).nullable().optional(),
  apiKey: z.string().trim().default(""),
  models: z.union([z.string(), z.array(z.string())]).transform((v) =>
    Array.isArray(v) ? v : v.split(/[\n,;]+/)),
}).transform((p) => ({ sourceIndex: p.sourceIndex, baseUrl: p.baseUrl.replace(/\/$/, ""), apiKey: p.apiKey, models: p.models.map((m) => m.trim()).filter(Boolean) }));

const bodySchema = z.object({
  providers: z.array(providerInput).min(1).max(8),
});

// POST: simpan daftar provider (admin-only).
// Empty keys retain the saved provider selected by sourceIndex.
// - Kolom legacy (baseUrl/apiKey/model) ikut disinkronkan dari provider #1
//   supaya tampilan lama & fallback env tetap konsisten.
export async function POST(request: Request) {
  const originGate = writeOriginGate(request);
  if (originGate) return originGate;
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const gate = await requireAdmin(user);
  if (gate) return gate;

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: apiText("Format providers tidak valid: butuh minimal 1 provider dengan baseUrl, apiKey, dan models.") }, { status: 400 });
  }

  const existing = await getLlmConfig();
  const providers = resolveProviderKeys(parsed.data.providers, existing, process.env.LLM_API_KEY);
  const valid = normalizeProviders(providers);
  if (valid.length !== providers.length) {
    return NextResponse.json({ error: apiText("Tidak ada provider yang valid (baseUrl, apiKey, dan minimal 1 model wajib terisi).") }, { status: 400 });
  }

  for (const provider of valid) {
    const result = await validateProviderUrl(provider.baseUrl);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  }
  await saveLlmConfig({
    baseUrl: valid[0].baseUrl,
    apiKey: valid[0].apiKey,
    model: valid[0].models.join(", "),
    providers: valid,
  });
  return NextResponse.json({ ok: true, source: "database", providers: valid.length });
}
