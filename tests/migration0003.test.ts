import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql0003 = readFileSync(new URL("../drizzle/0003_pro_accounts.sql", import.meta.url), "utf8");

test("migration 0003 menambah users.tier dan users.banned_at", () => {
  assert.match(sql0003, /ALTER TABLE "users" ADD COLUMN "tier" text DEFAULT 'free' NOT NULL/);
  assert.match(sql0003, /ALTER TABLE "users" ADD COLUMN "banned_at" timestamp with time zone/);
});

test("migration 0003 menambah usage_events.tier", () => {
  assert.match(sql0003, /ALTER TABLE "usage_events" ADD COLUMN "tier" text DEFAULT 'free' NOT NULL/);
});

test("migration 0003 membuat tabel subscriptions", () => {
  assert.match(sql0003, /CREATE TABLE "subscriptions"/);
  assert.match(sql0003, /"started_at" timestamp with time zone DEFAULT now\(\) NOT NULL/);
  assert.match(sql0003, /"ended_at" timestamp with time zone/);
  assert.match(sql0003, /FOREIGN KEY \("user_id"\) REFERENCES "public"\."users"/);
});

test("journal drizzle mencatat migration 0003", () => {
  const journal = JSON.parse(readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  const tags = journal.entries.map((e: { tag: string }) => e.tag);
  assert.ok(tags.includes("0003_pro_accounts"), "0003 terdaftar di journal");
});
