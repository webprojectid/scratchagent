import { publicProviderFetch } from "./provider-network";
import { defaultHandoff, legacyHandoff, handoffInstructions, type HandoffSettings } from "./account-preferences";
import { z } from "zod";
import { jsonrepair } from "jsonrepair";
import {
  applyArchFallback,
  extractMermaidLoose,
  hasMermaidDiagram,
  normalizeMermaidFences,
} from "./arch-fallback";
import { isExhaustedError, resolveLlmProviders, type LlmProvider } from "./llm-config";
import { structureLimits, taskRangePerFeature, trimToMax, type Tier } from "./plan-limits";
import { removeVagueCriteria, validateFeatureDraft, validateSubfeatureDraft, validateTaskDraft } from "./generation-quality";
import { validateRequirementsDraft } from "./requirements-quality";
import { removeUnrequestedCriteria, scopeGuidance, validateScopeClaims } from "./scope-quality";
import { validateArchitectureDraft, validateDatabaseSchemaDraft } from "./architecture-quality";
import { QA_COPY } from "./qa-labels";
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
  // Tidak diminta lagi di prompt (redundan: call sudah per fitur), tapi tetap
  // diterima kalau model kebiasaan menulisnya.
  feature: z.string().default(""),
  sub_feature: z.string(),
  title: z.string(),
  layer: layerSchema,
  phase: z.number().int().positive(),
  page: z.string().nullable().default(null),
  deps: z.array(z.string()).default([]),
});

const stage3Schema = z.object({ tasks: z.array(rawTaskSchema) });

const diagramSchema = z.object({ mermaid: z.string().min(1) });

/**
 * Filter penertiban istilah teknis otomatis (deterministic safeguard).
 * Memastikan output LLM tidak pernah meloloskan terjemahan kaku KBBI
 * seperti pratinjau, antarmuka, tangkapan layar, papan klip, dll.
 */
export function sanitizeTechTerms(text: string): string {
  if (!text || typeof text !== "string") return text;

  const cap = (s: string, rep: string) => {
    if (s[0] === s[0].toUpperCase()) {
      return rep[0].toUpperCase() + rep.slice(1);
    }
    return rep;
  };

  return text
    .replace(/\bprat[ai]njau\b/gi, (m) => cap(m, "preview"))
    .replace(/\bantarmuka pengguna\b/gi, (m) => cap(m, "user interface"))
    .replace(/\bantarmuka\b/gi, "UI")
    .replace(/\b(?:tangkapan|tangkap|cuplikan) layar\b/gi, (m) => cap(m, "screenshot"))
    .replace(/\bpapan klip\b/gi, (m) => cap(m, "clipboard"))
    .replace(/\bbasis data\b/gi, (m) => cap(m, "database"))
    .replace(/\bkerangka kerja\b/gi, (m) => cap(m, "framework"))
    .replace(/\balur kerja\b/gi, (m) => cap(m, "workflow"))
    .replace(/\bpohon hie?rarki node\b/gi, (m) => cap(m, "node tree"))
    .replace(/\bpipa aliran data\b/gi, (m) => cap(m, "data stream"))
    .replace(/\bPenyandi Base64\b/g, "Base64 Encoder")
    .replace(/\bpenyandi Base64\b/gi, "Base64 encoder")
    .replace(/\bumpan balik haptik\b/gi, (m) => cap(m, "haptic feedback"))
    .replace(/\bpengguliran otomatis\b/gi, (m) => cap(m, "auto-scroll"))
    .replace(/\btata letak\b/gi, (m) => cap(m, "layout"))
    .replace(/\bkata sandi\b/gi, (m) => cap(m, "password"))
    .replace(/\bkredensial\b/gi, (m) => cap(m, "credentials"))
    .replace(/\bberkas log\b/gi, (m) => cap(m, "file log"))
    .replace(/\bberkas cadangan\b/gi, (m) => cap(m, "file backup"))
    .replace(/\bberkas diagnostik\b/gi, (m) => cap(m, "file diagnostik"))
    .replace(/\b(?:penyusun|pembuat) header otorisasi\b/gi, (m) => cap(m, "auth header builder"))
    .replace(/\bheader otorisasi\b/gi, (m) => cap(m, "auth header"))
    .replace(/\bautentikasi\b/gi, (m) => cap(m, "auth"))
    .replace(/\botentikasi\b/gi, (m) => cap(m, "auth"));
}

function normalize(obj: unknown): unknown {
  if (typeof obj === "string") return sanitizeTechTerms(obj);
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
    throw new Error("JSON parsing gagal: respons model tidak membentuk objek JSON yang valid.");
  }
}

interface LlmUsage {
  tokensIn: number;
  tokensOut: number;
  /** Model yang melayani call (diisi callLlm, ikut tersimpan di usage_events). */
  models: string[];
}

type GenerationStage = "outline" | "subfeatures" | "architecture" | "database" | "requirements" | "tasks" | "diagram" | "idea";

interface LlmCallOptions<T> {
  stage?: GenerationStage;
  validate?: (value: T) => string[];
  providers?: LlmProvider[];
}

class QualityError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("; "));
    this.name = "QualityError";
  }
}

const stageRoles: Record<GenerationStage, string> = {
  outline: "You are a senior product manager writing a faithful, testable product plan.",
  subfeatures: "You are a product architect decomposing one product area into distinct, testable capabilities.",
  architecture: "You are a solution architect. Ground every component and trade-off in this product's requirements.",
  database: "You are a database architect. Ground tables, relationships, and constraints in this product's requirements.",
  requirements: "You are a product manager writing concrete user flows and verifiable requirements.",
  tasks: "You are a technical lead writing executable, traceable implementation tasks.",
  diagram: "You are an architect drawing an accurate diagram from the supplied product context.",
  idea: "You are a product manager extending an existing product plan without losing its scope.",
};

/** Helper untuk cek quota exhaustion dari HTTP status + response body */
const isQuotaExhausted = (status: number, body: string): boolean => {
  return status === 429 ||
         status === 402 ||
         /exhaust|quota|insufficient balance|too many requests|rate.?limit/i.test(body);
};

