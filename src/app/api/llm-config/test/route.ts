import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser, requireAdmin } from "@/lib/api-auth";
import { getLlmConfig } from "@/lib/llm-config";

const bodySchema = z.object({
  baseUrl: z.string().trim().min(1),
  apiKey: z.string().trim().default(""),
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
    return NextResponse.json({ error: "Butuh baseUrl dan model untuk tes koneksi." }, { status: 400 });
  }
  const { baseUrl, model } = parsed.data;
  let apiKey = parsed.data.apiKey;
  if (!apiKey) {
    const cfg = await getLlmConfig();
    apiKey = cfg?.providers.find((p) => p.baseUrl.replace(/\/$/, "") === baseUrl.replace(/\/$/, ""))?.apiKey ?? "";
  }
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "API key belum ada (kosong di form dan belum tersimpan)." });
  }

  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Balas hanya: OK" }],
        max_tokens: 10,
        stream: false,
      }),
      signal: AbortSignal.timeout(8_000),
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
    return NextResponse.json({ ok: false, latencyMs, error: msg.includes("abort") || msg.includes("timeout") ? "Timeout: provider tidak merespons dalam 8 detik." : msg });
  }
}
