import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProviderUrl } from "@/lib/provider-network";

test("provider validation rejects private, metadata, userinfo and malformed targets", async () => {
  for (const target of ["http://127.0.0.1/v1", "https://[::1]/v1", "https://169.254.169.254/v1", "https://metadata.google.internal/v1", "https://user:password@example.com/v1", "file:///etc/passwd", "not a URL", "https://2130706433/v1", "https://[::ffff:127.0.0.1]/v1"]) assert.equal((await validateProviderUrl(target)).ok, false, target);
});
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { BlockList, isIP } from "node:net";

function pinnedFixture(rebind: boolean) {
  let resolutions = 0, requests = 0, closed = 0;
  const fixtureModule = { exports: {} as { publicProviderFetch: (raw: string, init: RequestInit) => Promise<Response> } };
  class Agent {
    connect: { lookup: (host: string, options: { all: boolean }, callback: (error: Error | null, records: { address: string }[]) => void) => void };
    constructor(options: { connect: Agent["connect"] }) { this.connect = options.connect; }
    async close() { closed++; }
    async destroy() { closed++; }
  }
  const mocks: Record<string, unknown> = { "./ui-messages": { apiText: (text: string) => text }, "node:net": { BlockList, isIP }, "node:dns/promises": { lookup: async () => [{ address: ++resolutions === 2 && rebind ? "127.0.0.1" : "93.184.216.34", family: 4 }] }, "undici": { Agent } };
  const output = ts.transpileModule(readFileSync("src/lib/provider-network.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => mocks[name], URL, Response, ReadableStream, process: { env: { NODE_ENV: "production" } }, fetch: async (_url: URL, init: RequestInit & { dispatcher: Agent }) => {
    requests++; assert.equal(init.redirect, "error");
    init.dispatcher.connect.lookup("provider.example", { all: true }, (error, records) => { assert.equal(error, null); assert.equal(records[0].address, "93.184.216.34"); });
    return new Response("data: first\n\ndata: second\n\n", { headers: { "Content-Type": "text/event-stream" } });
  } });
  return { fetch: fixtureModule.exports.publicProviderFetch, stats: () => ({ resolutions, requests, closed }) };
}
test("DNS rebinding is blocked before credentials can reach the second resolved address", async () => {
  const fixture = pinnedFixture(true);
  await assert.rejects(fixture.fetch("https://provider.example/v1/chat/completions", {}), /private address/);
  assert.equal(fixture.stats().requests, 0);
});
test("validated addresses are pinned and streaming content remains intact", async () => {
  const fixture = pinnedFixture(false);
  const response = await fixture.fetch("https://provider.example/v1/chat/completions", { redirect: "follow" });
  assert.equal(await response.text(), "data: first\n\ndata: second\n\n");
  assert.deepEqual(fixture.stats(), { resolutions: 2, requests: 1, closed: 1 });
});