/** SATU request HTTP ke satu entri provider. Gak ada retry di sini — failover
 * antar entri ditangani callLlm, biar model yang sakit langsung ditinggal. */
async function attemptOnce<T>(
  schema: z.ZodType<T>,
  prompt: string,
  cfg: { baseUrl: string; apiKey: string; model: string },
  usage: LlmUsage | undefined,
  cycle: number,
  options: LlmCallOptions<T>,
  feedback?: string[],
): Promise<T> {
  const { baseUrl, apiKey, model } = cfg;
  const configuredTimeout = Number(process.env.LLM_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : options.stage === "architecture" || options.stage === "database" || options.stage === "requirements"
      ? 120_000
      : 60_000;
  // Siklus kedua pakai varian prompt: hindari replay respons rusak yang
  // di-cache proxy, sekaligus mengarahkan model menulis ulang JSON dengan
  // benar. Nonce bikin varian unik supaya gak ikut ter-cache.
  const userContent = cycle === 0
    ? prompt
    : `${prompt}\n\nThe previous answer failed these checks: ${(feedback ?? ["Invalid JSON or missing required fields"]).join("; ")}. Regenerate this section in full with concrete product-specific details and valid JSON. Do not invent facts. (retry-${Date.now()})`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  console.log(`[LLM] request ke ${baseUrl}/chat/completions (model: ${model}, siklus ${cycle + 1})`);
  try {
    const res = await publicProviderFetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: `${stageRoles[options.stage ?? "outline"]} Return one valid JSON object only. Use double-quoted keys and strings, with no prose, Markdown fences, comments, or trailing commas. Preserve confirmed user facts, chosen language, and the exact requested field names.` },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: options.stage === "subfeatures" || options.stage === "tasks" ? 8192 :
          options.stage === "database" || options.stage === "requirements" ? 6144 : 4096,
        // Streaming: parser SSE auto-detect dan fallback ke JSON, jadi aman
        // untuk gateway yang mengabaikan flag ini. Manfaat: token pertama
        // langsung mengalir (progress), dan gateway tidak menahan seluruh
        // respons reasoning-model yang lambat di buffer.
        stream: true,
      }),
      signal: controller.signal,
    });
    const elapsed = Date.now() - start;
    if (!res.ok) {
      const text = await res.text();
      console.error(`[LLM] ${model} error ${res.status} in ${elapsed}ms`);
      if (isQuotaExhausted(res.status, text)) {
        throw new Error(`Quota habis untuk model ${model} (${res.status})`);
      }
      throw new Error(`LLM gagal: HTTP ${res.status} dari ${model}`);
    }
    const parsed = await parseLLMResponse(res, { logDebug: false });
    if (usage && parsed.usage) {
      usage.tokensIn += parsed.usage.prompt_tokens ?? 0;
      usage.tokensOut += parsed.usage.completion_tokens ?? 0;
    }
    const raw = JSON.parse(extractJson(parsed.content ?? ""));
    const value = schema.parse(normalize(raw));
    const issues = options.validate?.(value) ?? [];
    if (issues.length > 0) {
      throw new QualityError(issues);
    }
    console.log(`[LLM] ${model} OK in ${Date.now() - start}ms`);
    return value;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Coba model utama lebih dulu. Bila responsnya rusak atau dangkal, minta satu
 * perbaikan dari model yang sama sebelum beralih ke model cadangan.
 */
