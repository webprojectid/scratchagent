import "./lib-env";
/**
 * Benchmark model LLM di tunnel aktif — TANPA menyentuh llm_settings DB.
 * Jalur sama seperti stage-3 (generateTasksForFeature): prompt, system prompt,
 * temperature, max_tokens, dan stream:true persis generate.ts.
 * Ukur: durasi, time-to-first-token, validitas JSON, jumlah task, deps.
 *
 * Run: npx tsx scripts/bench-tunnel-models.ts
 */

const BASE_URL = "https://r8tur3s.abc-tunnel.us/v1";
const API_KEY = process.env.LLM_API_KEY ?? "";
const TIMEOUT_MS = 300_000;

const MODELS = [
  "HL/hallo/gemini-3.7-flash-medium",
  "HL/hallo/gpt-5.4",
];

// Konteks dari plan simulasi nyata (Sistem Kasir Warung Digital Pro, tier free).
const BRIEF =
  "Aplikasi kasir (POS) untuk warung makan kecil: manajemen menu dengan kategori dan varian harga, transaksi penjualan dengan pembayaran tunai dan QRIS, laporan penjualan harian dan bulanan, manajemen stok bahan baku dengan notifikasi stok menipis, serta struk digital yang bisa dibagikan via WhatsApp. Harus jalan lancar di Android tablet.";
const FEATURE_TITLE = "Master Data Menu Lengkap";
const SUB_FEATURES = [
  "Katalog Menu Terstruktur",
  "Varian dan Modifikasi Item",
  "Sinkronisasi Ketersediaan Real-time",
];

// taskRangePerFeature("free", featureCount=8, subFeatureCount=3) -> [8, 12]
const STYLE_RULE = `ATURAN GAYA PENULISAN: tulis semua teks TANPA tanda hubung panjang (em dash "—" atau en dash "–"). Gunakan koma, titik, atau titik dua sebagai pengganti. Tulis seperti profesional manusia di bidangnya: konkret, spesifik, tanpa kalimat generik.`;
const PROMPT = `Brief: ${BRIEF}\nFitur: ${FEATURE_TITLE}\nSub-fitur: ${JSON.stringify(SUB_FEATURES)}\nKamu adalah tech lead senior. Buat task untuk fitur ini saja dengan pendekatan kritis:\n${STYLE_RULE}\n1. Buat 8 sampai 12 task untuk fitur ini (WAJIB tidak melebihi 12). Pastikan SETIAP sub-fitur memiliki alokasi task (minimal frontend, backend, atau QA). Tiap task harus spesifik dan actionable.\n2. Setiap sub-fitur harus ada task (frontend, backend, dan/atau QA/testing). Pastikan tidak ada sub-fitur yang dibiarkan tanpa task.\n3. Tiap task title WAJIB diawali kata kerja (Buat, Integrasikan, Uji, Deploy, Refactor, dll).\n4. Sertakan task untuk: validasi input, error handling, state management, integrasi antar komponen, unit/integration test, accessibility/perf jika relevan.\n5. Beri SETIAP task id unik berurutan: "t1", "t2", "t3", dst.\n6. Dependency (deps): isi dengan id task lain yang harus selesai LEBIH DULU (hanya id dari daftar task ini, mis. ["t1","t3"]). Jangan membuat ketergantungan melingkar. Task yang bisa dikerjakan paralel tanpa prasyarat diberi deps [].\n7. Urutan logis layer: frontend -> backend -> qa. Tandai task yang blocker atau high-risk.\n8. Setiap task wajib field: id, feature, sub_feature, title, layer (frontend/backend/qa), phase, page (null atau path), deps (array id).\n\nFormat: {"tasks":[{"id":"t1","feature":"...","sub_feature":"...","title":"...","layer":"frontend","phase":1,"page":null,"deps":[]},{"id":"t2","feature":"...","sub_feature":"...","title":"...","layer":"backend","phase":1,"page":null,"deps":["t1"]}]}`;

