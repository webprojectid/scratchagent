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
export async function resolveLlmConfig(): Promise<{ baseUrl?: string; apiKey?: string; model?: string }> {
  const dbCfg = await getLlmConfig();
  const baseUrl = (dbCfg?.baseUrl || process.env.LLM_BASE_URL || "").replace(/\/$/, "");
  return {
    baseUrl: baseUrl || undefined,
    apiKey: dbCfg?.apiKey || process.env.LLM_API_KEY || undefined,
    model: dbCfg?.model || process.env.LLM_MODEL || undefined,
  };
}
