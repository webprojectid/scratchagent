import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { llmSettings } from "@/db/schema";

/** Satu provider LLM: base URL + API key + daftar model failover miliknya. */
export interface LlmProvider {
  baseUrl: string;
  apiKey: string;
  models: string[];
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  providers: LlmProvider[];
}

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

/** Normalisasi daftar provider: buang yang tidak lengkap, dedupe model, rapikan URL. */
export function normalizeProviders(raw: unknown): LlmProvider[] {
  if (!Array.isArray(raw)) return [];
  const out: LlmProvider[] = [];
  for (const entry of raw) {
    const e = entry as Partial<LlmProvider> | null;
    const baseUrl = String(e?.baseUrl ?? "").trim().replace(/\/$/, "");
    const apiKey = String(e?.apiKey ?? "").trim();
    const models = parseModelList(Array.isArray(e?.models) ? e!.models!.join(",") : String(e?.models ?? ""));
    if (!baseUrl || !apiKey || models.length === 0) continue;
    out.push({ baseUrl, apiKey, models });
  }
  return out;
}

/** Ambil config LLM dari DB (single row id=1). Null kalau kosong / memory mode. */
export async function getLlmConfig(): Promise<LlmConfig | null> {
  if (isMemoryMode()) return null;
  try {
    const db = getDb();
    const rows = await db.select().from(llmSettings).where(eq(llmSettings.id, 1));
    const row = rows[0];
    if (!row) return null;
    const providers = normalizeProviders(row.providers);
    const legacyEmpty = !row.baseUrl && !row.apiKey && !row.model;
    if (legacyEmpty && providers.length === 0) return null;
    return {
      baseUrl: row.baseUrl ?? "",
      apiKey: row.apiKey ?? "",
      model: row.model ?? "",
      providers,
    };
  } catch {
    return null;
  }
}

/** Simpan config LLM (upsert row id=1). */
export async function saveLlmConfig(cfg: LlmConfig): Promise<void> {
  if (isMemoryMode()) return;
  const db = getDb();
  const now = new Date();
  const values = {
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    providers: normalizeProviders(cfg.providers),
    updatedAt: now,
  };
  await db
    .insert(llmSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({
      target: llmSettings.id,
      set: values,
    });
}

/**
 * Config final (mode lama, dipakai UI Settings): kolom legacy dulu, fallback env per-field.
 */
export async function resolveLlmConfig(): Promise<{
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  models: string[];
}> {
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
 * Daftar provider failover berurutan untuk generate.
 * - `providers` di DB menang bila terisi (tiap entry = base URL + key + model sendiri).
 * - Kalau kosong: satu provider legacy (DB kolom lama / env), failover antar modelnya saja.
 * Urutan = prioritas; generate.ts mencoba berurutan dan pindah ke berikutnya saat gagal.
 */
export async function resolveLlmProviders(): Promise<LlmProvider[]> {
  const providers = normalizeProviders((await getLlmConfig())?.providers ?? []);
  if (providers.length > 0) return providers;

  const cfg = await resolveLlmConfig();
  if (!cfg.baseUrl || !cfg.apiKey || cfg.models.length === 0) return [];
  return [{ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, models: cfg.models }];
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
