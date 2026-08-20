import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql0001 = readFileSync(new URL("../drizzle/0001_bent_blacklash.sql", import.meta.url), "utf8");

test("migration 0001 menambah features.priority", () => {
  assert.match(sql0001, /ALTER TABLE "features" ADD COLUMN "priority" text/);
});

test("migration 0001 menambah sub_features.tujuan dan selesai_bila", () => {
  assert.match(sql0001, /ALTER TABLE "sub_features" ADD COLUMN "tujuan" text/);
  assert.match(sql0001, /ALTER TABLE "sub_features" ADD COLUMN "selesai_bila" jsonb DEFAULT '\[\]'::jsonb NOT NULL/);
});

test("migration 0001 mengganti unique global tasks.ref jadi composite (plan_id, ref)", () => {
  assert.match(sql0001, /ALTER TABLE "tasks" DROP CONSTRAINT "tasks_ref_unique"/);
  assert.match(sql0001, /ALTER TABLE "tasks" ADD CONSTRAINT "tasks_plan_ref_unique" UNIQUE\("plan_id","ref"\)/);
});

test("journal drizzle mencatat migration 0001", () => {
  const journal = JSON.parse(readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  const tags = journal.entries.map((e: { tag: string }) => e.tag);
  assert.ok(tags.includes("0001_bent_blacklash"), "0001 terdaftar di journal");
});
