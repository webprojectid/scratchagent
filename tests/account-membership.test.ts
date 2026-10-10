import { test } from "node:test";
import assert from "node:assert/strict";
import { accountBadges, effectiveAccountTier } from "@/lib/account-membership";

test("admin role is independent from Free or Pro membership", () => {
  assert.deepEqual(accountBadges({ role: "admin", tier: "free", proActive: false }), ["admin", "free"]);
  assert.deepEqual(accountBadges({ role: "admin", tier: "pro", proActive: true }), ["admin", "pro"]);
  assert.deepEqual(accountBadges({ role: "user", tier: "pro", proActive: true }), ["pro"]);
  assert.deepEqual(accountBadges({ role: "user", tier: "free", proActive: false }), ["free"]);
});

test("inactive Pro loses the premium badge and unknown membership is not presented as Free", () => {
  assert.equal(effectiveAccountTier({ tier: "pro", proActive: false }), "free");
  assert.equal(effectiveAccountTier({ tier: "pro" }), undefined);
  assert.equal(effectiveAccountTier({}), undefined);
  assert.deepEqual(accountBadges({ role: "user" }), ["pending"]);
  assert.deepEqual(accountBadges({ role: "admin" }), ["admin", "pending"]);
});
