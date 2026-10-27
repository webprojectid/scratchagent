import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { hardwareFoundationSchema, hardwareEngineeringSchema } from "@/lib/physical-domain";
import { physicalFoundation, physicalEngineering, physicalOutline, physicalPhases } from "./fixtures/physical-plan";
import { physicalOutlineSchema, roadmapSchema } from "@/lib/physical-generation";
import type { callLlm } from "@/lib/generate";

test("hardware uses its own contract through JSON, chat and SSE transports and repairs malformed output", async () => {
  const require = createRequire(resolve("src/lib/generate.ts"));
  const cases = [{ stage: "discovery", schema: hardwareFoundationSchema, value: physicalFoundation }, { stage: "architecture", schema: hardwareEngineeringSchema, value: physicalEngineering }, { stage: "outline", schema: physicalOutlineSchema, value: physicalOutline }, { stage: "tasks", schema: roadmapSchema.shape.phases.element, value: physicalPhases[0] }] as const;
  for (const entry of cases) for (const envelope of ["json", "chat", "sse"] as const) {
    let requests = 0;
    const fixtureModule = { exports: {} as { callLlm: typeof callLlm } };
    const output = ts.transpileModule(readFileSync("src/lib/generate.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(output, {
      module: fixtureModule, exports: fixtureModule.exports, process: { env: {} }, console: { log() {}, warn() {}, error() {} },
      Response, Error, AbortController, setTimeout, clearTimeout, Date, Math, crypto: globalThis.crypto,
      require: (name: string) => name !== "./provider-network" ? require(name) : { publicProviderFetch: async (_url: string, init: RequestInit) => {
        requests++;
        const body = JSON.parse(String(init.body));
        assert.match(body.messages[0].content, /systems engineer/);
        assert.match(body.messages[0].content, /properties/);
        assert.doesNotMatch(body.messages[0].content, /layer:"frontend"/);
        assert.equal(body.max_tokens, 8192);
        const data = requests === 1 ? { title: "Malformed synthetic response" } : entry.value;
        const content = JSON.stringify(data);
        if (envelope === "json") return Response.json({ choices: [{ content }] });
        if (envelope === "chat") return Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 5, completion_tokens: 8 } });
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`, { headers: { "content-type": "text/event-stream" } });
      } },
    });
    const result = await fixtureModule.exports.callLlm(entry.schema as z.ZodType<unknown>, "Synthetic hardware transport fixture", undefined, { stage: entry.stage, normalization: "contract", role: "You are a systems engineer.", contract: JSON.stringify(z.toJSONSchema(entry.schema)), maxTokens: 8192, providers: [{ baseUrl: "https://provider.example.test/v1", apiKey: "synthetic", models: ["synthetic-model"] }] });
    assert.deepEqual(result, entry.value);
    assert.equal(requests, 2);
  }
});
