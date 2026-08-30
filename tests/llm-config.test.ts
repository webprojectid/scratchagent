import { test } from "node:test";
import assert from "node:assert/strict";
import { isExhaustedError, normalizeProviders, parseModelList } from "@/lib/llm-config";

test("parseModelList memisahkan koma, titik koma, dan baris baru", () => {
  assert.deepEqual(parseModelList("a,b,c"), ["a", "b", "c"]);
  assert.deepEqual(parseModelList("a; b\nc"), ["a", "b", "c"]);
});

test("parseModelList trim, buang kosong, dan dedupe", () => {
  assert.deepEqual(parseModelList(" a , , b ,a\n\n c ;"), ["a", "b", "c"]);
});

test("parseModelList string kosong menghasilkan daftar kosong", () => {
  assert.deepEqual(parseModelList(""), []);
  assert.deepEqual(parseModelList(" , ; \n "), []);
});

test("parseModelList satu model tetap valid", () => {
  assert.deepEqual(parseModelList("deepseek-chat"), ["deepseek-chat"]);
});

test("isExhaustedError mengenali HTTP 429 dan 402", () => {
  assert.equal(isExhaustedError(new Error("LLM gagal: 429 Too Many Requests")), true);
  assert.equal(isExhaustedError(new Error("LLM gagal: 402 Payment Required")), true);
});

test("isExhaustedError mengenali pesan quota/exhausted/rate limit", () => {
  assert.equal(isExhaustedError(new Error("Quota exhausted for this model")), true);
  assert.equal(isExhaustedError(new Error("insufficient balance")), true);
  assert.equal(isExhaustedError(new Error("Rate limit reached")), true);
  assert.equal(isExhaustedError(new Error("model kehabisan token")), true);
});

test("isExhaustedError tidak false-positive pada error umum", () => {
  assert.equal(isExhaustedError(new Error("LLM gagal: 500 Internal Server Error")), false);
  assert.equal(isExhaustedError(new Error("JSON parsing gagal")), false);
  assert.equal(isExhaustedError(new Error("timeout after 180000ms")), false);
});

test("normalizeProviders membuang entry tidak lengkap dan merapikan baseUrl", () => {
  const providers = normalizeProviders([
    { baseUrl: "https://a.example.com/v1/", apiKey: "k1", models: ["m1", "m2"] },
    { baseUrl: "", apiKey: "k2", models: ["m"] },
    { baseUrl: "https://b.example.com/v1", apiKey: "", models: ["m"] },
    { baseUrl: "https://c.example.com/v1", apiKey: "k3", models: [] },
  ]);
  assert.equal(providers.length, 1);
  assert.equal(providers[0].baseUrl, "https://a.example.com/v1");
  assert.deepEqual(providers[0].models, ["m1", "m2"]);
});

test("normalizeProviders menerima models dalam bentuk string dan buang duplikat", () => {
  const providers = normalizeProviders([{ baseUrl: "https://x.com/v1", apiKey: "k", models: "a, b,a" }]);
  assert.deepEqual(providers[0].models, ["a", "b"]);
});

test("normalizeProviders bukan array menghasilkan kosong", () => {
  assert.deepEqual(normalizeProviders(undefined), []);
  assert.deepEqual(normalizeProviders("nope"), []);
});
