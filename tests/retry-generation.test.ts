import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";

function fixture(options: { deny?: boolean; saveFails?: boolean; noQuota?: boolean; busy?: boolean; accountTier?: "free" | "pro" | "max"; planTier?: "free" | "pro" | "max" } = {}) {
  const calls: string[] = [];
  const legacyIds: (string | null | undefined)[] = [];
  let saved = { checkpoint: { version: 1, entries: { accepted: { value: "preserved" } } }, receipt: { eventId: "old-refunded" }, failure: { paused: true } } as Record<string, unknown>;
  let locked = false;
  const mocks: Record<string, unknown> = {
    "next/server": { NextResponse },
    "@/lib/write-origin": { writeOriginGate: () => null },
    "@/lib/api-auth": { getRequestUser: async (legacyId?: string | null) => { legacyIds.push(legacyId); return { userId: "owner", email: "owner@example.test" }; }, accessPlan: async () => options.deny ? { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } : { plan: { id: "saved-plan", userId: "owner", status: "generating", tier: options.planTier ?? "free", features: [] } } },
    "@/lib/generation-lease": {
      claimGeneration: async () => { if (locked || options.busy) return null; locked = true; return "lease"; },
      releaseGeneration: async () => { locked = false; },
      withGenerationLease: async (_id: string, _stage: string, _token: string, action: () => Promise<unknown>) => action(),
    },
    "@/lib/generation-checkpoint-store": { getGenerationWork: async () => structuredClone(saved), saveGenerationWork: async (_id: string, next: Record<string, unknown>) => { if (options.saveFails) throw new Error("Storage failure"); saved = structuredClone(next); calls.push("save"); } },
    "@/lib/quota": { consumeQuota: async (_id: string, tier: string) => { assert.equal(tier, options.accountTier === "max" ? "pro" : options.accountTier ?? "free"); calls.push("consume"); return options.noQuota ? null : { userId: "owner", eventId: "new-receipt", tier }; }, refundQuota: async () => calls.push("refund") },
    "@/lib/billing": { isAdminEmail: () => false, getAccountState: async () => ({ tier: options.accountTier ?? "free", bannedAt: null }) },
    "@/lib/account-capabilities": { hasProFeatures: (_user: unknown, tier: string) => tier === "pro" || tier === "max" },
  };
  const fixtureModule = { exports: {} as { POST: (request: Request, context: unknown) => Promise<Response> } };
  const output = ts.transpileModule(readFileSync("src/app/api/plans/[planId]/retry-generation/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(output, { URL, module: fixtureModule, exports: fixtureModule.exports, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; } });
  return { calls, legacyIds, saved: () => saved, invoke: (query = "") => fixtureModule.exports.POST(new Request("https://example.test/api" + query, { method: "POST" }), { params: Promise.resolve({ planId: "saved-plan" }) }) };
}

test("resume preserves accepted sections, replaces refunded receipt and cannot charge twice", async () => {
  const run = fixture();
  assert.equal((await run.invoke()).status, 200);
  assert.equal((run.saved().receipt as { eventId: string }).eventId, "new-receipt");
  assert.equal(run.saved().failure, undefined);
  assert.equal((run.saved().checkpoint as { entries: { accepted: { value: string } } }).entries.accepted.value, "preserved");
  assert.equal((await run.invoke()).status, 409);
  assert.deepEqual(run.calls, ["consume", "save"]);
});

test("write denial, active generation and exhausted allowance cannot reset saved work", async () => {
  for (const options of [{ deny: true }, { busy: true }, { noQuota: true }]) {
    const run = fixture(options);
    const before = JSON.stringify(run.saved());
    const response = await run.invoke();
    assert.ok([403, 409, 429].includes(response.status));
    assert.equal(JSON.stringify(run.saved()), before);
    assert.equal(run.calls.includes("save"), false);
    if (!options.noQuota) assert.equal(run.calls.includes("consume"), false);
  }
});

test("failed retry persistence refunds the new reservation while retaining accepted work", async () => {
  const run = fixture({ saveFails: true });
  const before = JSON.stringify(run.saved());
  assert.equal((await run.invoke()).status, 500);
  assert.deepEqual(run.calls, ["consume", "refund"]);
  assert.equal(JSON.stringify(run.saved()), before);
});


test("resume preserves local dev identity context for the shared authentication resolver", async () => {
  const run = fixture();
  assert.equal((await run.invoke("?userId=local-owner")).status, 200);
  assert.deepEqual(run.legacyIds, ["local-owner"]);
});

test("a new retry reservation uses current membership and cannot revive expired paid entitlements", async () => {
  for (const accountTier of ["free", "pro", "max"] as const) for (const planTier of ["free", "pro", "max"] as const) {
    const run = fixture({ accountTier, planTier });
    const allowed = accountTier === "max" || planTier === "free" || accountTier === "pro" && planTier === "pro";
    assert.equal((await run.invoke()).status, allowed ? 200 : 403, `${accountTier} retries ${planTier}`);
    assert.equal(run.calls.includes("consume"), allowed);
  }
});
