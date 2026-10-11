import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboardDays, filterTokens } from "@/lib/account-dashboard";
import { displaySettingsSchema } from "@/lib/account-preferences";
import { dashboardActivity, recordSiteVisit } from "@/lib/account-store";
test("30-day calendar respects account time zones and separates visits from work events", () => {
  const now = new Date("2026-10-11T04:00:00Z");
  const days = dashboardDays([{ kind: "site_visit", createdAt: "2026-10-10T19:00:00Z" }, { kind: "task_done", createdAt: "2026-10-11T02:00:00Z" }, { kind: "site_visit", createdAt: "2026-10-12T01:00:00Z" }], "Asia/Jakarta", now);
  assert.equal(days.length, 30); assert.equal(days[29].date, "2026-10-11");
  assert.deepEqual(days[29], { date: "2026-10-11", visits: 1, actions: 1 });
  assert.equal(days[0].date, "2026-09-12");
  assert.equal(dashboardDays([], "America/Los_Angeles", now)[29].date, "2026-10-10");
});
test("tokens use revocation dates, retain older active tokens in All time, and separate expiry", () => {
  const now = Date.parse("2026-10-11T04:00:00Z");
  const old = { id: "old", revoked: false, createdAt: "2026-09-01T00:00:00Z" };
  const used = { ...old, id: "used", lastUsedAt: "2026-10-10T00:00:00Z" };
  const revoked = { ...old, id: "revoked", revoked: true, revokedAt: "2026-10-10T00:00:00Z" };
  const expired = { ...old, id: "expired", expiresAt: "2026-10-10T00:00:00Z" };
  const rows = [old, used, revoked, expired];
  assert.deepEqual(filterTokens(rows, "active", true, now).map(row => row.id), ["used"]);
  assert.equal(filterTokens(rows, "active", false, now).length, 2);
  assert.deepEqual(filterTokens(rows, "revoked", true, now).map(row => row.id), ["revoked"]);
  assert.deepEqual(filterTokens(rows, "expired", true, now).map(row => row.id), ["expired"]);
});
test("color preferences remain backward compatible and validate all five choices", () => {
  assert.equal(displaySettingsSchema.parse({}).colorStyle, "scratch");
  for (const colorStyle of ["scratch", "blue", "violet", "amber", "rose"]) assert.equal(displaySettingsSchema.parse({ colorStyle }).colorStyle, colorStyle);
  assert.equal(displaySettingsSchema.safeParse({ colorStyle: "arbitrary" }).success, false);
});
test("site visits deduplicate across tabs and remain private to each owner", async () => {
  await recordSiteVisit("dashboard-owner-a"); await recordSiteVisit("dashboard-owner-a");
  assert.equal((await dashboardActivity("dashboard-owner-a")).length, 1);
  assert.equal((await dashboardActivity("dashboard-owner-b")).length, 0);
});
