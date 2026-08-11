import { readFileSync } from "node:fs";
import { join } from "node:path";

const envPath = process.argv[2] ? process.argv[2] : join(process.cwd(), ".env");
const envText = readFileSync(envPath, "utf8");
for (const line of envText.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const baseUrl = process.env.LLM_BASE_URL?.replace(/\/$/, "");
const apiKey = process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL;
const timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 180_000;

if (!baseUrl || !apiKey || !model) {
  console.error("LLM_BASE_URL, LLM_API_KEY, dan LLM_MODEL wajib di .env");
  process.exit(1);
}

console.log(`Endpoint: ${baseUrl}/chat/completions`);
console.log(`Model: ${model}`);
console.log(`Timeout: ${timeoutMs}ms`);
console.log("Sending test request...\n");

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);
const start = Date.now();

try {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Balas dengan JSON kecil: {\"ok\": true}." },
        { role: "user", content: "hello" },
      ],
      max_tokens: 256,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  const elapsed = Date.now() - start;
  console.log(`Status: ${res.status} (${elapsed}ms)`);
  const text = await res.text();
  console.log("Body preview:");
  console.log(text.slice(0, 1000));
} catch (err) {
  clearTimeout(timeout);
  console.error(`Failed after ${Date.now() - start}ms: ${err.name}: ${err.message}`);
  process.exit(1);
}
