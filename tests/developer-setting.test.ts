import { test } from "node:test";
import assert from "node:assert/strict";
import { developerAdminEmails, isDeveloperAdmin } from "@/lib/admin-access";
import { requireAdmin } from "@/lib/api-auth";
import { resolveAccountRoute, settingsTabs } from "@/lib/account-navigation";
import { resolveProviderKeys } from "@/lib/llm-provider-input";
import { landingSessions } from "@/lib/landing-demo";
import { defaultAccountSettings } from "@/lib/account-preferences";
import { saveAccountSettings, getAccountSettings, saveLibrary, listLibrary } from "@/lib/account-store";

test("only configured admins with browser sessions can enter Developer Setting", async (context) => {
  const original = process.env.ADMIN_EMAILS;
  context.after(() => { if (original === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = original; });
  process.env.ADMIN_EMAILS = " owner@example.test, OPS@example.test, owner@example.test, invalid ";
  assert.deepEqual(developerAdminEmails(), ["owner@example.test", "ops@example.test"]);
  assert.ok(isDeveloperAdmin(" OWNER@EXAMPLE.TEST "));
  assert.ok(isDeveloperAdmin("ops@example.test"));
  for (const email of ["ownerx@example.test", "admin@example.test", "other@example.test", "", null]) assert.equal(isDeveloperAdmin(email), false);
  assert.equal((await requireAdmin(null))?.status, 401);
  const user = { userId: "test-admin", email: "owner@example.test", via: "session" as const };
  assert.equal(await requireAdmin(user), null);
  assert.equal((await requireAdmin({ ...user, via: "token" }))?.status, 403);
  assert.equal((await requireAdmin({ ...user, via: "legacy-dev" }))?.status, 403);
  assert.equal((await requireAdmin({ ...user, email: "other@example.test" }))?.status, 403);
  delete process.env.ADMIN_EMAILS;
  assert.deepEqual(developerAdminEmails(), []);
  assert.equal((await requireAdmin(user))?.status, 403);
});

test("old LLM links redirect to the protected developer page without preview bypasses", () => {
  assert.equal((settingsTabs as readonly string[]).includes("llm"), false);
  assert.equal(resolveAccountRoute("settings", { tab: "llm", preview: "1" }).redirectTo, "/developer-settings?tab=llm");
});

test("reordering retained provider keys preserves their source and new providers cannot inherit secrets", () => {
  const a = { baseUrl: "https://a.example.test", apiKey: "fixture-a", models: ["a"] };
  const b = { baseUrl: "https://b.example.test", apiKey: "fixture-b", models: ["b"] };
  const existing = { ...a, model: "a", providers: [a, b] };
  const reordered = resolveProviderKeys([{ ...b, apiKey: "", sourceIndex: 1 }, { ...a, apiKey: "", sourceIndex: 0 }, { ...a, baseUrl: "https://new.example.test", apiKey: "", sourceIndex: null }], existing);
  assert.deepEqual(reordered.map(p => p.apiKey), ["fixture-b", "fixture-a", ""]);
  assert.equal(resolveProviderKeys([{ ...a, apiKey: "replacement", sourceIndex: 1 }], existing)[0].apiKey, "replacement");
});

test("every landing demo session has reviewed English content and stable task references", () => {
  const en = landingSessions(), id = landingSessions("id");
  assert.equal(en.length, 7);
  for (let index = 0; index < en.length; index++) {
    assert.notEqual(en[index].title, id[index].title);
    assert.deepEqual(en[index].tasks.map(task => task.ref), id[index].tasks.map(task => task.ref));
    assert.equal(en[index].subFeatures.length, 1);
    assert.equal(en[index].tasks.length, en[index].subFeatures[0].tasks.length);
    const text = JSON.stringify([en[index].title, en[index].description, en[index].selesaiBila, en[index].subFeatures[0].title, en[index].tasks.map(task => task.title)]);
    assert.doesNotMatch(text, /\b(Buat|pencarian|lapangan|pengguna|pembayaran|pengingat|selesai)\b/i);
    assert.ok(en[index].tasks.every(task => typeof task.title === "string" && task.title.length > 15));
  }
});

test("Free, Pro and admin each retain their own editable settings and library", async () => {
  delete process.env.DATABASE_URL;
  for (const tier of ["free", "pro", "admin"]) {
    const owner = "audit-" + tier;
    await saveAccountSettings(owner, { display: { ...defaultAccountSettings.display, language: "id" }, profile: { ...defaultAccountSettings.profile, company: tier } });
    await saveLibrary(owner, { kind: "brief", title: tier, content: "Private " + tier + " planning brief." });
    assert.equal((await getAccountSettings(owner)).profile.company, tier);
    assert.equal((await getAccountSettings(owner)).display.language, "id");
    assert.equal((await listLibrary(owner)).length, 1);
    assert.equal((await listLibrary(owner))[0].title, tier);
  }
  assert.equal((await listLibrary("unrelated-user")).length, 0);
});
