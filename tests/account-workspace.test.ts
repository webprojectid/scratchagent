import { test, before } from "node:test";
import assert from "node:assert/strict";
import catalog from "@/lib/ui-copy.json";
import { translateUi, apiText, translateActivityTitle } from "@/lib/ui-messages";
import { defaultAccountSettings, defaultHandoff, legacyHandoff, accountSettingsPatchSchema, resolveHandoff } from "@/lib/account-preferences";
import { saveAccountSettings, getAccountSettings, saveLibrary, deleteLibrary, listLibrary, recordAccountActivity, listActivity, readNotifications, saveProjectState, getProjectState, exportAccountData } from "@/lib/account-store";
import { createToken, verifyToken } from "@/lib/tokens";
import { memoryGetOrCreateUser, memorySavePlan } from "@/lib/memory-store";
import { accessPlan, type AuthUser } from "@/lib/api-auth";
import { buildAgentPrompt } from "@/lib/agent-prompt";
import { renderPrdMd, renderFeatureMd, createZip } from "@/lib/zip";
import type { Plan } from "@/lib/types";
import { applyArchFallback, isFullArchitectureTemplate, isFullDatabaseTemplate } from "@/lib/arch-fallback";
before(() => { delete process.env.DATABASE_URL; });
const sample: Plan = { id: "account-language-plan", title: "Catatan asli", brief: "Brief asli pengguna", stack: ["Next.js"], asumsi: [], status: "ready", requirements: { fungsional: ["Keep the original input"], nonFungsional: ["Response within two seconds"] }, features: [{ slug: "notes", title: "Notes", icon: "file", description: "Save notes", tujuan: "Keep user content", selesaiBila: ["Notes persist"], status: "direncanakan", subFeatures: [{ title: "Editor", selesaiBila: ["Keyboard accessible"], tasks: [{ ref: "1.1", title: "Build editor", layer: "frontend", phase: 1, page: null, deps: ["0.1"], status: "pending" }] }] }] };