async function callLlm<T>(schema: z.ZodType<T>, prompt: string, usage?: LlmUsage, options: LlmCallOptions<T> = {}): Promise<T> {
  const providers = options.providers ?? await resolveLlmProviders();
  if (providers.length === 0) throw new Error("Konfigurasi LLM belum lengkap (isi lewat Settings atau env)");
  const entries = providers.flatMap((p) => p.models.map((model) => ({ baseUrl: p.baseUrl, apiKey: p.apiKey, model })));
  if (entries.length === 0) throw new Error("Konfigurasi LLM belum lengkap: tidak ada model di daftar provider");

  let lastError: unknown;
  let exhaustedCount = 0;
  for (const entry of entries) {
    let feedback: string[] | undefined;
    for (let cycle = 0; cycle < 2; cycle++) {
      try {
        const result = await attemptOnce(schema, prompt, entry, usage, cycle, options, feedback);
        if (usage && !usage.models.includes(entry.model)) usage.models.push(entry.model);
        return result;
      } catch (error) {
        lastError = error;
        if (isExhaustedError(error)) {
          exhaustedCount++;
          console.warn(`[LLM] ${entry.model} kehabisan quota, pindah ke entri berikutnya`);
          break;
        }
        const repairable = error instanceof QualityError || error instanceof z.ZodError ||
          (error instanceof Error && error.message.startsWith("JSON parsing gagal"));
        if (repairable && cycle === 0) {
          feedback = error instanceof QualityError ? error.issues : ["Invalid JSON or missing required fields"];
          console.warn(`[LLM] ${entry.model} ${options.stage ?? "outline"} gagal validasi, coba perbaiki bagian ini`);
          continue;
        }
        if (entries.length === 1 && cycle === 0 && error instanceof Error && error.name !== "AbortError") {
          feedback = ["The previous request failed. Return complete valid JSON"];
          continue;
        }
        console.warn(`[LLM] ${entry.model} ${options.stage ?? "outline"} gagal, pindah ke entri berikutnya`);
        break;
      }
    }
  }
  if (exhaustedCount === entries.length && entries.length > 1) {
    throw new Error(`Semua model (${entries.map((e) => e.model).join(", ")}) kehabisan quota. Coba lagi nanti atau tambah provider/model di Settings.`);
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
  handoff: HandoffSettings = legacyHandoff,
  providers?: LlmProvider[],
): Promise<string | null> {
  try {
    const kindPrompt =
      kind === "architecture"
        ? "Buat diagram arsitektur sistem: flowchart TD mermaid yang menunjukkan komponen utama, lapisan (frontend/backend/data), dan alur data. Node harus memakai nama komponen nyata dari arsitektur di narasi."
        : "Buat ERD: erDiagram mermaid dengan entitas nyata dari database schema di narasi, lengkap dengan tipe kolom, PK/FK, dan kardinalitas relasi antar entitas.";
    const result = await callLlm(
      diagramSchema,
      `Produk: ${context.title}\nStack: ${JSON.stringify(context.stack)}\nFitur: ${JSON.stringify(context.featureTitles)}\n\nBerikut narasi ${kind === "architecture" ? "arsitektur" : "database schema"} yang sudah dibuat:\n---\n${narrative.slice(0, 6000)}\n---\n\n${kindPrompt}\n${handoffInstructions(handoff)}\nDiagram WAJIB spesifik untuk produk ini, dilarang memakai struktur generik (mis. node "CDN / Edge Cache" -> frontend -> backend -> database yang sama untuk semua project). HANYA isi JSON: {"mermaid":"flowchart TD\\n..."} atau {"mermaid":"erDiagram\\n..."}, teks mermaid TANPA pagar backtick.`,
      usage,
      { stage: "diagram", providers },
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
const STYLE_RULE = `ATURAN GAYA PENULISAN:
1. Tulis semua teks TANPA tanda hubung panjang (em dash "—" atau en dash "–"). Gunakan koma, titik, atau titik dua sebagai pengganti.
2. Tulis seperti profesional manusia di bidangnya: konkret, spesifik, tanpa kalimat generik.
3. ISTILAH TEKNIS KOMPUTER/SOFTWARE/DEV WAJIB TETAP DALAM BAHASA INGGRIS. DILARANG KERAS menerjemahkan istilah teknis bahasa Inggris ke bahasa Indonesia yang kaku/aneh. Contoh:
   - Gunakan "preview" (JANGAN "pratinjau")
   - Gunakan "UI" / "interface" (JANGAN "antarmuka")
   - Gunakan "screenshot" (JANGAN "tangkapan layar" atau "cuplikan layar")
   - Gunakan "clipboard" (JANGAN "papan klip")
   - Gunakan "upload" (JANGAN "unggah")
   - Gunakan "download" (JANGAN "unduh")
   - Gunakan "database" (JANGAN "basis data")
   - Gunakan "framework" (JANGAN "kerangka kerja")
   - Gunakan "workflow" (JANGAN "alur kerja")
   - Gunakan "credentials" (JANGAN "kredensial")
   - Gunakan "password" (JANGAN "kata sandi")
   - Gunakan "queue" (JANGAN "antrean" atau "antrian")
   - Gunakan "layout" (JANGAN "tata letak")
   - Gunakan "auto-scroll" (JANGAN "pengguliran otomatis")
   - Gunakan "haptic feedback" (JANGAN "umpan balik haptik")
   - Gunakan "node tree" (JANGAN "pohon node" atau "pohon hirarki")
   - Gunakan "data stream" (JANGAN "pipa aliran data")
   - Gunakan "file log" (JANGAN "berkas log")
   - Gunakan "endpoint", "browser", "link", "cache", "cookie", "setup", "deploy", "auth", "login", "dashboard", dll apa adanya.
4. Tulis dengan suara profesional yang modern dan mudah dipindai pembaca Gen Z: kalimat aktif, singkat, jelas, tanpa slang, hype, pujian kosong, atau jargon pemasaran. Detail teknis dan kriteria uji tetap lengkap.`;

// FIX v2: Enforce tier limits BEFORE calling LLM to avoid wasted tokens
function getEnforcedBrief(brief: string, tier: Tier | string | null | undefined): string {
  const [minFeatures, maxFeatures] = structureLimits(tier).features;
  const minSubfeatures = structureLimits(tier).subFeatures[0];
  return `${brief}\n\nPRIORITY CONSTRAINT: Buat ${minFeatures} sampai ${maxFeatures} fase berbeda berdasarkan workflow dan aktor yang diminta, bukan sekadar mengejar jumlah minimum. Tambah fase saat satu alur penting seperti administrasi, pembayaran, atau operasional pemilik tidak cocok di bawah fase lain. Cakup seluruh kebutuhan eksplisit dalam brief sebagai prioritas utama; jangan sembunyikan moderasi admin di bawah laporan pemilik. Fitur pendukung boleh diusulkan hanya bila langsung melengkapi workflow yang diminta; tandai sebagai usulan pendukung dan jelaskan hubungannya, bukan kebutuhan yang dikonfirmasi. Jangan ubah platform, aktor, model bisnis, larangan eksplisit, atau prioritas pengguna demi tambahan fitur. Tiap fase harus cukup luas untuk ${minSubfeatures} kemampuan produk atau operasional berbeda yang dapat diuji. Jangan jadikan satu aturan seperti timezone, RBAC, double-booking prevention, QA, testing, dokumentasi, atau monitoring sebagai fase tersendiri. Double-booking belongs inside booking or checkout as a testable invariant. Gabungkan fase yang terlalu sempit ke workflow terkait.`;
}

/** Jawaban klarifikasi user yang sudah diratakan jadi string, siap masuk prompt. */
export interface ContextAnswer {
  question: string;
  answer: string;
}

function confirmedScopeForValidation(brief: string, answers: readonly ContextAnswer[]): string {
  const decisions = answers.map(({ question, answer }) => {
    const reply = answer.trim();
    if (/^(?:no|nope|not now|later|tidak|nggak|enggak|bukan|nanti|belum)\b/i.test(reply)) {
      return `Do not include this proposed capability: ${question}`;
    }
    return `${question}: ${reply}`;
  });
  return [brief, ...decisions].join("\n");
}

function affirmativeScopeForValidation(brief: string, answers: readonly ContextAnswer[]): string {
  return [brief, ...answers.filter(({ answer }) =>
    !/^(?:no|nope|not now|later|tidak|nggak|enggak|bukan|nanti|belum)\b/i.test(answer.trim()),
  ).map(({ question, answer }) => `${question}: ${answer}`)].join("\n");
}

export async function generatePlanStructure(
  brief: string,
  techPrefs: { mode: "auto" | "custom"; frontend?: string; backend?: string; database?: string; deployment?: string },
  contextAnswers?: ContextAnswer[],
  tier: Tier | string | null | undefined = "free",
  handoff: HandoffSettings = defaultHandoff,
): Promise<GenerateResult> {
  const styleRule = STYLE_RULE + "\n" + handoffInstructions(handoff) + "\n" + scopeGuidance();
  const usage: LlmUsage = { tokensIn: 0, tokensOut: 0, models: [] };
  const providers = await resolveLlmProviders();
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
  const confirmedScope = confirmedScopeForValidation(brief, contextAnswers ?? []);
  const affirmativeScope = affirmativeScopeForValidation(brief, contextAnswers ?? []);
  const enforcedBrief = getEnforcedBrief(brief, tier);

  const one = await callLlm(
    stage1Schema,
     `${enforcedBrief}\n${stackHint}${answersBlock}\n\nKamu adalah product manager senior. Buat PRD awal yang mendalam:\n${styleRule}\n1. Judul produk WAJIB nama brand yang diberikan pengguna jika ada. Bila belum ada, pilih nama singkat sesuai bahasa output. Jangan tempelkan deskripsi pada judul.\n2. Pisahkan fakta dari asumsi; jangan mengulang jawaban klarifikasi sebagai asumsi atau mengarang angka.\n3. Pilih stack teknologi yang sesuai kebutuhan dan batas biaya.\n4. Daftar ${limits.features[0]} sampai ${limits.features[1]} fase. Pilih jumlah yang cukup untuk setiap workflow eksplisit; jangan paksa jumlah minimum bila hasilnya menggabungkan dua aktor atau alur yang tidak serumpun. Setiap kebutuhan eksplisit di brief harus terwakili sebagai prioritas utama. Fitur pendukung yang langsung menyempurnakan alur tersebut boleh diusulkan; jelaskan kaitannya dengan alur pengguna dan tandai sebagai usulan, bukan kebutuhan yang dikonfirmasi. Jangan tambahkan produk atau alur bisnis yang tidak terkait. Tulis satu tanggung jawab produk utama tepat satu kali; jangan duplikasi checkout/pembayaran sebagai fase terpisah bila alurnya sama.\n5. Untuk tiap fitur: deskripsi spesifik, tujuan yang bisa diamati, dan 2-8 kriteria selesai yang dapat diuji. Detail implementasi diuraikan pada subfitur; jangan mengisi kriteria fase dengan filler atau menyajikan usulan sebagai fakta dari pengguna. Jangan sebut opsi yang secara tegas dikecualikan brief, bahkan sebagai kriteria negatif.\n\nWAJIB gunakan field PERSIS: title, assumptions, stack, features (title, icon, description, tujuan, selesai_bila, priority). Format: {"title":"...","assumptions":[],"stack":[],"features":[{"title":"...","icon":"...","description":"...","tujuan":"...","selesai_bila":[],"priority":"high"}]}}`,
    usage,
    { stage: "outline", providers, validate: (draft) => {
      for (const feature of draft.features) {
        feature.selesai_bila = removeVagueCriteria(
          removeUnrequestedCriteria(feature.selesai_bila, { brief, confirmedAnswers: contextAnswers ?? [] }, 2),
          2,
        );
      }
      return [
        ...validateFeatureDraft(draft.features, tier, affirmativeScope),
        ...validateScopeClaims({
        brief,
        confirmedAnswers: contextAnswers ?? [],
        candidates: draft.features.flatMap((feature, index) => [
          { path: `features[${index}].title`, text: feature.title },
          { path: `features[${index}].description`, text: feature.description },
          { path: `features[${index}].tujuan`, text: feature.tujuan },
          ...feature.selesai_bila.map((text, criterion) => ({ path: `features[${index}].selesai_bila[${criterion}]`, text })),
        ]),
        }),
      ];
    } },
  );

  // Hard cutoff AFTER validation but still warn
  const stage1Features = one.features.slice(0, limits.features[1]);

  // Jaring pengaman nama brand: LLM kadang tetap menempel deskripsi di judul
  // ("FutsalGo: Aplikasi Booking Lapangan"). Kepala plan cukup nama mereknya;
  // deskripsi dibuang karena sudah ada di brief dan isi PRD.
  const brandTitle =
    one.title.split(/[:\u2013\u2014]|\s+-\s+/)[0].trim() || one.title;
  if (one.features.length > limits.features[1]) {
    structureWarnings.push(handoff.language === "en" ? `The response exceeded the feature limit (${one.features.length}). It was limited to ${limits.features[1]} for the ${tier === "pro" ? "Pro" : "Free"} plan.` : `Prompt melebihi batas (${one.features.length} fitur). Dipotong jadi ${limits.features[1]} sesuai paket ${tier === "pro" ? "Pro" : "Free"}.`);
  }
  const featureTitles = stage1Features.map((f) => f.title);

  // Setiap bagian menerima konteks produk yang sama. Dekomposisi Pro dibuat
  // per fase agar model murah dapat menyelesaikan satu domain dengan utuh.
  let sharedContext = JSON.stringify({
    brief,
    confirmedAnswers: contextAnswers ?? [],
    product: brandTitle,
    assumptions: one.assumptions,
    stack: one.stack,
    clientPlatformRule: "Keep the delivery platform from the brief and confirmed answers. A responsive website is not a native mobile app. For web-only products, label the client Browser or Web Client in prose and diagrams; do not introduce a native app or a future mobile roadmap.",
    qualityRules: "Preserve requested workflows first. A distinct supporting capability is allowed when it directly completes an existing user or operator workflow; explain its purpose and label it as a supporting proposal. Respect explicit exclusions. Do not pad counts with unrelated modules. Put cross-cutting implementation work inside concrete capabilities and tasks. Treat technology, policies and third-party providers not specified by the user as proposals, never confirmed facts.",
    features: stage1Features.map(({ title, description, tujuan, selesai_bila }) => ({ title, description, tujuan, selesai_bila })),
  });
  type SubfeatureCandidate = z.infer<typeof stage2Schema>["features"][number]["sub_features"][number];
  const cleanSubfeatures = (
    feature: z.infer<typeof featureSchema>,
    candidates: SubfeatureCandidate[],
    reservedQa: boolean,
    existing: readonly SubfeatureCandidate[] = [],
  ): SubfeatureCandidate[] => {
    const seenTitles = new Set(existing.map((sub) => sub.title.trim().toLocaleLowerCase()));
    const seenGoals = new Set(existing.map((sub) => sub.tujuan.trim().toLocaleLowerCase()));
    const accepted: SubfeatureCandidate[] = [];
    for (const candidate of candidates) {
      candidate.selesai_bila = removeVagueCriteria(
        removeUnrequestedCriteria(candidate.selesai_bila, { brief, confirmedAnswers: contextAnswers ?? [] }, 2),
        2,
      );
      const title = candidate.title.trim().toLocaleLowerCase();
      const goal = candidate.tujuan.trim().toLocaleLowerCase();
      if (seenTitles.has(title) || seenGoals.has(goal)) continue;
      if (validateSubfeatureDraft(feature, [candidate], tier, {
        reservedQa,
        brief: confirmedScope,
        allowUnderMin: true,
      }).length > 0) continue;
      if (validateScopeClaims({
        brief,
        confirmedAnswers: contextAnswers ?? [],
        candidates: [
          { path: "title", text: candidate.title },
          { path: "tujuan", text: candidate.tujuan },
          ...candidate.selesai_bila.map((text, index) => ({ path: `selesai_bila[${index}]`, text })),
        ],
      }).length > 0) continue;
      seenTitles.add(title);
      seenGoals.add(goal);
      accepted.push(candidate);
    }
    return accepted;
  };
  const batchSize = tier === "pro" ? 2 : 4;
  const subfeatureGroups = Array.from({ length: Math.ceil(stage1Features.length / batchSize) }, (_, index) =>
    stage1Features.slice(index * batchSize, (index + 1) * batchSize),
  );
  let nextGroup = 0;
  const subfeatureResults: Array<z.infer<typeof stage2Schema>> = new Array(subfeatureGroups.length);
  const subfeaturesPromise = Promise.all(Array.from({ length: Math.min(3, subfeatureGroups.length) }, async () => {
    while (nextGroup < subfeatureGroups.length) {
      const groupIndex = nextGroup++;
      const group = subfeatureGroups[groupIndex];
      const requested = group.map((feature) => {
        const index = stage1Features.indexOf(feature);
        return { ...feature, subfeatureTarget: limits.subFeatures[0] - (index === stage1Features.length - 1 ? 1 : 0), subfeatureRange: index === stage1Features.length - 1
          ? [limits.subFeatures[0] - 1, limits.subFeatures[1] - 1]
          : limits.subFeatures };
      });
      subfeatureResults[groupIndex] = await callLlm(
        stage2Schema,
        `Product context: ${sharedContext}\n\nGenerate sub-features ONLY for these phases: ${JSON.stringify(requested)}. Keep each feature title exactly unchanged. Aim for each phase's subfeatureTarget (the tier minimum), adding more only when requested workflows and their relevant supporting capabilities cannot fit naturally. Respect phase ownership: a capability implemented under another phase may be referenced as a dependency here, but must not become a second sub-feature. A user-facing control can stand alone only if it has distinct product rules and acceptance criteria; do not split selection, validation, persistence, refresh, and layout of the same action into separate capabilities. The final phase reserves one slot for ${QA_COPY[handoff.language].subFeature}, which the server adds automatically. Do not emit that QA sub-feature or any separate testing/QA sub-feature. Every sub-feature must solve a distinct problem with a measurable goal and at least two testable acceptance criteria. Each criterion should identify a trigger, observable outcome, or meaningful failure case; "handled safely", "sent in a timely manner", and restatements of the title are insufficient. Preserve all explicit requirements and confirmed answers, but omit explicitly excluded options completely. Allow relevant supporting proposals within these phases, with an explicit link to a requested workflow. Avoid unrelated modules and count padding.\n${styleRule}\nReturn {"features":[{"title":"exact title","sub_features":[{"title":"...","tujuan":"...","selesai_bila":["...","..."]}]}]}.`,
        usage,
        { stage: "subfeatures", providers, validate: (draft) => {
          const issues: string[] = [];
          if (draft.features.length !== group.length) issues.push(`Expected ${group.length} phases in this batch`);
          for (const feature of group) {
            const matched = draft.features.find((item) => item.title.trim().toLowerCase() === feature.title.trim().toLowerCase());
            if (!matched) { issues.push(`Missing phase: ${feature.title}`); continue; }
            const reservedQa = stage1Features.indexOf(feature) === stage1Features.length - 1;
            matched.sub_features = cleanSubfeatures(feature, matched.sub_features, reservedQa);
            if (matched.sub_features.length === 0) issues.push(`${feature.title}: no grounded subfeatures remained`);
            issues.push(...validateSubfeatureDraft(feature, matched.sub_features, tier, {
              reservedQa,
              brief: confirmedScope,
              allowUnderMin: true,
            }));
          }
          return issues;
        } },
      );
      for (const feature of group) {
        const matched = subfeatureResults[groupIndex].features.find((item) => item.title.trim().toLowerCase() === feature.title.trim().toLowerCase());
        if (!matched) throw new Error(`Sub-feature generation omitted phase: ${feature.title}`);
        const reservedQa = stage1Features.indexOf(feature) === stage1Features.length - 1;
        const target = limits.subFeatures[0] - (reservedQa ? 1 : 0);
        for (let attempt = 0; matched.sub_features.length < target && attempt < 3; attempt++) {
          const missing = target - matched.sub_features.length;
          const extra = await callLlm(
            stage2Schema,
            `Product context: ${sharedContext}\n\nComplete ONLY phase ${JSON.stringify(feature.title)} with exactly ${missing} NEW distinct capabilities grounded in the user brief. Existing accepted capabilities: ${JSON.stringify(matched.sub_features.map(({ title, tujuan }) => ({ title, tujuan })))}. Do not repeat these or introduce unrelated features. Relevant supporting proposals may complete the requested workflow; explain that relationship and label the addition as a proposal. A distinct customer or operator outcome is required; error handling, tests, documentation and technical quality are task details unless explicitly requested. Each new capability needs a specific goal and two acceptance criteria with observable results. ${styleRule}\nReturn {"features":[{"title":${JSON.stringify(feature.title)},"sub_features":[{"title":"...","tujuan":"...","selesai_bila":["...","..."]}]}]}.`,
            usage,
            { stage: "subfeatures", providers, validate: (draft) => {
              const supplement = draft.features.find((item) => item.title.trim().toLowerCase() === feature.title.trim().toLowerCase());
              if (!supplement) return [`Missing phase: ${feature.title}`];
              supplement.sub_features = cleanSubfeatures(feature, supplement.sub_features, reservedQa, matched.sub_features);
              return supplement.sub_features.length ? [] : [`${feature.title}: no distinct grounded supplements returned`];
            } },
          );
          const supplement = extra.features.find((item) => item.title.trim().toLowerCase() === feature.title.trim().toLowerCase());
          matched.sub_features.push(...(supplement?.sub_features ?? []).slice(0, missing));
        }
        const finalIssues = validateSubfeatureDraft(feature, matched.sub_features, tier, { reservedQa, brief: confirmedScope });
        if (finalIssues.length) throw new QualityError(finalIssues);
      }
    }
  })).then(() => subfeatureResults.flatMap((result) => result.features));

  const subfeatureDrafts = await subfeaturesPromise;
  const detailedContext = JSON.stringify({
    product: brandTitle,
    brief,
    confirmedAnswers: contextAnswers ?? [],
    assumptions: one.assumptions,
    stack: one.stack,
    qualityRules: "Preserve the brief first and allow relevant supporting proposals; do not introduce unrelated products or present unconfirmed durations, refund percentages, performance goals, providers, or implementation choices as user facts. Use configurable expiry and venue policy instead of numeric business defaults. Keep booking/payment state names consistent between flows and schema. The database section should be a concise PRD blueprint of 10-16 primary tables, not full SQL migrations; list essential columns, keys, constraints and relationships once. Requirements should contain at most 20 functional and 12 nonfunctional items, merging repetition.",
    features: stage1Features.map(({ title, tujuan }) => ({ title, tujuan })),
    subfeatures: subfeatureDrafts.map((phase) => ({
      phase: phase.title,
      capabilities: phase.sub_features.map(({ title }) => title),
    })),
  });
  sharedContext = detailedContext;
  const pruneScopeExtras = (draft: z.infer<typeof reqSchema>): void => {
    for (const flow of draft.user_flow) {
      flow.steps = removeUnrequestedCriteria(flow.steps, { brief, confirmedAnswers: contextAnswers ?? [] }, 2);
    }
    const groundedFlows = draft.user_flow.filter((flow) => validateScopeClaims({
      brief, confirmedAnswers: contextAnswers ?? [], candidates: [{ path: "title", text: flow.title }],
    }).length === 0);
    if (groundedFlows.length >= 2) draft.user_flow = groundedFlows;
    draft.requirements.fungsional = removeUnrequestedCriteria(draft.requirements.fungsional, { brief, confirmedAnswers: contextAnswers ?? [] }, 6);
    draft.requirements.non_fungsional = removeUnrequestedCriteria(draft.requirements.non_fungsional, { brief, confirmedAnswers: contextAnswers ?? [] }, 4);
  };
  const [archDataRaw, dbDataRaw, reqDataRaw] = await Promise.all([
    callLlm(
      archSchema,
      `Product context: ${sharedContext}\n\nKamu adalah solution architect. Buat architecture yang spesifik untuk kebutuhan produk ini.\n${styleRule} Jelaskan komponen utama, alur data end-to-end, keputusan arsitektur, trade-off yang relevan, error handling, auth, dan skalabilitas. Explain the handoff between real product components, not a generic catalog of technology or repeated paragraphs. For every brief requirement around concurrency, retries, callbacks, timezones, or authorization, explain the actual mechanism instead of a generic promise. A checkout hold must be persisted with owner and expiry; a row lock lasts only inside its transaction. If a hold duration is unspecified, call it configurable and do not invent a number. Explain how a late bank-transfer webhook is reconciled after expiry without confirming a slot held by someone else. Mark vendors and integrations not specified by the user as assumptions. Narasi 2-3 paragraf yang masing-masing punya tanggung jawab berbeda. Sertakan diagram mermaid flowchart TD di dalam field architecture.\n\nFormat: {"architecture":"detailed narrative followed by a mermaid flowchart TD in triple backticks"}}`,
      usage,
      { stage: "architecture", providers, validate: (draft) => [
        ...validateArchitectureDraft(draft.architecture, { brief: affirmativeScope, featureTitles }),
        ...validateScopeClaims({ brief, confirmedAnswers: contextAnswers ?? [], candidates: [{ path: "architecture", text: draft.architecture }] }),
      ] },
    ),
    callLlm(
      dbSchema,
      `Product context: ${sharedContext}\n\nKamu adalah database architect. Buat database schema yang sesuai seluruh kemampuan produk di context.\n${styleRule} Jelaskan tabel utama, kolom dan tipe, PK/FK/UNIQUE/INDEX yang diperlukan, serta keputusan penyimpanan yang tidak jelas dari brief sebagai asumsi. Show the data-level invariant behind each requested concurrency guarantee, callback idempotency, authorization boundary, and timezone rule; a generic claim is insufficient. For concurrent bookings, persist hold owner and expiry, then reject collisions with a database-enforced active-slot rule. With PostgreSQL and overlapping intervals, write an explicit EXCLUDE USING gist constraint on court/resource ID and tstzrange(start,end) WHERE status IN active booking states; alternatively describe an atomic conditional UPDATE of a canonical slot row that checks status and verifies one affected row. A plain lookup followed by insert is not safe. If the user gave no hold duration, make it configurable and do not invent a number. For payment callbacks, persist a UNIQUE provider_event_id or a durable atomic payment-state guard, including late settlement after a hold expires. State how time is stored and displayed, and where ownership policies are enforced. Keep schema names and state names consistent with flows. Identifikasi hot path. Sertakan ERD mermaid di field database_schema.\n\nFormat: {"database_schema":"### Tables... followed by a mermaid erDiagram in triple backticks"}}`,
      usage,
      { stage: "database", providers, validate: (draft) => [
        ...validateDatabaseSchemaDraft(draft.database_schema, { brief: affirmativeScope, featureTitles }),
        ...validateScopeClaims({ brief, confirmedAnswers: contextAnswers ?? [], candidates: [{ path: "database_schema", text: draft.database_schema }] }),
      ] },
    ),
    callLlm(
      reqSchema,
      `Product context: ${sharedContext}\n\nKamu adalah product manager. Buat user flow, requirements, dan tech stack yang konsisten dengan fitur dan subfitur final di atas.\n${styleRule}\n1. User flow: 2-4 alur utama, termasuk error path yang relevan.\n2. Requirements: minimal 6 fungsional dan 4 non-fungsional yang spesifik dan dapat diuji. Each item must name a concrete actor, observable behavior, or measurable invariant. A functional item defines what the user or system does; a nonfunctional item must explain an enforceable mechanism or observable failure behavior. "Reliable", "accurate", "consistent", "timely", "secure", or "roles enforced" alone are not testable. Describe the actual check, record, retry, permission boundary, or failure response without inventing a numeric SLA. Relevant supporting capabilities are allowed when they directly improve a requested workflow; explain that relationship and mark them as supporting proposals rather than user-confirmed requirements. Do not add unrelated workflows or override explicit exclusions. Do not mention explicitly excluded features even in a negative or future-scope statement here; leave them out of flows and requirements entirely. For unspecified vendors, mark the choice as an assumption. Any duration, SLA, throughput, or performance target not supplied by the user must be clearly labeled proposed or assumed and require user confirmation; never present it as a fixed commitment.\n3. Tech stack: alasan singkat untuk tiap teknologi, sesuai stack yang dipilih. Do not present recommendations as user-confirmed choices.\n\nFormat: {"user_flow":[{"title":"...","steps":["..."]}],"requirements":{"fungsional":[],"non_fungsional":[]},"tech_stack":[{"name":"...","desc":"..."}]}}`,
      usage,
      { stage: "requirements", providers, validate: (draft) => {
        pruneScopeExtras(draft);
        return [
        ...validateRequirementsDraft(draft, {
          brief,
          confirmedAnswers: contextAnswers ?? [],
          stack: one.stack,
          language: handoff.language,
        }),
        ...validateScopeClaims({
          brief,
          confirmedAnswers: contextAnswers ?? [],
          candidates: [
            ...draft.user_flow.map((flow, index) => ({ path: `user_flow[${index}]`, text: [flow.title, ...flow.steps].join(". ") })),
            ...draft.requirements.fungsional.map((item, index) => ({ path: `requirements.fungsional[${index}]`, text: item })),
            ...draft.requirements.non_fungsional.map((item, index) => ({ path: `requirements.non_fungsional[${index}]`, text: item })),
          ],
        }),
      ]; } },
    ),
  ]);

  const archData = {
    architecture: archDataRaw?.architecture ?? "",
    databaseSchema: dbDataRaw?.database_schema ?? "",
    userFlow: reqDataRaw?.user_flow ?? [],
    requirements: reqDataRaw?.requirements ?? { fungsional: [], non_fungsional: [] },
    techStack: reqDataRaw?.tech_stack ?? [],
  };

  let subFeatureTrimmed = false;
  const featureListFromTwo = subfeatureDrafts;
  const features = stage1Features.map((f) => {
    const mapped = featureListFromTwo.find((x: any) => x?.title === f.title || String(x?.title ?? "").toLowerCase().trim() === f.title.toLowerCase().trim());
    if (!mapped) throw new Error(`Sub-feature generation omitted phase: ${f.title}`);
    const rawSubs = mapped.sub_features;
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
    structureWarnings.push(handoff.language === "en" ? `Subfeatures per phase were limited to ${limits.subFeatures[1]} for the ${tier === "pro" ? "Pro" : "Free"} plan.` : `Jumlah sub-fitur per fase dibatasi ${limits.subFeatures[1]} sesuai paket ${tier === "pro" ? "Pro" : "Free"}`);
  }

  const resolvedStack = one.stack?.length
    ? one.stack
    : techPrefs.mode === "custom"
      ? [techPrefs.frontend, techPrefs.backend, techPrefs.database, techPrefs.deployment].filter((s): s is string => !!s)
      : ["Next.js", "PostgreSQL", "Railway"];
  const stackDecision = handoff.language === "en"
    ? "The tech stack is an AUTO-mode recommendation and has not been confirmed by the user."
    : "Tech stack adalah rekomendasi mode AUTO dan belum dikonfirmasi pengguna.";
  const assumptions = techPrefs.mode === "auto"
    ? [...one.assumptions.filter((item) => !/stack.*(?:recommend|rekomendasi)|(?:recommend|rekomendasi).*stack/i.test(item)), stackDecision]
    : one.assumptions;

  // Normalisasi fence tanpa label + deteksi dini diagram yang hilang: kalau LLM
  // ngasih narasi tapi TANPA diagram mermaid, minta LLM gambar ulang diagramnya
  // (spesifik per project) SEBELUM fallback template punya kesempatan masuk.
  const archRaw = normalizeMermaidFences((archData.architecture ?? "").trim());
  const dbRaw = normalizeMermaidFences((archData.databaseSchema ?? "").trim());
  const ctx = { title: brandTitle, stack: resolvedStack, featureTitles: featureTitles };

  const [archDiagram, dbDiagram] = await Promise.all([
    archRaw && !hasMermaidDiagram(archRaw) ? regenerateDiagram("architecture", ctx, archRaw, usage, handoff, providers) : Promise.resolve(null),
    dbRaw && !hasMermaidDiagram(dbRaw) ? regenerateDiagram("database", ctx, dbRaw, usage, handoff, providers) : Promise.resolve(null),
  ]);

  const { architecture, databaseSchema, usedFallback } = applyArchFallback(
    { title: brandTitle, stack: resolvedStack, features: features as never },
    archDiagram ? `${archRaw}\n\n${archDiagram}` : archRaw,
    dbDiagram ? `${dbRaw}\n\n${dbDiagram}` : dbRaw,
    { injectDiagrams: true, language: handoff.language },
  );

  const WARNING_LABELS: Record<string, string> = {
    architecture: "Arsitektur memakai template generik karena LLM gagal",
    "architecture:diagram": "Diagram arsitektur memakai template karena regenerasi diagram gagal",
    "architecture:diagram-missing": "Diagram arsitektur memakai template (narasi LLM tanpa diagram)",
    databaseSchema: "Database schema memakai template generik karena LLM gagal",
    "databaseSchema:diagram": "ERD memakai template karena regenerasi diagram gagal",
    "databaseSchema:diagram-missing": "ERD memakai template (narasi LLM tanpa diagram)",
  };
  if (!reqDataRaw) structureWarnings.push(handoff.language === "en" ? "Requirements and user flows could not be generated. Review this draft before implementation." : "Kebutuhan dan user flow belum berhasil dibuat. Tinjau draft ini sebelum implementasi.");
  const englishWarnings: Record<string, string> = { architecture: "Architecture uses a generic fallback draft because generation failed.", databaseSchema: "Database schema uses a generic fallback draft because generation failed.", "architecture:diagram-missing": "The architecture diagram uses a generic fallback. Review it against the requirements.", "databaseSchema:diagram-missing": "The ERD uses a generic fallback. Review it against the requirements." };
  const warnings = [...usedFallback.map((code) => handoff.language === "en" ? englishWarnings[code] ?? `Fallback used: ${code}` : WARNING_LABELS[code] ?? `Fallback dipakai: ${code}`), ...structureWarnings];
  if (usedFallback.length) {
    console.warn(`[generate] fallback dipakai untuk: ${usedFallback.join(", ")}`);
  }

  return {
    title: brandTitle,
    brief,
    stack: resolvedStack,
    techStack: archData.techStack,
    asumsi: assumptions,
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
  handoff: HandoffSettings = legacyHandoff,
  context?: {
    featureDescription?: string;
    featureGoal?: string;
    featureCriteria?: string[];
    subFeatures?: Array<{ title: string; tujuan?: string; selesaiBila?: string[] }>;
    requirements?: { fungsional?: string[]; nonFungsional?: string[] };
    stack?: string[];
    reservedQa?: boolean;
  },
): Promise<{ tasks: Omit<GenerateTask, "ref">[]; usage: LlmUsage }> {
  const styleRule = STYLE_RULE + "\n" + handoffInstructions(handoff) + "\n" + scopeGuidance();
  const usage: LlmUsage = { tokensIn: 0, tokensOut: 0, models: [] };
  // Budget task per fitur berlaku per unit fitur/sub-fitur sesuai batas tier.
  const [fullMinTasks, fullMaxTasks] = taskRangePerFeature(tier, featureCount, subFeatures.length);
  const reservedQa = context?.reservedQa === true;
  const minTasks = Math.max(subFeatures.length, fullMinTasks - (reservedQa ? 4 : 0));
  const maxTasks = fullMaxTasks - (reservedQa ? 4 : 0);
  const taskBudgetRule = `Buat ${minTasks} sampai ${maxTasks} task untuk fitur ini (WAJIB tidak melebihi ${maxTasks}). Pastikan SETIAP sub-fitur memiliki alokasi task (minimal frontend, backend, atau QA).`;
  // Ide user (fitur Pro) disuntikkan ke prompt AI sebagai referensi wajib:
  // kalau ada ide yang relevan dengan fitur ini, task-nya HARUS mengakomodasi
  // ide tersebut walau belum tercakup di struktur awal.
  const ideaBlock = ideas && ideas.length > 0
    ? `\nREFERENSI WAJIB — IDE TAMBAHAN DARI USER (baca semua; jika relevan dengan fitur ini, pastikan ada task yang mengakomodasinya):\n${ideas.map((i, n) => `${n + 1}. "${i.text}"${i.featureTitle ? ` (sudah punya fase: ${i.featureTitle})` : ""}`).join("\n")}\n`
    : "";
  const result = await callLlm(
    stage3Schema,
    `Product context: ${JSON.stringify({ brief, featureTitle, featureDescription: context?.featureDescription, featureGoal: context?.featureGoal, featureCriteria: context?.featureCriteria, subFeatures: context?.subFeatures ?? subFeatures.map((title) => ({ title })), requirements: context?.requirements, stack: context?.stack })}\n${ideaBlock}\nKamu adalah tech lead senior. Buat task untuk fitur ini saja dengan pendekatan kritis:\n${styleRule}\n1. ${taskBudgetRule} Tiap task harus spesifik dan menelusur ke tujuan serta kriteria selesai subfitur yang bersangkutan.${reservedQa ? ` Four ${QA_COPY[handoff.language].subFeature} tasks are added by the server afterward; do not count them in this response.` : ""}\n2. Setiap sub-fitur harus mendapat minimal satu task yang relevan.\n3. Tiap judul task maksimal 60 karakter, diawali kata kerja, tanpa mengulang nama fitur.\n4. Sertakan validasi, error path, integrasi dan pengujian yang relevan, tanpa task generik yang hanya mengisi jumlah.\n5. Beri SETIAP task id unik berurutan: t1, t2, t3, dst.\n6. Dependency hanya merujuk task dalam daftar ini yang harus selesai lebih dulu, tanpa siklus. Task paralel memakai deps [].\n7. Urutan logis layer: frontend -> backend -> qa.\n8. Setiap task wajib field: id, sub_feature (judul sub-fitur persis dari daftar), title, layer (frontend/backend/qa), phase, page (null atau path), deps (array id). JANGAN tulis field feature.\n\nFormat: {"tasks":[{"id":"t1","sub_feature":"${subFeatures[0] ?? "..."}","title":"...","layer":"frontend","phase":${featureIndex + 1},"page":null,"deps":[]}]}`,
    usage,
    { stage: "tasks", validate: (draft) => validateTaskDraft(draft.tasks, subFeatures, tier, { reservedQa }) },
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
export async function convertIdeaToFeature(brief: string, ideaText: string, phase: number, handoff: HandoffSettings = legacyHandoff): Promise<IdeaFeature> {
  const usage: LlmUsage = { tokensIn: 0, tokensOut: 0, models: [] };
  const result = await callLlm(
    ideaPhaseSchema,
    `Brief project: ${brief}

IDE TAMBAHAN DARI USER (wajib diwujudkan, ini alasan fitur ini ada):
${ideaText}

Kamu adalah product architect senior. Ubah ide user di atas menjadi SATU fase baru di project ini:
${STYLE_RULE}\n${handoffInstructions(handoff)}\n${scopeGuidance()}
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
