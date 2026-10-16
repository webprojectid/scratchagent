import { test } from "node:test";
import assert from "node:assert/strict";
import { readRequestJson, RequestJsonError } from "@/lib/request-json";
import { contentSecurityPolicy } from "@/lib/content-security-policy";
import { unauthorized } from "@/lib/api-auth";

test("JSON body limits count actual UTF-8 bytes even without a declared length", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ brief: "こんにちは" }));
  function request() {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes.slice(0, 12)); controller.enqueue(bytes.slice(12)); controller.close(); } });
    return new Request("https://example.test", { method: "POST", body: stream, duplex: "half" } as RequestInit & { duplex: "half" });
  }
  assert.deepEqual(await readRequestJson(request(), bytes.length), { brief: "こんにちは" });
  await assert.rejects(readRequestJson(request(), bytes.length - 1), (error: unknown) => error instanceof RequestJsonError && error.status === 413);
  await assert.rejects(readRequestJson(new Request("https://example.test", { method: "POST", body: "{}", headers: { "Content-Length": "100" } }), 10), (error: unknown) => error instanceof RequestJsonError && error.code === "PAYLOAD_TOO_LARGE");
});

test("missing identities get a useful English response with a stable machine-readable code", async () => {
  const response = unauthorized();
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Please sign in again or use a valid access token.", code: "AUTH_REQUIRED" });
});

test("production CSP pins connections, blocks plugins, and supports captcha, workers and WASM", () => {
  const policy = contentSecurityPolicy({ supabaseUrl: "https://project.example.test/path?ignored=yes" });
  assert.ok(policy.includes("https://project.example.test wss://project.example.test"));
  assert.ok(policy.includes("worker-src 'self' blob:"));
  assert.ok(policy.includes("'wasm-unsafe-eval'"));
  assert.ok(policy.includes("https://challenges.cloudflare.com"));
  assert.ok(policy.includes("object-src 'none'"));
  assert.ok(policy.includes("base-uri 'self'"));
  assert.ok(policy.includes("frame-ancestors 'self'"));
  assert.ok(policy.includes("https://prod.spline.design"));
  assert.ok(!policy.includes("'unsafe-eval'"));
  assert.ok(!policy.includes("ignored=yes"));
  assert.ok(!policy.split(";").some(directive => /(?:^|\s)(?:https:|wss:)(?:\s|$)/.test(directive)));
  assert.throws(() => contentSecurityPolicy({ supabaseUrl: "http://remote.example.test" }), /HTTPS/);
});

test("development CSP permits localhost realtime and development tooling without weakening production", () => {
  const policy = contentSecurityPolicy({ supabaseUrl: "http://127.0.0.1:54321", development: true });
  assert.ok(policy.includes("http://127.0.0.1:54321 ws://127.0.0.1:54321"));
  assert.ok(policy.includes("'unsafe-eval'"));
  assert.ok(!policy.includes("upgrade-insecure-requests"));
});