test("new accounts default to English US while legacy PRDs preserve Indonesian", () => {
  assert.equal(defaultAccountSettings.display.language, "en");
  assert.equal(defaultHandoff.language, "en");
  assert.equal(legacyHandoff.language, "id");
  assert.equal(accountSettingsPatchSchema.safeParse({ display: { language: "fr" } }).success, false);
  assert.equal(accountSettingsPatchSchema.safeParse({ display: { timezone: "Invalid/Timezone" } }).success, false);
});
test("reviewed translations preserve parameters, technical names and user content", () => {
  for (const [original, english, indonesian] of catalog) {
    const parameters = (text: string) => [...text.matchAll(/\{\d+\}/g)].map(match => match[0]).sort();
    assert.deepEqual(parameters(original), parameters(english), original);
    if (indonesian) assert.deepEqual(parameters(english), parameters(indonesian), original);
  }
  assert.equal(translateUi("{0} dari {1} tugas", "en", 2, 5), "2 of 5 tasks");
  assert.equal(translateUi("Language", "id"), "Bahasa");
  assert.equal(translateUi("My PostgreSQL project", "id"), "My PostgreSQL project");
  assert.equal(apiText("Password tidak cocok."), "The password does not match.");
  assert.equal(translateActivityTitle("Agent mulai mengerjakan task: F01/S01/T01", "en"), "Started task F01/S01/T01");
  assert.equal(translateActivityTitle("Agent mulai mengerjakan task: F01/S01/T01", "id"), "Agent mulai mengerjakan task: F01/S01/T01");
});
test("concurrent preference categories and projects cannot overwrite each other", async () => {
  await Promise.all([saveAccountSettings("preferences-owner", { profile: { ...defaultAccountSettings.profile, company: "Own team" } }), saveAccountSettings("preferences-owner", { display: { ...defaultAccountSettings.display, language: "id" } })]);
  const saved = await getAccountSettings("preferences-owner");
  assert.equal(saved.profile.company, "Own team");
  assert.equal(saved.display.language, "id");
  assert.equal((await getAccountSettings("preferences-other")).profile.company, "");
  await Promise.all([saveProjectState("metadata-project", { favorite: true }), saveProjectState("metadata-project", { archived: true })]);
  assert.equal((await getProjectState("metadata-project")).favorite, true);
  assert.equal((await getProjectState("metadata-project")).archived, true);
});
test("library entries cannot be read, edited or removed by another owner", async () => {
  const item = await saveLibrary("library-owner", { kind: "brief", title: "Private", content: "Private brief" });
  assert.ok(item);
  assert.equal((await listLibrary("library-other")).length, 0);
  assert.equal(await saveLibrary("library-other", { ...item!, title: "Overwrite" }), null);
  assert.equal(await deleteLibrary("library-other", item!.id), false);
  assert.equal((await listLibrary("library-owner"))[0].title, "Private");
});
test("notification preferences keep activity history and duplicate events are suppressed", async () => {
  await saveAccountSettings("activity-owner", { notifications: { ...defaultAccountSettings.notifications, generationComplete: false } });
  await recordAccountActivity("activity-owner", "generation_complete", "Ready", null, "account-test-dedupe");
  await recordAccountActivity("activity-owner", "generation_complete", "Ready", null, "account-test-dedupe");
  await recordAccountActivity("activity-owner", "agent_blocked", "Blocked");
  const events = await listActivity("activity-owner");
  assert.equal(events.length, 2);
  assert.equal(events.find(event => event.kind === "generation_complete")?.notification, false);
  assert.equal(events.find(event => event.kind === "agent_blocked")?.notification, true);
  assert.equal((await listActivity("activity-other")).length, 0);
  await readNotifications("activity-owner");
  assert.ok((await listActivity("activity-owner")).find(event => event.kind === "agent_blocked")?.readAt);
});
test("expired tokens are rejected and active token policies survive verification", async () => {
  const expired = await createToken("token-owner", "Expired", { access: "write", projectIds: [], expiresAt: new Date(Date.now() - 1000).toISOString(), lastUsedAt: null });
  assert.equal(await verifyToken(expired.token), null);
  const scoped = await createToken("token-owner", "Read only", { access: "read", projectIds: [sample.id], expiresAt: new Date(Date.now() + 60_000).toISOString(), lastUsedAt: null });
  assert.equal((await verifyToken(scoped.token))?.policy.access, "read");
});
test("read-only and project-scoped tokens enforce permissions before plan access", async () => {
  memorySavePlan(sample, "scoped@example.test");
  const user: AuthUser = { userId: "scoped-user", email: "scoped@example.test", via: "token", tokenPolicy: { access: "read", projectIds: [sample.id], expiresAt: null, lastUsedAt: null } };
  assert.ok((await accessPlan(sample.id, user)).plan);
  assert.equal((await accessPlan(sample.id, user, { write: true })).error?.status, 403);
  assert.equal((await accessPlan("another-project", user)).error?.status, 403);
});
test("handoff exports preserve requirements, acceptance criteria, dependencies and input", () => {
  const plan = { ...sample, generationSettings: defaultHandoff };
  const md = renderPrdMd(plan);
  for (const value of ["Functional requirements", "Nonfunctional requirements", "Notes persist", "Keyboard accessible", "0.1", sample.brief]) assert.ok(md.includes(value), value);
  assert.ok(!md.includes("### Fase"));
  assert.ok(renderFeatureMd(sample.features[0], "en").includes("Acceptance criteria"));
  const zip = new TextDecoder().decode(createZip(plan));
  assert.ok(zip.includes("AGENT-HANDOFF.md"));
  assert.ok(zip.includes("generation-settings.json"));
  assert.ok(zip.includes(sample.brief));
});
test("project overrides preserve account defaults and agent commands respect supported choices", () => {
  const settings = resolveHandoff(defaultHandoff, { language: "id", agent: "claude" });
  assert.equal(defaultHandoff.language, "en");
  const prompt = buildAgentPrompt(sample.id, "test-token", "https://example.test", settings);
  assert.ok(prompt.includes("--agent claude"));
  assert.ok(prompt.includes("Kerjakan plan"));
  assert.ok(prompt.includes("checkpoint=true"));
  assert.ok(buildAgentPrompt(sample.id, "test-token", "https://example.test", defaultHandoff).includes("Implement this ScratchAgent plan"));
});
test("account exports include owned data and omit raw access tokens", async () => {
  const owner = memoryGetOrCreateUser("export-account@example.test");
  const credential = await createToken(owner.id, "Private token");
  await saveLibrary(owner.id, { kind: "reference", title: "Own reference", content: "Own content" });
  const data = await exportAccountData(owner.id, owner.email);
  assert.equal(data.identity?.email, owner.email);
  assert.equal(data.library.length, 1);
  assert.equal(JSON.stringify(data).includes(credential.token), false);
});
test("English fallback drafts remain English and clearly identify unconfirmed decisions", () => {
  const result = applyArchFallback(sample, "", "", { injectDiagrams: true, language: "en" });
  assert.ok(result.architecture.includes("generic fallback"));
  assert.ok(result.databaseSchema.includes("Confirm entities"));
  assert.ok(!result.architecture.includes("Ringkasan Arsitektur"));
  assert.ok(isFullArchitectureTemplate(result.architecture));
  assert.ok(isFullDatabaseTemplate(result.databaseSchema));
});
