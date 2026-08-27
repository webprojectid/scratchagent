import { z } from "zod";
import { jsonrepair } from "jsonrepair";
import {
  applyArchFallback,
  extractMermaidLoose,
  hasMermaidDiagram,
  normalizeMermaidFences,
} from "./arch-fallback";
import { isExhaustedError, parseModelList, resolveLlmConfig } from "./llm-config";
import { structureLimits, taskRangePerFeature, trimToMax, type Tier } from "./plan-limits";
import type { PlanIdea } from "./types";
import { parseLLMResponse } from "./sse-parser"; // NEW: Dual-mode SSE/JSON parser

const prioritySchema = z.preprocess(
  (val) => {
    const s = String(val ?? "").toLowerCase().trim();
    if (s.includes("high") || s.includes("tinggi") || s.includes("utama") || s.includes("kritis")) return "high";
    if (s.includes("low") || s.includes("rendah") || s.includes("opsional")) return "low";
    return "medium";
  },
  z.enum(["high", "medium", "low"]).default("medium"),
);

const featureSchema = z.object({
  title: z.string(),
  icon: z.string().default("⚡"),
  description: z.string().default(""),
  tujuan: z.string().default(""),
  selesai_bila: z.array(z.string()).nullish().transform((v) => v ?? []),
  priority: prioritySchema,
});

const stage1Schema = z.object({
  title: z.string(),
  assumptions: z.array(z.string()).nullish().transform((v) => v ?? []),
  stack: z.array(z.string()).nullish().transform((v) => v ?? []),
  features: z.array(featureSchema).min(2),
});

const archSchema = z.object({
  architecture: z.string().min(1),
});

const dbSchema = z.object({
  database_schema: z.string().min(1),
});

const reqSchema = z.object({
  user_flow: z.array(z.object({
    title: z.string(),
    steps: z.array(z.string()),
  })).default([]),
  requirements: z.object({
    fungsional: z.array(z.string()).nullish().transform((v) => v ?? []),
    non_fungsional: z.array(z.string()).nullish().transform((v) => v ?? []),
  }).default({ fungsional: [], non_fungsional: [] }),
  tech_stack: z.array(z.object({
    name: z.string(),
    desc: z.string(),
  })).default([]),
});

const stage2Schema = z.object({
  features: z.array(
    z.object({
      title: z.string().default(""),
      sub_features: z.array(
        z.object({
          title: z.string().default(""),
          tujuan: z.string().nullish().transform((v) => v ?? ""),
          selesai_bila: z.array(z.string()).nullish().transform((v) => v ?? []),
        }),
      ).nullish().transform((v) => v ?? []),
    }),
  ).nullish().transform((v) => v ?? []),
});

// Layer dari LLM kadang datang dalam bentuk tidak baku ("fullstack",
// "database", "UI", dll). Normalisasi ke enum yang valid alih-alih
// menggugurkan SELURUH fitur hanya karena satu nilai nyeleneh.
const layerSchema = z.string().transform((v): "frontend" | "backend" | "qa" => {
  const s = v.toLowerCase();
  if (s.includes("front") || s.includes("ui") || s.includes("css") || s.includes("tampilan")) return "frontend";
  if (s.includes("qa") || s.includes("test") || s.includes("uji")) return "qa";
  return "backend"; // server, api, database, infra, deploy, dll.
});

const rawTaskSchema = z.object({
  id: z.string().default(""),
  feature: z.string(),
  sub_feature: z.string(),
  title: z.string(),
  layer: layerSchema,
  phase: z.number().int().positive(),
  page: z.string().nullable().default(null),
  deps: z.array(z.string()).default([]),
});

const stage3Schema = z.object({ tasks: z.array(rawTaskSchema) });

const diagramSchema = z.object({ mermaid: z.string().min(1) });

function normalize(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  const map: Record<string, string> = {
    judul_produk: "title",
    judul: "title",
    nama_produk: "title",
    asumsi: "assumptions",
    assumption: "assumptions",
    fitur: "features",
    stack_terpilih: "stack",
    sub_fitur: "sub_features",
    selesai_bila: "selesai_bila",
    tujuan: "tujuan",
    deskripsi: "description",
    task: "tasks",
    ref: "ref",
  };
  if (Array.isArray(obj)) return obj.map(normalize);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const normKey = map[key] ?? key;
    result[normKey] = normalize(value);
  }
  if (result.stack && typeof result.stack === "object" && !Array.isArray(result.stack)) {
    result.stack = Object.values(result.stack).filter((v) => typeof v === "string");
  }
  return result;
}

function extractJson(value: string): string {
  // 1. Ambil JSON di dalam markdown fence ```json ... ``` atau ``` ... ```
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidates = fenced ? [fenced[1].trim()] : [];

  // 2. Coba parse value mentah dan heuristic extract
  let clean = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  clean = clean.replace(/,\s*([}\]])/g, "$1");
  const starts = [clean.indexOf("{"), clean.indexOf("[")].filter((x) => x >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  if (start >= 0 && end >= start) {
    candidates.push(clean.slice(start, end + 1));
  }
  candidates.push(clean);

  // 3. Coba tiap candidate
  for (const raw of candidates) {
    try {
      JSON.parse(raw);
      return raw;
    } catch { /* coba repair */ }
    try {
      const repaired = jsonrepair(raw);
      JSON.parse(repaired);
      return repaired;
    } catch { /* next candidate */ }
  }

  // 4. Last resort: perbaiki quote dan trailing comma
  const last = candidates[0] ?? value;
  try {
    const fixed = last
      .replace(/(['"])?(\w+)(['"])?:/g, '"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/,\s*([}\]])/g, "$1");
    JSON.parse(fixed);
    return fixed;
  } catch {
    throw new Error(`JSON parsing gagal. Raw: ${last.slice(0, 500)}...`);
  }
}

