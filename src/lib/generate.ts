import { z } from "zod";

const featureSchema = z.object({
  title: z.string(),
  icon: z.string(),
  description: z.string(),
  tujuan: z.string(),
  selesai_bila: z.array(z.string()),
  priority: z.enum(["high", "medium", "low"]),
});

const stage1Schema = z.object({
  title: z.string(),
  assumptions: z.array(z.string()),
  stack: z.array(z.string()).optional(),
  features: z.array(featureSchema).min(2),
});

const archSchema = z.object({
  architecture: z.string(),
  database_schema: z.string(),
  user_flow: z.array(z.object({
    title: z.string(),
    steps: z.array(z.string()),
  })),
  requirements: z.object({
    fungsional: z.array(z.string()),
    non_fungsional: z.array(z.string()),
  }),
  tech_stack: z.array(z.object({
    name: z.string(),
    desc: z.string(),
  })),
});

const stage2Schema = z.object({
  features: z.array(
    z.object({
      title: z.string(),
      sub_features: z.array(
        z.object({
          title: z.string(),
          tujuan: z.string(),
          selesai_bila: z.array(z.string()),
        }),
      ),
    }),
  ),
});

const rawTaskSchema = z.object({
  feature: z.string(),
  sub_feature: z.string(),
  title: z.string(),
  layer: z.enum(["frontend", "backend", "qa"]),
  phase: z.number().int().positive(),
  page: z.string().nullable(),
  deps: z.array(z.string()),
});

const stage3Schema = z.object({ tasks: z.array(rawTaskSchema) });

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
  let clean = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  clean = clean.replace(/,\s*([}\]])/g, "$1");
  const starts = [clean.indexOf("{"), clean.indexOf("[")].filter((x) => x >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("Respons LLM tidak memuat JSON");
  const raw = clean.slice(start, end + 1);
  try { JSON.parse(raw); return raw; } catch { /* repair below */ }
  try {
    const { jsonrepair } = require("jsonrepair");
    const repaired = jsonrepair(raw);
    JSON.parse(repaired);
    return repaired;
  } catch { /* second repair pass */ }
  try {
    const fixed = raw
      .replace(/(['"])?(\w+)(['"])?:/g, '"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/,\s*([}\]])/g, "$1");
    JSON.parse(fixed);
    return fixed;
  } catch {
    throw new Error(`JSON parsing gagal. Raw: ${raw.slice(0, 200)}...`);
  }
}

interface LlmUsage { tokensIn: number; tokensOut: number; }

async function callLlm<T>(schema: z.ZodType<T>, prompt: string, usage?: LlmUsage): Promise<T> {
  const baseUrl = process.env.LLM_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !apiKey || !model) throw new Error("Konfigurasi LLM belum lengkap");

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Balas HANYA dengan JSON valid tanpa markdown, tanpa komentar, tanpa trailing comma. Semua field name WAJIB double-quoted. Semua string WAJIB double-quoted. Jangan gunakan single quote." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 8192,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`LLM gagal: ${res.status} ${await res.text()}`);
      const body = await res.json();
      if (usage && body.usage) {
        usage.tokensIn += body.usage.prompt_tokens ?? 0;
        usage.tokensOut += body.usage.completion_tokens ?? 0;
      }
      try {
        const raw = JSON.parse(extractJson(body.choices?.[0]?.message?.content ?? ""));
        return schema.parse(normalize(raw));
      } catch (error) {
        lastError = error;
        if (attempt === 2) throw error;
      }
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === 2) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        console.warn(`[LLM] timeout pada attempt ${attempt + 1}, retry...`);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Parsing LLM gagal setelah 3 percobaan");
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
}

export interface GenerateTask {
  ref: string;
  feature: string;
  sub_feature: string;
  title: string;
  layer: "frontend" | "backend" | "qa";
  phase: number;
  page: string | null;
  deps: string[];
}

