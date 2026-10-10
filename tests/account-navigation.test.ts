import { test } from "node:test";
import assert from "node:assert/strict";
import { accountMenuLinks, accountTabHref, profileTabs, resolveAccountRoute, settingsTabs } from "@/lib/account-navigation";

test("profile and settings categories are disjoint and their tabs keep the correct route", () => {
  assert.equal(profileTabs.some(tab => (settingsTabs as readonly string[]).includes(tab)), false);
  for (const tab of profileTabs) assert.ok(accountTabHref(tab).startsWith("/profile"));
  for (const tab of settingsTabs) assert.ok(accountTabHref(tab).startsWith("/settings"));
  assert.deepEqual(accountMenuLinks.map(link => [link.label, link.href]), [["Profil", "/profile"], ["Pengaturan", "/settings"], ["Dokumentasi", "/docs"]]);
});

test("legacy tabs redirect to the owning page and preserve preview identity and other query values", () => {
  const result = resolveAccountRoute("profile", { tab: "security", preview: "1", previewAccount: "admin-pro", filter: ["a", "b"] });
  const url = new URL(result.redirectTo!, "http://localhost");
  assert.equal(url.pathname, "/settings");
  assert.equal(url.searchParams.get("tab"), "security");
  assert.equal(url.searchParams.get("previewAccount"), "admin-pro");
  assert.equal(url.searchParams.get("preview"), "1");
  assert.deepEqual(url.searchParams.getAll("filter"), ["a", "b"]);
  assert.equal(resolveAccountRoute("settings", { tab: "plans" }).redirectTo, "/profile?tab=plans");
  assert.equal(resolveAccountRoute("profile", { tab: "preferences" }).redirectTo, "/settings");
});

test("page defaults and invalid query values cannot render the other page's categories", () => {
  assert.deepEqual(resolveAccountRoute("profile", {}), { tab: "profile", redirectTo: null });
  assert.deepEqual(resolveAccountRoute("settings", {}), { tab: "preferences", redirectTo: null });
  assert.deepEqual(resolveAccountRoute("settings", { tab: "https://evil.test" }), { tab: "preferences", redirectTo: null });
  assert.deepEqual(resolveAccountRoute("profile", { tab: ["billing", "security"] }), { tab: "billing", redirectTo: null });
});

test("default tabs drop obsolete tab values when navigating between page sections", () => {
  assert.equal(accountTabHref("profile", "?tab=billing&preview=1"), "/profile?preview=1");
  assert.equal(accountTabHref("preferences", "?tab=tokens&preview=1"), "/settings?preview=1");
  assert.equal(accountTabHref("tokens", "?tab=billing"), "/settings?tab=tokens");
});