interface LlmUsage { tokensIn: number; tokensOut: number; }

// Model yang terakhir sukses / sedang dipakai. Kalau satu model kehabisan
// quota, kursor maju ke model berikutnya dan tetap di situ sampai habis lagi,
// jadi kita tidak bolak-balik nabrak model yang sudah pasti exhausted.
let modelCursor = 0;

/** Helper untuk cek quota exhaustion dari HTTP status + response body */
const isQuotaExhausted = (status: number, body: string): boolean => {
  return status === 429 || 
         status === 402 || 
         /exhaust|quota|insufficient balance|too many requests|rate.?limit/i.test(body);
};

/** Satu request ke satu model dengan retry internal (maks 3x). */
async function attemptModel<T>(
  schema: z.ZodType<T>,
  prompt: string,
  cfg: { baseUrl: string; apiKey: string; model: string },
  usage?: LlmUsage,
): Promise<T> {
  const { baseUrl, apiKey, model } = cfg;
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 180_000;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    // Retry pakai prompt sedikit berbeda: hindari replay respons rusak yang di-cache proxy,
    // sekaligus mengarahkan model untuk menulis ulang JSON dengan benar.
    // Nonce bikin tiap retry unik supaya varian prompt pun tidak ikut ter-cache.
    const userContent = attempt === 0
      ? prompt
      : `${prompt}\n\nPerhatian: percobaan ${attempt} sebelumnya menghasilkan output TIDAK VALID. Tulis ulang SEKARANG: HANYA JSON valid di dalam triple backtick json, tanpa teks lain di luarnya. (percobaan-${attempt + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 8)})`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    console.log(`[LLM] request attempt ${attempt + 1} ke ${baseUrl}/chat/completions (model: ${model})`);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Kamu adalah coding assistant. Output HANYA JSON valid di dalam triple backtick dengan kata json. Jangan gunakan reasoning_content, jangan tulis penjelasan, jangan tambah teks di luar JSON. JSON harus valid: double-quoted field names dan string, tanpa trailing comma, tanpa komentar, tanpa single quote. String boleh mengandung newline." },
            { role: "user", content: userContent },
          ],
          temperature: 0.2,
          max_tokens: 16384,
          // Streaming: parser SSE auto-detect dan fallback ke JSON, jadi aman
          // untuk gateway yang mengabaikan flag ini. Manfaat: token pertama
          // langsung mengalir (progress), dan gateway tidak menahan seluruh
          // respons reasoning-model yang lambat di buffer.
          stream: true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const elapsed = Date.now() - start;
      console.log(`[LLM] response ${res.status} in ${elapsed}ms`);
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`[LLM] error body: ${text.slice(0, 500)}`);
        
        // FIX v2: Early exit for quota errors - no retry!
        if (isQuotaExhausted(res.status, text)) {
          const err = new Error(`Quota habis untuk model ${model} (${res.status})`);
          throw err;
        }
        
        throw new Error(`LLM gagal: ${res.status} ${text.slice(0, 200)}`);
      }
      
      // NEW: Use dual-mode parser (SSE + JSON fallback)
      try {
        const parsed = await parseLLMResponse(res, {
          logDebug: false, // Set true untuk debug
          onToken: (chunk) => { /* Optional streaming progress */ },
        });
        
        const messageContent = { content: parsed.content };
        if (usage && parsed.usage) {
          usage.tokensIn += parsed.usage.prompt_tokens ?? 0;
          usage.tokensOut += parsed.usage.completion_tokens ?? 0;
        }
        
        // Parse and validate JSON from content
        const raw = JSON.parse(extractJson(messageContent?.content ?? ""));
        return schema.parse(normalize(raw));
        
      } catch (error) {
        lastError = error;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[LLM] response parsing failed: ${errorMsg}`);
        
        if (attempt === 2) throw error;
        
        // Log which mode was detected (helps debugging)
        const isSSE = errorMsg.includes("streaming") || errorMsg.includes("stream");
        console.warn(`[LLM] Mode ${isSSE ? "SSE" : "JSON"} failed, will retry...`);
        
      }
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      // Error quota langsung throw, tidak retry
      if (error instanceof Error && /quota|habis|insufficient balance/i.test(error.message)) {
        throw error;
      }
      if (isExhaustedError(error)) throw error;
      if (attempt === 2) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        console.warn(`[LLM] timeout pada attempt ${attempt + 1} setelah ${Date.now() - start}ms, retry...`);
      } else if (error instanceof Error) {
        console.warn(`[LLM] attempt ${attempt + 1} error: ${error.message}, retry...`);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Parsing LLM gagal setelah 3 percobaan");
}

/**
 * Panggil LLM dengan failover antar-model: config boleh berisi banyak model
 * dalam satu base URL + API key (pola 9router). Kalau satu model kehabisan
 * quota (429/402/exhausted), langsung coba model berikutnya dalam daftar.
 */
async function callLlm<T>(schema: z.ZodType<T>, prompt: string, usage?: LlmUsage): Promise<T> {
  const cfg = await resolveLlmConfig();
  const baseUrl = cfg.baseUrl;
  const apiKey = cfg.apiKey;
  const models = cfg.models.length > 0 ? cfg.models : parseModelList(cfg.model ?? "");
  if (!baseUrl || !apiKey || models.length === 0) throw new Error("Konfigurasi LLM belum lengkap (isi lewat Settings atau env)");

  if (modelCursor >= models.length) modelCursor = 0;
  const order = [...models.slice(modelCursor), ...models.slice(0, modelCursor)];
  let lastError: unknown;
  let exhaustedCount = 0;
  for (let i = 0; i < order.length; i++) {
    const model = order[i];
    try {
      const result = await attemptModel(schema, prompt, { baseUrl, apiKey, model }, usage);
      modelCursor = models.indexOf(model);
      return result;
    } catch (error) {
      lastError = error;
      if (isExhaustedError(error)) {
        exhaustedCount++;
        const nextModel = order[i + 1];
        if (nextModel) {
          console.warn(`[LLM] model ${model} kehabisan quota, pindah ke ${nextModel}`);
          modelCursor = models.indexOf(nextModel);
          continue;
        }
      }
      throw error;
    }
  }
  if (exhaustedCount === order.length && order.length > 1) {
    throw new Error(`Semua model (${models.join(", ")}) kehabisan quota. Coba lagi nanti atau tambah model di Settings.`);
  }
  throw lastError instanceof Error ? lastError : new Error("Semua model gagal");
}

/**
 * LLM kadang ngasih narasi arsitektur/DB schema tanpa diagram mermaid
 * (atau diagramnya keluar di luar fence berlabel). Fungsi ini minta LLM
 * nulis ulang DIAGRAMNYA SAJA berdasarkan narasi yang sudah ada, lebih
 * murah daripada regenerasi seluruh bagian, dan hasilnya tetap spesifik
 * untuk project ini (bukan template generik).
 */
async function regenerateDiagram(
  kind: "architecture" | "database",
  context: { title: string; stack: string[]; featureTitles: string[] },
  narrative: string,
  usage: LlmUsage,
): Promise<string | null> {
  try {
    const kindPrompt =
      kind === "architecture"
        ? "Buat diagram arsitektur sistem: flowchart TD mermaid yang menunjukkan komponen utama, lapisan (frontend/backend/data), dan alur data. Node harus memakai nama komponen nyata dari arsitektur di narasi."
        : "Buat ERD: erDiagram mermaid dengan entitas nyata dari database schema di narasi, lengkap dengan tipe kolom, PK/FK, dan kardinalitas relasi antar entitas.";
    const result = await callLlm(
      diagramSchema,
      `Produk: ${context.title}\nStack: ${JSON.stringify(context.stack)}\nFitur: ${JSON.stringify(context.featureTitles)}\n\nBerikut narasi ${kind === "architecture" ? "arsitektur" : "database schema"} yang sudah dibuat:\n---\n${narrative.slice(0, 6000)}\n---\n\n${kindPrompt}\nDiagram WAJIB spesifik untuk produk ini, dilarang memakai struktur generik (mis. node "CDN / Edge Cache" -> frontend -> backend -> database yang sama untuk semua project). HANYA isi JSON: {"mermaid":"flowchart TD\\n..."} atau {"mermaid":"erDiagram\\n..."}, teks mermaid TANPA pagar backtick.`,
      usage,
    );
    const clean = result.mermaid.trim();
    if (!clean) return null;
    return `\`\`\`mermaid\n${clean}\n\`\`\``;
  } catch (error) {
    console.warn(`[generate] regenerasi diagram ${kind} gagal:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export interface GenerateResult {
  title: string;
  brief: string;
  stack: string[];
  techStack: { name: string; desc: string }[];
  asumsi: string[];
  requirements: { fungsional: string[]; nonFungsional: string[] };
  userFlow: { title: string; steps: string[] }[];
  architecture: string;
  databaseSchema: string;
  features: {
    slug: string;
    title: string;
    icon: string;
    description: string;
    tujuan: string;
    selesaiBila: string[];
    priority: "high" | "medium" | "low";
    status: "direncanakan";
    subFeatures: { title: string; tujuan: string; selesaiBila: string[]; tasks: Omit<GenerateTask, "ref">[] }[];
  }[];
  usage: LlmUsage;
  /** Bagian yang memakai template fallback karena LLM gagal, biar UI bisa ngasih tau user. */
  warnings: string[];
}

export interface GenerateTask {
  ref: string;
  id: string;
  feature: string;
  sub_feature: string;
  title: string;
  layer: "frontend" | "backend" | "qa";
  phase: number;
  page: string | null;
  deps: string[];
}

export interface ClarifyQuestion {
  question: string;
  type: "text" | "textarea" | "single" | "multiple";
  options: string[];
  placeholder: string;
}

/**
 * Aturan gaya penulisan yang ditempelkan ke SETIAP prompt LLM, supaya semua
 * teks yang dihasilkan (PRD, arsitektur, task, dll) bebas dari tanda hubung
 * em/en dash yang terasa "tulisannya AI". Pakai koma, titik, atau titik dua.
 */
const STYLE_RULE = `ATURAN GAYA PENULISAN: tulis semua teks TANPA tanda hubung panjang (em dash "—" atau en dash "–"). Gunakan koma, titik, atau titik dua sebagai pengganti. Tulis seperti profesional manusia di bidangnya: konkret, spesifik, tanpa kalimat generik.`;

// FIX v2: Enforce tier limits BEFORE calling LLM to avoid wasted tokens
function getEnforcedBrief(brief: string, tier: Tier | string | null | undefined): string {
  const maxFeatures = structureLimits(tier).features[1]; // Get hard limit for features
  const truncatedText = brief.length > 2000 ? brief.slice(0, 2000) + `\n\nCATATAN: Fokus pada ${maxFeatures} fitur utama saja, jangan terlalu banyak detail.` : brief;
  
  return `${truncatedText}\n\nPRIORITY CONSTRAINT: Buat maksimal ${maxFeatures} fitur untuk product ini (hard limit). Jangan melebihi batas ini.`;
}

/** Jawaban klarifikasi user yang sudah diratakan jadi string, siap masuk prompt. */
export interface ContextAnswer {
  question: string;
  answer: string;
}

export async function generatePlanStructure(
  brief: string,
  techPrefs: { mode: "auto" | "custom"; frontend?: string; backend?: string; database?: string; deployment?: string },
  contextAnswers?: ContextAnswer[],
  tier: Tier | string | null | undefined = "free",
): Promise<GenerateResult> {
  const usage: LlmUsage = { tokensIn: 0, tokensOut: 0 };
  // Batas struktur per tier: fase (fitur), sub-fitur per fitur, total task.
  const limits = structureLimits(tier);
  const structureWarnings: string[] = [];
  const stackHint = techPrefs.mode === "custom"
    ? `User memilih opsi STACK CUSTOM: frontend=${techPrefs.frontend ?? "Next.js"}, backend=${techPrefs.backend ?? "Node.js"}, database=${techPrefs.database ?? "PostgreSQL"}, deployment=${techPrefs.deployment ?? "Railway"}`
    : `User memilih mode AUTO untuk tech stack. ATURAN WAJIB PEMILIHAN STACK (PRIORITAS FREE TIER & ZERO COST SETUP):
- WAJIB pilih kombinasi platform, framework, database, dan hosting yang menyediakan FREE TIER yang memadai, ramah developer, dan tidak mewajibkan kartu kredit berbayar atau subscription wajib sejak awal.
- Rekomendasi stack ramah Free Tier:
  * Frontend/Fullstack: Next.js, Vite/React, SvelteKit, Astro, Tailwind CSS.
  * Backend/API: Node.js/Bun, Hono, Python (FastAPI), Go, Supabase BaaS.
  * Database & Auth: Supabase (Free tier Postgres+Auth), Neon Postgres (Free tier), Turso/libSQL (Free tier), SQLite lokal, MongoDB Atlas (M0 Free), Firebase (Spark Free).
  * Hosting & Deployment: Vercel (Hobby Free), Cloudflare Pages/Workers (Free tier), Netlify (Free tier), Render (Free tier), GitHub Pages, atau self-hosted VPS/Docker.
- DILARANG memilih platform yang full-paid (wajib bayar/subscription sejak hari pertama tanpa paket Free yang layak).
- Pastikan seluruh stack yang dipilih bisa langsung dijalankan dan dideploy tanpa hambatan biaya.`;

  const answersBlock = contextAnswers && contextAnswers.length > 0
    ? `\nJawaban klarifikasi dari user (perlakukan sebagai FAKTA yang sudah dikonfirmasi, jangan membuat asumsi yang bertentangan dengan ini):\n${contextAnswers.map((a) => `- ${a.question} → ${a.answer}`).join("\n")}\n`
    : "";

  // FIX v2: Enforce limits BEFORE calling LLM
  const enforcedBrief = getEnforcedBrief(brief, tier);

  const one = await callLlm(
    stage1Schema,
    `${enforcedBrief}\n${stackHint}${answersBlock}\n\nKamu adalah product manager senior. Buat PRD awal yang mendalam:\n${STYLE_RULE}\n1. Judul produk yang jelas.\n2. Asumsi wajar (min 5): bisnis, teknis, perilaku pengguna. Jika ada jawaban klarifikasi dari user, gunakan itu dan JANGAN jadikan hal yang sudah dijawab sebagai asumsi.\n3. Stack teknologi yang cocok.\n4. Daftar fitur: buat maksimal ${limits.features[1]} fitur. CAKUPAN WAJIB: setiap subsistem, komponen, atau fungsi yang disebut di brief harus tercover; bila subsistem melebihi jumlah maksimum, gabungkan subsistem yang serumpun ke satu fitur dan jelaskan penggabungannya di field description. JANGAN menghapus, melewati, atau mengabaikan subsistem apa pun.\n5. Untuk tiap fitur: deskripsi 1-2 kalimat, tujuan bisnis yang terukur, dan 3-5 kriteria "selesai bila" yang spesifik dan bisa diuji.\n\nWAJIB gunakan field PERSIS: title, assumptions, stack, features (title, icon, description, tujuan, selesai_bila, priority). Format: {"title":"...","assumptions":[],"stack":[],"features":[{"title":"...","icon":"...","description":"...","tujuan":"...","selesai_bila":[],"priority":"high"}]}}`,
    usage,
  );

  // Hard cutoff AFTER validation but still warn
  const stage1Features = one.features.slice(0, limits.features[1]);
  if (one.features.length > limits.features[1]) {
    structureWarnings.push(`Prompt melebihi batas (${one.features.length} fitur). Dipotong jadi ${limits.features[1]} sesuai paket ${tier === "pro" ? "Pro" : "Free"}.`);
  }
  const featureTitles = stage1Features.map((f) => f.title);

  const two = await callLlm(
    stage2Schema,
    `Brief: ${brief}\nFitur: ${JSON.stringify(featureTitles)}\n\nKamu adalah arsitek produk. Untuk setiap fitur, lakukan dekomposisi kritis:\n${STYLE_RULE}\n1. Untuk tiap fitur identifikasi ${limits.subFeatures[0]} sampai ${limits.subFeatures[1]} sub-fitur yang saling eksklusif namun collectively exhaustive, pilih aspek paling penting dari tiap fitur.\n2. Tiap sub-fitur pecahkan SATU masalah spesifik.\n3. Tujuan terukur.\n4. Selesai_bila berisi acceptance criteria konkret (min 2).\n5. Tandai sub-fitur risiko tinggi atau dependency eksternal.\n\nWAJIB field: title, sub_features (title, tujuan, selesai_bila). Format: {"features":[{"title":"...","sub_features":[{"title":"...","tujuan":"...","selesai_bila":["..."]}]}]}}`,
    usage,
  );

  const [archDataRaw, dbDataRaw, reqDataRaw] = await Promise.all([
    callLlm(
      archSchema,
      `Brief: ${brief}\nFitur: ${JSON.stringify(featureTitles)}\nStack: ${JSON.stringify(one.stack ?? [])}\n\nKamu adalah solution architect. Buat architecture detail untuk produk ini.\n${STYLE_RULE} Jelaskan komponen utama, alur data end-to-end, keputusan arsitektur, trade-off (monolith vs microservices, SSR vs CSR, SQL vs NoSQL), error handling, caching, autentikasi, dan skalabilitas. Narasi 2-3 paragraf. WAJIB sertakan diagram mermaid flowchart TD di dalam triple backtick.\n\nFormat: {"architecture":"narasi detail lalu mermaid flowchart TD di triple backtick"}}`,
      usage,
    ).catch((error) => {
      console.warn("[generate] architecture gagal, pakai fallback:", error instanceof Error ? error.message : error);
      return null;
    }),
    callLlm(
      dbSchema,
      `Brief: ${brief}\nFitur: ${JSON.stringify(featureTitles)}\nStack: ${JSON.stringify(one.stack ?? [])}\n\nKamu adalah database architect. Buat database schema lengkap untuk produk ini.\n${STYLE_RULE} Daftar SEMUA tabel utama. Untuk tiap tabel: nama kolom, tipe data, constraint (PK/FK/UNIQUE/INDEX), dan alasan pemilihan tipe. Identifikasi N+1 query risk dan hot path. WAJIB sertakan ERD mermaid di dalam triple backtick.\n\nFormat: {"database_schema":"### Tabel... lalu mermaid erDiagram di triple backtick"}}`,
      usage,
    ).catch((error) => {
      console.warn("[generate] database_schema gagal, pakai fallback:", error instanceof Error ? error.message : error);
      return null;
    }),
    callLlm(
      reqSchema,
      `Brief: ${brief}\nFitur: ${JSON.stringify(featureTitles)}\n\nKamu adalah product manager. Buat user flow, requirements, dan tech stack untuk produk ini.\n${STYLE_RULE}\n1. User Flow: 2-4 alur utama (happy path + 1 unhappy path per fitur penting), tiap langkah actionable.\n2. Requirements: fungsional (min 6) dan non-fungsional (min 4: performance, security, reliability, scalability).\n3. Tech Stack: tiap teknologi ada alasan 1 kalimat dan alternatif yang dipertimbangkan.\n\nFormat: {"user_flow":[{"title":"...","steps":["..."]}],"requirements":{"fungsional":[],"non_fungsional":[]},"tech_stack":[{"name":"...","desc":"..."}]}}`,
      usage,
    ).catch((error) => {
      console.warn("[generate] requirements gagal, pakai default:", error instanceof Error ? error.message : error);
      return null;
    }),
  ]);

  const archData = {
    architecture: archDataRaw?.architecture ?? "",
    databaseSchema: dbDataRaw?.database_schema ?? "",
    userFlow: reqDataRaw?.user_flow ?? [],
    requirements: reqDataRaw?.requirements ?? { fungsional: [], non_fungsional: [] },
    techStack: reqDataRaw?.tech_stack ?? [],
  };

  let subFeatureTrimmed = false;
  const featureListFromTwo = Array.isArray(two?.features) ? two.features : (Array.isArray(two) ? (two as any) : []);
  const features = stage1Features.map((f) => {
    const mapped = featureListFromTwo.find((x: any) => x?.title === f.title || String(x?.title ?? "").toLowerCase().trim() === f.title.toLowerCase().trim());
    const rawSubs = (mapped?.sub_features && mapped.sub_features.length > 0)
      ? mapped.sub_features
      : [
          { title: `${f.title} - Komponen Utama`, tujuan: `Implementasi arsitektur dan komponen utama untuk ${f.title}`, selesai_bila: ["Komponen terpasang dan berfungsi", "Integrasi antar modul berhasil"] },
          { title: `${f.title} - Integrasi & Validasi`, tujuan: `Pengujian dan validasi operasional untuk ${f.title}`, selesai_bila: ["Validasi input output berhasil", "Error handling aktif"] },
        ];
    if (rawSubs.length > limits.subFeatures[1]) subFeatureTrimmed = true;
    // Enforce keras batas sub-fitur per fitur.
    const subFeatures = trimToMax(rawSubs, limits.subFeatures[1]).map((sf: any) => ({
      title: sf.title,
      tujuan: sf.tujuan,
      selesaiBila: sf.selesai_bila ?? sf.selesaiBila ?? [],
      tasks: [],
    }));
    return { slug: f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), title: f.title, icon: f.icon, description: f.description, tujuan: f.tujuan, selesaiBila: f.selesai_bila, priority: f.priority, status: "direncanakan" as const, subFeatures };
  });
  if (subFeatureTrimmed) {
    structureWarnings.push(`Jumlah sub-fitur per fase dibatasi ${limits.subFeatures[1]} sesuai paket ${tier === "pro" ? "Pro" : "Free"}`);
  }

  const resolvedStack = one.stack?.length
    ? one.stack
    : techPrefs.mode === "custom"
      ? [techPrefs.frontend, techPrefs.backend, techPrefs.database, techPrefs.deployment].filter((s): s is string => !!s)
      : ["Next.js", "PostgreSQL", "Railway"];

  // Normalisasi fence tanpa label + deteksi dini diagram yang hilang: kalau LLM
  // ngasih narasi tapi TANPA diagram mermaid, minta LLM gambar ulang diagramnya
  // (spesifik per project) SEBELUM fallback template punya kesempatan masuk.
  const archRaw = normalizeMermaidFences((archData.architecture ?? "").trim());
  const dbRaw = normalizeMermaidFences((archData.databaseSchema ?? "").trim());
  const ctx = { title: one.title, stack: resolvedStack, featureTitles: featureTitles };

  const [archDiagram, dbDiagram] = await Promise.all([
    archRaw && !hasMermaidDiagram(archRaw) ? regenerateDiagram("architecture", ctx, archRaw, usage) : Promise.resolve(null),
    dbRaw && !hasMermaidDiagram(dbRaw) ? regenerateDiagram("database", ctx, dbRaw, usage) : Promise.resolve(null),
  ]);

  const { architecture, databaseSchema, usedFallback } = applyArchFallback(
    { title: one.title, stack: resolvedStack, features: features as never },
    archDiagram ? `${archRaw}\n\n${archDiagram}` : archRaw,
    dbDiagram ? `${dbRaw}\n\n${dbDiagram}` : dbRaw,
    { injectDiagrams: true },
  );

  const WARNING_LABELS: Record<string, string> = {
    architecture: "Arsitektur memakai template generik karena LLM gagal",
    "architecture:diagram": "Diagram arsitektur memakai template karena regenerasi diagram gagal",
    "architecture:diagram-missing": "Diagram arsitektur memakai template (narasi LLM tanpa diagram)",
    databaseSchema: "Database schema memakai template generik karena LLM gagal",
    "databaseSchema:diagram": "ERD memakai template karena regenerasi diagram gagal",
    "databaseSchema:diagram-missing": "ERD memakai template (narasi LLM tanpa diagram)",
  };
  const warnings = [...usedFallback.map((code) => WARNING_LABELS[code] ?? `Fallback dipakai: ${code}`), ...structureWarnings];
  if (usedFallback.length) {
    console.warn(`[generate] fallback dipakai untuk: ${usedFallback.join(", ")}`);
  }

  return {
    title: one.title,
    brief,
    stack: resolvedStack,
    techStack: archData.techStack,
    asumsi: one.assumptions,
    requirements: { fungsional: archData.requirements.fungsional, nonFungsional: archData.requirements.non_fungsional },
    userFlow: archData.userFlow,
    architecture,
    databaseSchema,
    features,
    usage,
    warnings,
  };
}

export async function generateTasksForFeature(
  brief: string,
  featureTitle: string,
  subFeatures: string[],
  featureIndex: number,
  tier: Tier | string | null | undefined = "free",
  featureCount = 1,
  /** Ide user dari kolom chat (Pro). WAJIB dibaca AI sebagai referensi tambahan. */
  ideas?: PlanIdea[] | null,
): Promise<{ tasks: Omit<GenerateTask, "ref">[]; usage: LlmUsage }> {
  const usage: LlmUsage = { tokensIn: 0, tokensOut: 0 };
  // Budget task per fitur berlaku per unit fitur/sub-fitur sesuai batas tier.
  const [minTasks, maxTasks] = taskRangePerFeature(tier, featureCount, subFeatures.length);
  const taskBudgetRule = `Buat ${minTasks} sampai ${maxTasks} task untuk fitur ini (WAJIB tidak melebihi ${maxTasks}). Pastikan SETIAP sub-fitur memiliki alokasi task (minimal frontend, backend, atau QA).`;
  // Ide user (fitur Pro) disuntikkan ke prompt AI sebagai referensi wajib:
  // kalau ada ide yang relevan dengan fitur ini, task-nya HARUS mengakomodasi
  // ide tersebut walau belum tercakup di struktur awal.
  const ideaBlock = ideas && ideas.length > 0
    ? `\nREFERENSI WAJIB — IDE TAMBAHAN DARI USER (baca semua; jika relevan dengan fitur ini, pastikan ada task yang mengakomodasinya):\n${ideas.map((i, n) => `${n + 1}. "${i.text}"${i.featureTitle ? ` (sudah punya fase: ${i.featureTitle})` : ""}`).join("\n")}\n`
    : "";
  const result = await callLlm(
    stage3Schema,
    `Brief: ${brief}\nFitur: ${featureTitle}\nSub-fitur: ${JSON.stringify(subFeatures)}\n${ideaBlock}\nKamu adalah tech lead senior. Buat task untuk fitur ini saja dengan pendekatan kritis:\n${STYLE_RULE}\n1. ${taskBudgetRule} Tiap task harus spesifik dan actionable.\n2. Setiap sub-fitur harus ada task (frontend, backend, dan/atau QA/testing). Pastikan tidak ada sub-fitur yang dibiarkan tanpa task.\n3. Tiap task title WAJIB diawali kata kerja (Buat, Integrasikan, Uji, Deploy, Refactor, dll).\n4. Sertakan task untuk: validasi input, error handling, state management, integrasi antar komponen, unit/integration test, accessibility/perf jika relevan.\n5. Beri SETIAP task id unik berurutan: "t1", "t2", "t3", dst.\n6. Dependency (deps): isi dengan id task lain yang harus selesai LEBIH DULU (hanya id dari daftar task ini, mis. ["t1","t3"]). Jangan membuat ketergantungan melingkar. Task yang bisa dikerjakan paralel tanpa prasyarat diberi deps [].\n7. Urutan logis layer: frontend -> backend -> qa. Tandai task yang blocker atau high-risk.\n8. Setiap task wajib field: id, feature, sub_feature, title, layer (frontend/backend/qa), phase, page (null atau path), deps (array id).\n\nFormat: {"tasks":[{"id":"t1","feature":"...","sub_feature":"...","title":"...","layer":"frontend","phase":${featureIndex + 1},"page":null,"deps":[]},{"id":"t2","feature":"...","sub_feature":"...","title":"...","layer":"backend","phase":${featureIndex + 1},"page":null,"deps":["t1"]}]}`,
    usage,
  );
  // Enforce keras: potong task berlebih dari LLM ke budget maksimum.
  return { tasks: trimToMax(result.tasks, maxTasks), usage };
}

export function buildTaskRef(featureIndex: number, subIndex: number, taskNum: number): string {
  return `F${String(featureIndex + 1).padStart(2, "0")}-S${String(subIndex + 1).padStart(2, "0")}-T${String(taskNum).padStart(2, "0")}`;
}

// ============================================================
// Ide user (kolom chat "Ide Kamu", khusus Pro) -> fase lengkap.
// Alur: satu ide dikonversi AI menjadi SATU fase baru dengan
// sub-fitur dan task di dalamnya (fase > sub-fitur > task).
// ============================================================

const ideaPhaseSchema = z.object({
  title: z.string(),
  icon: z.string().default("💡"),
  description: z.string().default(""),
  tujuan: z.string().default(""),
  selesai_bila: z.array(z.string()).default([]),
  sub_features: z.array(
    z.object({
      title: z.string(),
      tujuan: z.string().default(""),
      selesai_bila: z.array(z.string()).default([]),
    }),
  ).min(1).default([]),
});

export interface IdeaFeature {
  title: string;
  icon: string;
  description: string;
  tujuan: string;
  selesaiBila: string[];
  subFeatures: { title: string; tujuan: string; selesaiBila: string[] }[];
  usage: LlmUsage;
}

/**
 * Konversi satu ide mentah user menjadi satu fase baru (judul, sub-fitur,
 * metadata). Task-nya digenerate terpisah oleh generateTasksForFeature agar
 * ikut budget task yang sama dengan fitur reguler.
 */
export async function convertIdeaToFeature(brief: string, ideaText: string, phase: number): Promise<IdeaFeature> {
  const usage: LlmUsage = { tokensIn: 0, tokensOut: 0 };
  const result = await callLlm(
    ideaPhaseSchema,
    `Brief project: ${brief}

