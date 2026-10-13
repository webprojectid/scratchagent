import { validateProviderUrl, publicProviderFetch } from "@/lib/provider-network";
import { apiText } from "@/lib/ui-messages";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser, requireAdmin } from "@/lib/api-auth";
import { getLlmConfig } from "@/lib/llm-config";

const bodySchema = z.object({
  baseUrl: z.string().trim().min(1),
  apiKey: z.string().trim().default(""),
  sourceIndex: z.number().int().min(0).max(7).nullable().optional(),
  model: z.string().trim().min(1),
});

/**
 * POST: tes koneksi satu provider (admin-only).
 * Panggil chat/completions mini (maks ~8 detik) ke model pertama yang dipilih.
 * API key kosong = pakai key tersimpan untuk base URL yang sama di Settings.
 */
export async function POST(request: Request) {
  const legacyUserId = new URL(request.url).searchParams.get("userId");
  const user = await getRequestUser(legacyUserId);
  const gate = await requireAdmin(user);
  if (gate) return gate;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: apiText("Butuh baseUrl dan model untuk tes koneksi.") }, { status: 400 });
  }
  const { baseUrl, model } = parsed.data;

  const validated = await validateProviderUrl(baseUrl);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  let apiKey = parsed.data.apiKey;
  if (!apiKey) {
    const cfg = await getLlmConfig();
    const source = parsed.data.sourceIndex;
    const candidate = source === undefined
      ? cfg?.providers.find(p => p.baseUrl.replace(/\/$/, "") === baseUrl.replace(/\/$/, ""))
      : source === null ? undefined : cfg?.providers[source];
    if (candidate?.baseUrl.replace(/\/$/, "") === baseUrl.replace(/\/$/, "")) apiKey = candidate.apiKey;
    if (!apiKey && source === 0 && !(cfg?.providers.length)) {
      const storedUrl = cfg?.baseUrl || process.env.LLM_BASE_URL || "";
      if (storedUrl.replace(/\/$/, "") === baseUrl.replace(/\/$/, "")) apiKey = cfg?.apiKey || process.env.LLM_API_KEY || "";
    }
  }
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: apiText("API key belum ada (kosong di form dan belum tersimpan).") });
  }

  const start = Date.now();
  try {
    const res = await publicProviderFetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Balas hanya: OK" }],
        max_tokens: 10,
        stream: false,
      }),
      signal: AbortSignal.timeout(8_000),
      redirect: "error", // tolak redirect: mencegah SSRF lewat redirect ke target internal
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
      return NextResponse.json({ ok: false, latencyMs, error: `HTTP ${res.status}: ${text || res.statusText}` });
    }
    const data = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
    const reply = data?.choices?.[0]?.message?.content?.trim().slice(0, 40) ?? "";
    return NextResponse.json({ ok: true, latencyMs, model, reply });
  } catch (error) {
    const latencyMs = Date.now() - start;
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      latencyMs,
      error:
        msg.includes("abort") || msg.includes("timeout")
          ? "Timeout: provider tidak merespons dalam 8 detik."
          : msg,
    });
  }
}
