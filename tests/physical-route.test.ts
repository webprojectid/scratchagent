import { test, before } from "node:test";
import { memoryGetOrCreateUser } from "@/lib/memory-store";
import { grantPro } from "@/lib/billing";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { accessPlan, type AuthUser } from "@/lib/api-auth";
import { writeOriginGate } from "@/lib/write-origin";
import { readRequestJson, RequestJsonError } from "@/lib/request-json";
import { physicalEvidenceInput } from "@/lib/physical-evidence";
import { actorFor } from "@/lib/physical-tasks";
import { TaskConflict } from "@/lib/tasks";
import { physicalInput } from "./fixtures/physical-plan";
import type { Plan } from "@/lib/types";

const account = memoryGetOrCreateUser("hardware-owner@example.test");
const owner: AuthUser = { userId: account.id, email: account.email, via: "session" };
before(async () => { delete process.env.DATABASE_URL; assert.equal((await grantPro(owner.userId, "synthetic-admin", 7, "max")).ok, true); });
const plan: Plan = { id: "synthetic-physical-plan", userId: owner.userId, title: "Synthetic hardware", brief: "Offline fixture", stack: [], asumsi: [], features: [], status: "ready", physical: { version: 1, revision: 1, input: physicalInput } };
const source = ts.transpileModule(readFileSync("src/app/api/plans/[planId]/hardware-tasks/[ref]/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function route(user: AuthUser | null, conflict = false) {
  let mutations = 0;
  const mocks: Record<string, unknown> = {
    "next/server": { NextResponse },
    "@/lib/api-auth": { getRequestUser: async () => user, accessPlan: (id: string, auth: AuthUser | null, options: { write?: boolean }) => accessPlan(id, auth, { ...options, loadPlan: async () => plan }) },
    "@/lib/write-origin": { writeOriginGate }, "@/lib/request-json": { readRequestJson, RequestJsonError },
    "@/lib/physical-evidence": { physicalEvidenceInput, changePhysicalEvidence: async (_id: string, _ref: string, _body: unknown, actor: ReturnType<typeof actorFor>) => { mutations++; assert.equal(actor.type, user?.via === "token" ? "agent" : "human"); if (conflict) throw new TaskConflict("Task revision changed."); return { ref: "F01-S01-T01" }; } },
    "@/lib/physical-tasks": { actorFor }, "@/lib/tasks": { TaskConflict },
    "@/lib/security": { getClientIp: async () => "synthetic", clientKey: () => "synthetic", rateLimit: () => null, RATE_LIMITS: { agent: { limit: 100, windowMs: 1000 } } },
  };
  const fixture = { exports: {} as { POST: (request: Request, context: unknown) => Promise<Response> } };
  runInNewContext(source, { module: fixture, exports: fixture.exports, require: (name: string) => { if (!mocks[name]) throw new Error(`Unexpected dependency ${name}`); return mocks[name]; } });
  return { mutations: () => mutations, request: (body: unknown, origin = "https://example.test", headers: Record<string, string> = {}) => fixture.exports.POST(new Request("https://example.test/api/hardware", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }), { params: Promise.resolve({ planId: plan.id, ref: "F01-S01-T01" }) }) };
}

test("hardware evidence rejects anonymous, another owner and scoped read-only tokens before mutation", async () => {
  delete process.env.DATABASE_URL;
  const cases: [AuthUser | null, number][] = [
    [null, 401], [{ ...owner, userId: "synthetic-other", email: "other@example.test" }, 404],
    [{ ...owner, via: "token", tokenPolicy: { access: "read", projectIds: [plan.id] } }, 403],
    [{ ...owner, via: "token", tokenPolicy: { access: "write", projectIds: ["different-plan"] } }, 403],
  ];
  for (const [user, status] of cases) {
    const handler = route(user);
    assert.equal((await handler.request({ action: "review", revision: 1 })).status, status);
    assert.equal(handler.mutations(), 0);
  }
});
test("hardware evidence rejects cross-origin changes, actor spoofing and oversized bodies", async () => {
  const handler = route(owner);
  assert.equal((await handler.request({ action: "review", revision: 1 }, "https://foreign.test")).status, 403);
  assert.equal((await handler.request({ action: "review", revision: 1, actorType: "human" })).status, 400);
  assert.equal((await handler.request({ action: "evidence", revision: 1, report: "x".repeat(70000) })).status, 413);
  assert.equal(handler.mutations(), 0);
});
test("hardware evidence derives the executor on the server and returns revision conflicts", async () => {
  const handler = route(owner);
  assert.equal((await handler.request({ action: "review", revision: 1 })).status, 200);
  const agent = route({ ...owner, via: "token", tokenPolicy: { access: "write", projectIds: [plan.id] } });
  assert.equal((await agent.request({ action: "evidence", revision: 1, report: "Synthetic digital result", outcome: "pass" }, "https://example.test", { Authorization: "Bearer synthetic-test-token" })).status, 200);
  const stale = route(owner, true);
  assert.equal((await stale.request({ action: "review", revision: 1 })).status, 409);
});