const SYSTEM =
  "Kamu adalah coding assistant. Output HANYA JSON valid di dalam triple backtick dengan kata json. Jangan gunakan reasoning_content, jangan tulis penjelasan, jangan tambah teks di luar JSON. JSON harus valid: double-quoted field names dan string, tanpa trailing comma, tanpa komentar, tanpa single quote. String boleh mengandung newline.";

function extractJson(value: string): any {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidates = fenced ? [fenced[1].trim()] : [];
  let clean = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  clean = clean.replace(/,\s*([}\]])/g, "$1");
  const starts = [clean.indexOf("{"), clean.indexOf("[")].filter((x) => x >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  if (start >= 0 && end >= start) candidates.push(clean.slice(start, end + 1));
  candidates.push(clean);
  for (const raw of candidates) {
    try {
      return JSON.parse(raw);
    } catch { /* coba repair */ }
  }
  throw new Error("JSON tidak bisa diparse");
}

interface ModelResult {
  model: string;
  durationSec: number;
  ttftSec: number;
  valid: boolean;
  taskCount: number;
  layers: Record<string, number>;
  validDeps: boolean;
  chars: number;
  usage?: { in?: number; out?: number };
  error?: string;
}

async function benchModel(model: string): Promise<ModelResult> {
  const start = Date.now();
  let ttft = 0;
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: PROMPT },
        ],
        temperature: 0.2,
        max_tokens: 16384,
        stream: true,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      return { model, durationSec: (Date.now() - start) / 1000, ttftSec: 0, valid: false, taskCount: 0, layers: {}, validDeps: false, chars: 0, error: `HTTP ${res.status} ${text.slice(0, 120)}` };
    }

    // Baca SSE manual (logika sama dengan sse-parser: kumpulkan delta.content,
    // lewati reasoning_content, stop di [DONE]).
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let usage: { in?: number; out?: number } | undefined;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            if (!ttft) ttft = (Date.now() - start) / 1000;
            content += delta.content;
          }
          if (chunk.usage) usage = { in: chunk.usage.prompt_tokens, out: chunk.usage.completion_tokens };
        } catch { /* baris JSON tidak lengkap, skip */ }
      }
    }
    const durationSec = (Date.now() - start) / 1000;
    const json = extractJson(content);
    const tasks: any[] = Array.isArray(json?.tasks) ? json.tasks : [];
    const layers: Record<string, number> = {};
    for (const t of tasks) layers[t.layer] = (layers[t.layer] ?? 0) + 1;
    const ids = new Set(tasks.map((t) => t.id));
    const validDeps = tasks.every((t) => (t.deps ?? []).every((d: string) => ids.has(d)));
    return { model, durationSec, ttftSec: ttft, valid: tasks.length > 0, taskCount: tasks.length, layers, validDeps, chars: content.length, usage };
  } catch (error) {
    return { model, durationSec: (Date.now() - start) / 1000, ttftSec: ttft, valid: false, taskCount: 0, layers: {}, validDeps: false, chars: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  console.log(`Benchmark stage-3 (generate task per fitur) ke ${BASE_URL}`);
  console.log(`Fitur: "${FEATURE_TITLE}" (${SUB_FEATURES.length} sub-fitur, budget 8-12 task)\n`);
  const results: ModelResult[] = [];
  for (const model of MODELS) {
    process.stdout.write(`> ${model} ... `);
    const r = await benchModel(model);
    results.push(r);
    if (r.error) console.log(`GAGAL: ${r.error}`);
    else console.log(`${r.durationSec.toFixed(1)}s (TTFT ${r.ttftSec.toFixed(1)}s), ${r.taskCount} task, valid deps: ${r.validDeps ? "ya" : "TIDAK"}`);
  }
  console.log("\n=== RINGKASAN ===");
  console.log("model | durasi | ttft | task | deps-valid | tokens(in/out)");
  for (const r of results) {
    console.log(`${r.model} | ${r.valid ? r.durationSec.toFixed(1) + "s" : "GAGAL"} | ${r.ttftSec.toFixed(1)}s | ${r.taskCount} | ${r.validDeps ? "ya" : "-"} | ${r.usage ? `${r.usage.in}/${r.usage.out}` : "-"}`);
  }
}

main();
