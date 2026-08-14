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

test("accessPlan: non-owner dapat 404 (bukan 403, biar tidak bocor)", async () => {
  const { plan, error } = await accessPlan("plan-alice", bob);
  assert.equal(plan, undefined);
  assert.equal(error?.status, 404);
});

test("accessPlan: tanpa identitas dapat 401", async () => {
  const { error } = await accessPlan("plan-alice", null);
  assert.equal(error?.status, 401);
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
