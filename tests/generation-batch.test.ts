import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";

test("task invocations run one batch and a later invocation resumes only missing phases", async () => {
  const plan = { id: "fixture", userId: "owner", status: "generating", features: Array.from({ length: 15 }, () => ({ subFeatures: [{ tasks: [] as unknown[] }] })) };
  const requests: number[] = [];
  let background: (() => Promise<void>) | undefined;
  let releases = 0;
  const mocks: Record<string, unknown> = {
    "@/lib/write-origin": { writeOriginGate: () => null },
    "@/lib/generation-lease": { claimGeneration: async () => "lease", ownsGeneration: async () => true, releaseGeneration: async () => { releases++; } },
    "@/lib/generated-plan": { finalizeGeneratedPlan: async () => { plan.status = "ready"; } },
    "next/server": { NextResponse, after: (work: typeof background) => { background = work; } },
    "@/lib/api-auth": { getRequestUser: async () => ({ userId: "owner" }), accessPlan: async () => ({ plan: structuredClone(plan) }) },
    "@/lib/storage": { getPlan: async () => structuredClone(plan) },
  };
  const fixtureModule = { exports: {} as { POST: (request: Request, context: unknown) => Promise<Response> } };
  const source = ts.transpileModule(readFileSync("src/app/api/plans/[planId]/generate-all/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => { if (!(name in mocks)) throw new Error(name); return mocks[name]; }, URL, AbortSignal, console, fetch: async (_url: string, init: RequestInit) => {
    assert.equal((init.headers as Record<string, string>).Authorization, "Bearer fixture");
    const index = JSON.parse(String(init.body)).featureIndex;
    requests.push(index); plan.features[index].subFeatures[0].tasks.push({ ref: `T${index}` });
    return Response.json({ ok: true });
  } });
  const invoke = async () => {
    await fixtureModule.exports.POST(new Request("https://example.test/api/plans/fixture/generate-all", { method: "POST", headers: { Authorization: "Bearer fixture" } }), { params: Promise.resolve({ planId: "fixture" }) });
    assert.ok(background); await background();
  };
  await invoke(); assert.deepEqual(requests, [0, 1, 2, 3, 4, 5, 6, 7]);
  await invoke(); assert.deepEqual(requests, Array.from({ length: 15 }, (_, index) => index));
  await invoke(); assert.equal(plan.status, "ready");
  assert.equal(releases, 3);
});
