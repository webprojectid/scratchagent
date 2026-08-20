import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { llmSettings } from "@/db/schema";

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

/** Ambil config LLM dari DB (single row id=1). Null kalau kosong / memory mode. */
export async function getLlmConfig(): Promise<LlmConfig | null> {
  if (isMemoryMode()) return null;
  try {
    const db = getDb();
    const rows = await db.select().from(llmSettings).where(eq(llmSettings.id, 1));
    const row = rows[0];
    if (!row) return null;
    if (!row.baseUrl && !row.apiKey && !row.model) return null;
    return { baseUrl: row.baseUrl ?? "", apiKey: row.apiKey ?? "", model: row.model ?? "" };
  } catch {
    return null;
  }
}

/** Simpan config LLM (upsert row id=1). */
export async function saveLlmConfig(cfg: LlmConfig): Promise<void> {
  if (isMemoryMode()) return;
  const db = getDb();
  const now = new Date();
  await db
    .insert(llmSettings)
    .values({ id: 1, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, model: cfg.model, updatedAt: now })
    .onConflictDoUpdate({
      target: llmSettings.id,
      set: { baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, model: cfg.model, updatedAt: now },
    });
}

/**
 * Config final: prioritas DB, fallback ke env per-field.
 * Dipakai generate.ts supaya token/model bisa diganti lewat Settings tanpa redeploy.
 */
export async function resolveLlmConfig(): Promise<{ baseUrl?: string; apiKey?: string; model?: string; models: string[] }> {
  const dbCfg = await getLlmConfig();
  const baseUrl = (dbCfg?.baseUrl || process.env.LLM_BASE_URL || "").replace(/\/$/, "");
  const modelRaw = dbCfg?.model || process.env.LLM_MODEL || "";
  return {
    baseUrl: baseUrl || undefined,
    apiKey: dbCfg?.apiKey || process.env.LLM_API_KEY || undefined,
    model: modelRaw.trim() || undefined,
    models: parseModelList(modelRaw),
  };
}

/**
 * Parse field model menjadi daftar model failover. Format bebas: koma,
 * titik koma, atau baris baru. Dipakai untuk pola "banyak model dalam satu
 * base URL + API key" (mis. 9router): saat satu model kehabisan quota,
 * generate.ts pindah ke model berikutnya. Urutan = prioritas.
 */
export function parseModelList(raw: string): string[] {
  const parts = raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(parts));
}

/**
 * Deteksi error "quota habis" dari provider/router: HTTP 429/402 atau pesan
 * yang menyinggung quota/rate limit/balance. Kalau true, caller harus pindah
 * ke model berikutnya dalam daftar failover.
 */
export function isExhaustedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /\b(429|402)\b|exhaust|quota|insufficient|too many requests|rate.?limit|balance|kehabisan/i.test(msg);
}