export async function generatePlanStructure(
  brief: string,
  techPrefs: { mode: "auto" | "custom"; frontend?: string; backend?: string; database?: string; deployment?: string },
): Promise<GenerateResult> {
  const usage: LlmUsage = { tokensIn: 0, tokensOut: 0 };
  const stackHint = techPrefs.mode === "custom" ? `User memilih: frontend=${techPrefs.frontend ?? "Next.js"}, backend=${techPrefs.backend ?? "Node.js"}, database=${techPrefs.database ?? "PostgreSQL"}, deployment=${techPrefs.deployment ?? "Railway"}` : "Biarkan AI memilih stack terbaik.";

  const one = await callLlm(
    stage1Schema,
    `${`Brief: ${brief}\n${stackHint}`}\n\nPerkaya brief tanpa bertanya ke user. Buat asumsi wajar. Buat judul produk singkat. Buat daftar fitur lengkap (min 3). Setiap fitur WAJIB punya priority: "high" (fitur inti/kritis), "medium" (penting tapi bisa ditunda), atau "low" (nice-to-have). WAJIB gunakan field dengan nama PERSIS: title, icon, description, tujuan, selesai_bila, priority. Format: {"title":"...","assumptions":[],"stack":[],"features":[{"title":"...","icon":"...","description":"...","tujuan":"...","selesai_bila":[],"priority":"high"}]}`,
    usage,
  );

  const featureTitles = one.features.map((f) => f.title);

  const [two, archDataRaw] = await Promise.all([
    callLlm(
      stage2Schema,
      `Brief: ${brief}\nFitur: ${JSON.stringify(featureTitles)}\n\nPecah setiap fitur menjadi sub_features selengkap yang dibutuhkan produk. Setiap sub_feature WAJIB punya: title, tujuan (tujuan spesifik sub-fitur tersebut), selesai_bila (array kondisi kapan sub-fitur dianggap selesai). Format: {"features":[{"title":"...","sub_features":[{"title":"...","tujuan":"...","selesai_bila":["..."]}]}]}`,
      usage,
    ),
    callLlm(
      archSchema,
      `Brief: ${brief}\nFitur: ${JSON.stringify(featureTitles)}\nStack: ${JSON.stringify(one.stack ?? [])}\n\nBuat dokumentasi lengkap untuk produk ini.\n\nUntuk "architecture": tulis narasi singkat penjelasan komponen utama (frontend, backend, database, integrasi eksternal). KEMUDIAN WAJIB sertakan diagram dengan format: triple-backtick mermaid lalu baris baru lalu flowchart TD lalu diagram lalu triple-backtick. Contoh format: triple-backtick-mermaid-baris-baru-flowchart-TD-baris-baru-A-[Komponen A]--konsol-B-[Komponen B]-triple-backtick. Gunakan flowchart TD atau sequenceDiagram.\n\nUntuk "database_schema": daftar setiap tabel dengan kolom dan tipe data (format: "### Tabel nama_tabel" lalu list "- kolom (tipe) - deskripsi"). KEMUDIAN WAJIB sertakan ERD dengan format: triple-backtick mermaid lalu erDiagram lalu relasi antar tabel lalu triple-backtick. Contoh: USERS ||--o{ TASKS : has\n\nUntuk "user_flow": buat array berisi alur-alur perjalanan pengguna utama. Setiap alur punya "title" dan "steps" (array langkah-langkah).\n\nUntuk "requirements": object dengan "fungsional" (array) dan "non_fungsional" (array).\n\nUntuk "tech_stack": array object {name, desc}.\n\nPENTING: architecture dan database_schema WAJIB mengandung mermaid code blocks (dibungkus triple backtick dengan kata mermaid). Tanpa mermaid, respons ditolak.\n\nFormat: {"architecture":"narasi... [mermaid code block dengan flowchart]","database_schema":"### Tabel... [mermaid code block dengan erDiagram]","user_flow":[{"title":"...","steps":["..."]}],"requirements":{"fungsional":["..."],"non_fungsional":["..."]},"tech_stack":[{"name":"...","desc":"..."}]}`,
      usage,
    ),
  ]);

  let archData = { architecture: "", database_schema: "", user_flow: [] as { title: string; steps: string[] }[], requirements: { fungsional: [] as string[], non_fungsional: [] as string[] }, tech_stack: [] as { name: string; desc: string }[] };
  if (archDataRaw) {
    archData = archDataRaw;
  }

  const features = one.features.map((f, fi) => {
    const mapped = two.features.find((x) => x.title === f.title);
    const subFeatures = (mapped?.sub_features ?? [{ title: "Umum", tujuan: "Fitur umum", selesai_bila: [] }]).map((sf) => ({
      title: sf.title,
      tujuan: sf.tujuan,
      selesaiBila: sf.selesai_bila,
      tasks: [],
    }));
    return { slug: f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), title: f.title, icon: f.icon, description: f.description, tujuan: f.tujuan, selesaiBila: f.selesai_bila, priority: f.priority, status: "direncanakan" as const, subFeatures };
  });

  return {
    title: one.title,
    brief,
    stack: one.stack ?? (techPrefs.mode === "custom" ? [techPrefs.frontend, techPrefs.backend, techPrefs.database, techPrefs.deployment].filter((s): s is string => !!s) : ["Next.js", "PostgreSQL", "Railway"]),
    techStack: archData.tech_stack,
    asumsi: one.assumptions,
    requirements: { fungsional: archData.requirements.fungsional, nonFungsional: archData.requirements.non_fungsional },
    userFlow: archData.user_flow,
    architecture: archData.architecture,
    databaseSchema: archData.database_schema,
    features,
    usage,
  };
}

export async function generateTasksForFeature(
  brief: string,
  featureTitle: string,
  subFeatures: string[],
  featureIndex: number,
): Promise<{ tasks: Omit<GenerateTask, "ref">[]; usage: LlmUsage }> {
  const usage: LlmUsage = { tokensIn: 0, tokensOut: 0 };
  const result = await callLlm(
    stage3Schema,
    `Brief: ${brief}\nFitur: ${featureTitle}\nSub-fitur: ${JSON.stringify(subFeatures)}\n\nBuat task untuk fitur ini saja. WAJIB minimal 5 task, maksimal 20 task total. Bagi rata antar sub-fitur. Setiap title WAJIB diawali kata kerja. WAJIB gunakan field: tasks (array of {feature, sub_feature, title, layer, phase, page, deps}). Format: {"tasks":[{"feature":"...","sub_feature":"...","title":"...","layer":"frontend","phase":${featureIndex + 1},"page":null,"deps":[]}]}`,
    usage,
  );
  return { tasks: result.tasks, usage };
}

export function buildTaskRef(featureIndex: number, subIndex: number, taskNum: number): string {
  return `F${String(featureIndex + 1).padStart(2, "0")}-S${String(subIndex + 1).padStart(2, "0")}-T${String(taskNum).padStart(2, "0")}`;
}