IDE TAMBAHAN DARI USER (wajib diwujudkan, ini alasan fitur ini ada):
${ideaText}

Kamu adalah product architect senior. Ubah ide user di atas menjadi SATU fase baru di project ini:
${STYLE_RULE}
1. title: nama fase singkat & jelas (bukan "Ide User").
2. description: 1-2 kalimat menjelaskan fase ini berasal dari ide user.
3. tujuan: hasil akhir fase ini.
4. selesai_bila: 2-4 kriteria selesai.
5. sub_features: pecah ide menjadi 3-6 sub-fitur yang saling eksklusif, tiap sub-fitur punya tujuan dan selesai_bila (1-3 item).
6. Jangan keluar dari konteks brief; kalau ide user menyebut hal di luar scope, adaptasikan ke konteks project.

Format: {"title":"...","icon":"💡","description":"...","tujuan":"...","selesai_bila":[],"sub_features":[{"title":"...","tujuan":"...","selesai_bila":["..."]}]}`,
    usage,
  );
  return {
    title: result.title.trim() || "Ide User",
    icon: (result.icon || "💡").trim(),
    description: result.description.trim() || `Fase tambahan dari ide user: ${ideaText}`,
    tujuan: result.tujuan.trim() || ideaText,
    selesaiBila: result.selesai_bila,
    subFeatures: result.sub_features.map((s) => ({ title: s.title, tujuan: s.tujuan, selesaiBila: s.selesai_bila })),
    usage,
  };
}

/**
 * Distribusikan task LLM ke sub-fitur: pass 1 exact title match, pass 2
 * substring fallback. SATU task hanya masuk SATU sub-fitur (dedupe) supaya
 * jumlah task tidak membengkak melewati batas tier. Bug lama: matching
 * substring dua arah tanpa dedupe menyalin satu task ke SEMUA sub-fitur
 * (terparah saat sub_feature kosong: b.includes("") selalu true).
 * Task dengan sub_feature kosong / tak dikenal masuk sub-fitur pertama.
 * Return map index sub-fitur -> index task (urutan assignment).
 * 
 * FIX v2: Use word boundary matching to avoid false substring matches
 */
export function assignTasksToSubFeatures(
  tasks: { sub_feature?: string | null }[],
  subFeatureTitles: string[],
): Map<number, number[]> {
  const result = new Map<number, number[]>();
  const used = new Set<number>();
  
  // Normalize strings for comparison
  const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();
  
  // FIX v2: Word boundary matching instead of naive substring
  const match = (sub: string, title: string, exact: boolean): boolean => {
    if (!sub || !title) return false;
    const s = norm(sub);
    const t = norm(title);
    
    if (exact) return s === t;
    
    // Use word boundaries to avoid partial matches
    // This prevents "Search" matching inside "SearchFilteringUI"
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const subRegex = new RegExp(`\\b${escapeRegex(s)}\\b`, 'i');
    const titleRegex = new RegExp(`\\b${escapeRegex(t)}\\b`, 'i');
    
    return subRegex.test(t) || titleRegex.test(s);
  };
  
  for (let pass = 0; pass < 2; pass++) {
    const exact = pass === 0;
    for (let si = 0; si < subFeatureTitles.length; si++) {
      const title = norm(subFeatureTitles[si]);
      
      // Skip empty sub-feature titles
      if (!title) continue;
      
      for (let ti = 0; ti < tasks.length; ti++) {
        if (used.has(ti)) continue;
        
        const taskSub = norm(tasks[ti].sub_feature);
        
        // Skip tasks with empty sub_feature
        if (!taskSub) continue;
        
        if (!match(taskSub, title, exact)) continue;
        
        used.add(ti);
        if (!result.has(si)) result.set(si, []);
        result.get(si)!.push(ti);
      }
    }
  }
  
  // Handle remaining unassigned tasks (including those with empty sub_feature)
  const leftover = tasks.map((_, i) => i).filter((i) => !used.has(i));
  if (leftover.length && subFeatureTitles.length > 0) {
    // Find first non-empty sub-feature, otherwise use first one
    const targetSubIndex = subFeatureTitles.some(tf => norm(tf)) ? 0 : -1;
    if (targetSubIndex >= 0) {
      if (!result.has(targetSubIndex)) result.set(targetSubIndex, []);
      result.get(targetSubIndex)!.push(...leftover);
    } else {
      console.warn("[assignTasksToSubFeatures] No valid sub-features found, skipping leftover tasks");
    }
  }
  
  return result;
}

/**
 * Bersihkan dependency graph: buang ref yang tidak dikenal, self-dependency,
 * dan edge yang membentuk siklus. Return map ref -> deps final (urutan stabil).
 * Algoritma: bangun graph secara incremental; tiap edge baru dicek apakah
 * membuat jalur balik (siklus); kalau ya, edge itu dibuang.
 * 
 * FIX v2: Global cycle detection across all features, not just within single node context
 */
export function sanitizeDeps(nodes: { ref: string; deps: string[] }[]): Map<string, string[]> {
  const validRefs = new Set(nodes.map((n) => n.ref));
  const graph = new Map<string, string[]>();
  for (const n of nodes) graph.set(n.ref, []);

  // FIX v2: Use DFS with proper visited tracking for entire graph traversal
  const createsCycle = (addEdge: [string, string], currentGraph: Map<string, string[]>): boolean => {
    const [from, to] = addEdge;
    
    // Check if adding this edge would create a cycle
    // A cycle exists if 'to' can reach 'from' via existing edges
    const canReachTarget = (start: string, target: string): boolean => {
      if (start === target) return true;
      
      const visited = new Set<string>();
      const stack = [start];
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === target) return true;
        if (visited.has(current)) continue;
        
        visited.add(current);
        
        for (const dep of currentGraph.get(current) ?? []) {
          if (dep === target) return true;
          if (!visited.has(dep)) {
            stack.push(dep);
          }
        }
      }
      return false;
    };
    
    return canReachTarget(to, from);
  };

  for (const n of nodes) {
    const addedDeps = new Set<string>();
    for (const dep of n.deps) {
      // Skip invalid references, self-deps, and duplicates
      if (!validRefs.has(dep) || dep === n.ref || addedDeps.has(dep)) continue;
      
      addedDeps.add(dep);
      
      // FIX v2: Don't create edges that would form cycles
      if (createsCycle([n.ref, dep], graph)) {
        console.warn(`[sanitizeDeps] Skipping cyclic edge: ${n.ref} -> ${dep}`);
        continue;
      }
      
      graph.get(n.ref)!.push(dep);
    }
  }
  
  return graph;
}
