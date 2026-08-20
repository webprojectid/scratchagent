/**
 * Simulasi ringan konfig LLM (dijalankan manual, bukan bagian dari npm test).
 *
 * 1. Baca config asli via resolveLlmConfig() (prioritas DB, fallback env).
 * 2. Parse daftar model failover.
 * 3. Demo logika: pesan error mana yang memicu pindah model vs retry.
 * 4. Probe live tiap model: POST /chat/completions mini (max_tokens kecil),
 *    lalu klasifikasi hasilnya pakai isExhaustedError() yang sama dengan
 *    production — jadi kelihatan persis model mana yang akan di-failover.
 *
 * Jalankan: npx tsx --tsconfig tsconfig.json tests/simulate-llm-config.ts
 */
import { resolveLlmConfig, isExhaustedError } from "@/lib/llm-config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// .env di-load Next otomatis saat dev, tapi script standalone harus load sendiri.
// Tidak menimpa variabel yang sudah ada di process.env.
const here = dirname(fileURLToPath(import.meta.url));
try {
  const envText = readFileSync(join(here, "..", ".env"), "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch {
  /* tanpa .env pun masih bisa jalan dari env shell */
}

function maskKey(key: string): string {
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)} (${key.length} char)`;
}

interface ProbeResult {
  model: string;
  ms: number;
  status: number | null;
  verdict: string;
  failover: boolean;
}

async function probe(baseUrl: string, apiKey: string, model: string): Promise<ProbeResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Jawab dengan satu kata saja: ok" }],
        max_tokens: 8,
      }),
      signal: controller.signal,
    });
    const ms = Date.now() - start;
    const text = await res.text();
    if (res.ok) {
      let snippet = "";
      try {
        const j = JSON.parse(text);
        snippet = String(j.choices?.[0]?.message?.content ?? "").slice(0, 60);
      } catch {
        snippet = "(body bukan JSON)";
      }
      return { model, ms, status: res.status, verdict: `OK — balasan: "${snippet}"`, failover: false };
    }
    // Bentuk error disamakan dengan production (generate.ts) supaya
    // klasifikasi isExhaustedError identik dengan perilaku asli.
    const prodShape = new Error(`LLM gagal: ${res.status} ${text.slice(0, 200)}`);
    const exhausted = isExhaustedError(prodShape);
    return {
      model,
      ms,
      status: res.status,
      verdict: exhausted
        ? `EXHAUSTED (${res.status}) ${text.slice(0, 100)} → failover ke model berikutnya`
        : `GAGAL (${res.status}) ${text.slice(0, 140)}`,
      failover: exhausted,
    };
  } catch (e) {
    const ms = Date.now() - start;
    const aborted = e instanceof Error && e.name === "AbortError";
    return { model, ms, status: null, verdict: aborted ? "TIMEOUT (>20 detik)" : `ERROR: ${e instanceof Error ? e.message : String(e)}`, failover: false };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log("=== SIMULASI KONFIG LLM ===\n");

  const cfg = await resolveLlmConfig();
  console.log(`Sumber config : ${cfg.baseUrl ? "terbaca" : "KOSONG"}`);
  console.log(`Base URL      : ${cfg.baseUrl ?? "(belum diisi)"}`);
  console.log(`API key       : ${cfg.apiKey ? maskKey(cfg.apiKey) : "(belum diisi)"}`);
  console.log(`Model (raw)   : ${JSON.stringify(cfg.model ?? "")}`);
  console.log(`Model (parse) : ${cfg.models.length} model -> [${cfg.models.join(", ")}]`);

  if (!cfg.baseUrl || !cfg.apiKey || cfg.models.length === 0) {
    console.log("\nGAGAL: konfigurasi belum lengkap. Isi lewat /settings (admin) atau .env");
    process.exit(1);
  }

  console.log("\n--- Demo logika failover (bentuk error production) ---");
  const samples: Array<[string, string]> = [
    ["LLM gagal: 429 {\"error\":\"Too Many Requests\"}", "quota habis / rate limit"],
    ["LLM gagal: 402 {\"error\":\"Insufficient balance\"}", "saldo habis"],
    ["LLM gagal: 402 Your quota has been exhausted", "pesan quota eksplisit"],
    ["LLM gagal: 500 Internal Server Error", "error server sementara"],
    ["fetch failed", "koneksi putus"],
  ];
  for (const [msg, label] of samples) {
    const failover = isExhaustedError(new Error(msg));
    console.log(`  ${failover ? "PINDAH MODEL" : "RETRY 3x    "} | ${label} -> "${msg.slice(0, 55)}"`);
  }

  console.log("\n--- Probe live (berurutan, supaya tidak membanjiri router) ---");
  const results: ProbeResult[] = [];
  for (const model of cfg.models) {
    process.stdout.write(`  ${model} ... `);
    const r = await probe(cfg.baseUrl, cfg.apiKey, model);
    results.push(r);
    console.log(`${r.ms}ms -> ${r.verdict}`);
  }

  const ok = results.filter((r) => r.status !== null && r.status >= 200 && r.status < 300);
  const exhausted = results.filter((r) => r.failover);
  const failed = results.filter((r) => !r.failover && !(r.status !== null && r.status >= 200 && r.status < 300));

  console.log("\n--- Kesimpulan ---");
  console.log(`  Model sehat      : ${ok.length ? ok.map((r) => r.model).join(", ") : "TIDAK ADA"}`);
  console.log(`  Exhausted (skip) : ${exhausted.length ? exhausted.map((r) => r.model).join(", ") : "-"}`);
  console.log(`  Error lain       : ${failed.length ? failed.map((r) => r.model).join(", ") : "-"}`);
  if (ok.length === results.length) {
    console.log("\n  ✅ Semua model aktif. Failover akan bekerja kalau salah satu mulai 429/402.");
  } else if (ok.length > 0) {
    console.log(`\n  ⚠️  Sebagian model bermasalah. Sistem akan mulai dari model sehat pertama (${ok[0].model}) dan mengabaikan yang exhausted.`);
  } else {
    console.log("\n  ❌ Tidak ada model yang bisa dipakai. Cek API key / daftar model di /settings.");
  }
}

main().then(() => process.exit(0), (e) => {
  console.error("Simulasi error:", e);
  process.exit(1);
});
