import { test, before } from "node:test";
import assert from "node:assert/strict";
import { accessPlan, ownsPlan, planOwnerKey, type AuthUser } from "@/lib/api-auth";
import { memorySavePlan } from "@/lib/memory-store";
import type { Plan } from "@/lib/types";

function makePlan(id: string): Plan {
  return {
    id,
    title: "Plan Uji",
    brief: "brief",
    stack: ["Next.js"],
    asumsi: [],
    status: "ready",
    features: [],
  };
}

const alice: AuthUser = { userId: "uuid-alice", email: "alice@example.com", via: "session" };
const bob: AuthUser = { userId: "uuid-bob", email: "bob@example.com", via: "session" };

before(() => {
  delete process.env.DATABASE_URL; // paksa memory mode
  memorySavePlan(makePlan("plan-alice"), "alice@example.com");
});

test("ownsPlan cocok via email (case-insensitive)", () => {
  assert.equal(ownsPlan({ userId: "alice@example.com" }, alice), true);
  assert.equal(ownsPlan({ userId: "ALICE@example.com" }, alice), true);
});

test("ownsPlan cocok via userId", () => {
  assert.equal(ownsPlan({ userId: "uuid-alice" }, alice), true);
});

test("ownsPlan menolak user lain, owner kosong, dan 'demo'", () => {
  assert.equal(ownsPlan({ userId: "alice@example.com" }, bob), false);
  assert.equal(ownsPlan({ userId: undefined }, alice), false);
  assert.equal(ownsPlan({ userId: "demo" }, alice), false);
});

test("planOwnerKey: memory mode pakai email, DB mode pakai userId", () => {
  // memory mode aktif di test ini
  assert.equal(planOwnerKey(alice), "alice@example.com");
  assert.equal(planOwnerKey({ userId: "u", email: null, via: "token" }), "u");
});

test("accessPlan: owner boleh akses", async () => {
  const { plan, error } = await accessPlan("plan-alice", alice);
  assert.ok(plan, "owner mendapat plan");
  assert.equal(error, undefined);
});

test("accessPlan: configured administrator can access another owner's plan", async (context) => {
  const original = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "access-admin@example.test";
  context.after(() => { if (original === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = original; });
  const admin: AuthUser = { userId: "uuid-admin", email: "access-admin@example.test", via: "session" };
  const { plan, error } = await accessPlan("plan-alice", admin);
  assert.ok(plan, "admin mendapat plan orang lain");
  assert.equal(error, undefined);
});

test("accessPlan: non-owner dapat 404 (bukan 403, biar tidak bocor)", async () => {
  const { plan, error } = await accessPlan("plan-alice", bob);
  assert.equal(plan, undefined);
  assert.equal(error?.status, 404);
});

test("administrator CLI tokens cannot inherit cross-account browser privileges", async (context) => {
  const original = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "access-admin@example.test";
  context.after(() => { if (original === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = original; });
  const adminToken: AuthUser = { userId: "uuid-admin", email: "access-admin@example.test", via: "token" };
  for (const write of [false, true]) {
    const result = await accessPlan("plan-alice", adminToken, { write });
    assert.equal(result.error?.status, 404);
    assert.equal(result.plan, undefined);
  }
  assert.ok((await accessPlan("plan-alice", { ...alice, via: "token" })).plan);
});

test("accessPlan: tanpa identitas dapat 401", async () => {
  const { error } = await accessPlan("plan-alice", null);
  assert.equal(error?.status, 401);
});

test("read-only and project-scoped tokens cannot broaden plan access", async () => {
  const scoped: AuthUser = { ...alice, via: "token", tokenPolicy: { access: "read", projectIds: ["plan-alice"], expiresAt: null, lastUsedAt: null } };
  assert.ok((await accessPlan("plan-alice", scoped)).plan);
  assert.equal((await accessPlan("plan-alice", scoped, { write: true })).error?.status, 403);
  assert.equal((await accessPlan("plan-other", scoped)).error?.status, 403);
  const foreign = { ...bob, tokenPolicy: { ...scoped.tokenPolicy!, access: "write" as const } };
  assert.equal((await accessPlan("plan-alice", foreign)).error?.status, 404);
  assert.equal((await accessPlan("plan-alice", foreign, { write: true })).error?.status, 404);
});

test("accessPlan: plan tidak dikenal dapat 404", async () => {
  const { error } = await accessPlan("plan-tidak-ada", alice);
  assert.equal(error?.status, 404);
});

test("accessPlan: demo publik untuk read, write ditolak 403", async () => {
  const read = await accessPlan("demo", null);
  assert.ok(read.plan, "demo bisa dibaca tanpa login");
  const write = await accessPlan("demo", alice, { write: true });
  assert.equal(write.error?.status, 403);
});
