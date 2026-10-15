import { and, desc, eq, inArray, isNull, ne, sql, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { accountSettings, accountLibrary, accountActivity, accountSessions, projectState, tokenPolicy } from "@/db/account-schema";
import { users, plans, tokens, usageEvents } from "@/db/schema";
import { defaultAccountSettings, profileSettingsSchema, displaySettingsSchema, handoffSettingsSchema, notificationSettingsSchema, type AccountSettings, type HandoffSettings } from "./account-preferences";
import { memoryListPlans, memoryListUsage, memoryGetUserById } from "./memory-store";

export type LibraryItem = { id: string; kind: string; title: string; content: string; createdAt: string; updatedAt: string };
export type ActivityItem = { id: string; kind: string; title: string; planId: string | null; notification: boolean; readAt: string | null; createdAt: string };
export type ProjectAccountState = { favorite: boolean; archived: boolean; lastOpenedAt: string | null; generationSettings: HandoffSettings | null; generationInput: typeof projectState.$inferSelect.generationInput };
export type TokenPolicy = { expiresAt: string | null; lastUsedAt: string | null; access: "read" | "write"; projectIds: string[] };
const globalAccount = globalThis as unknown as { scratchAccount?: { settings: Map<string, AccountSettings>; library: Map<string, LibraryItem & { userId: string }>; activity: Map<string, ActivityItem & { userId: string; dedupeKey?: string }>; projects: Map<string, ProjectAccountState>; policy: Map<string, TokenPolicy> } };
const memory = globalAccount.scratchAccount ??= { settings: new Map(), library: new Map(), activity: new Map(), projects: new Map(), policy: new Map() };
const memoryMode = () => !process.env.DATABASE_URL;
const blankProject: ProjectAccountState = { favorite: false, archived: false, lastOpenedAt: null, generationSettings: null, generationInput: null };
export async function getAccountSettings(userId: string): Promise<AccountSettings> {
  if (memoryMode()) return structuredClone(memory.settings.get(userId) ?? defaultAccountSettings);
  const [row] = await getDb().select().from(accountSettings).where(eq(accountSettings.userId, userId));
  return { profile: profileSettingsSchema.parse(row?.profile ?? {}), display: displaySettingsSchema.parse(row?.display ?? {}), handoff: handoffSettingsSchema.parse(row?.handoff ?? {}), notifications: notificationSettingsSchema.parse(row?.notifications ?? {}) };
}
export async function saveAccountSettings(userId: string, patch: Partial<AccountSettings>) {
  if (memoryMode()) { memory.settings.set(userId, { ...structuredClone(memory.settings.get(userId) ?? defaultAccountSettings), ...structuredClone(patch) }); return getAccountSettings(userId); }
  // Only supplied categories are updated, so concurrent saves on different tabs do not overwrite each other.
  await getDb().insert(accountSettings).values({ userId, ...defaultAccountSettings, ...patch }).onConflictDoUpdate({ target: accountSettings.userId, set: { ...patch, updatedAt: new Date() } });
  return getAccountSettings(userId);
}
export async function getProjectState(planId: string): Promise<ProjectAccountState> {
  if (memoryMode() || planId === "demo") return structuredClone(memory.projects.get(planId) ?? blankProject);
  const [row] = await getDb().select().from(projectState).where(eq(projectState.planId, planId));
  return row ? { favorite: row.favorite, archived: row.archived, lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null, generationSettings: row.generationSettings, generationInput: row.generationInput } : { ...blankProject };
}
export async function getProjectGenerationSettings(planId: string): Promise<HandoffSettings | null> {
  if (memoryMode() || planId === "demo") return structuredClone(memory.projects.get(planId)?.generationSettings ?? null);
  const [row] = await getDb().select({ generationSettings: projectState.generationSettings }).from(projectState).where(eq(projectState.planId, planId));
  return row?.generationSettings ?? null;
}
export async function saveProjectState(planId: string, patch: Partial<ProjectAccountState>) {
  if (memoryMode()) { memory.projects.set(planId, { ...structuredClone(memory.projects.get(planId) ?? blankProject), ...structuredClone(patch) }); return; }
  const { lastOpenedAt, ...rest } = patch;
  const values = { ...rest, ...(lastOpenedAt !== undefined ? { lastOpenedAt: lastOpenedAt ? new Date(lastOpenedAt) : null } : {}) };
  await getDb().insert(projectState).values({ planId, ...values }).onConflictDoUpdate({ target: projectState.planId, set: values });
}
export async function projectStates(planIds: string[], summaryOnly = false) {
  if (!planIds.length) return {};
  if (memoryMode()) return Object.fromEntries(planIds.map(id => [id, memory.projects.get(id) ?? blankProject]));
  const db = getDb();
  const rows = summaryOnly
    ? await db.select({ planId: projectState.planId, favorite: projectState.favorite, archived: projectState.archived, lastOpenedAt: projectState.lastOpenedAt }).from(projectState).where(inArray(projectState.planId, planIds))
    : await db.select().from(projectState).where(inArray(projectState.planId, planIds));
  return Object.fromEntries(rows.map(row => [row.planId, { ...row, lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null }]));
}
export async function listLibrary(userId: string): Promise<LibraryItem[]> {
  if (memoryMode()) return Array.from(memory.library.values()).filter(item => item.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const rows = await getDb().select().from(accountLibrary).where(eq(accountLibrary.userId, userId)).orderBy(desc(accountLibrary.updatedAt)).limit(200);
  return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}
export async function saveLibrary(userId: string, item: { id?: string; kind: string; title: string; content: string }): Promise<LibraryItem | null> {
  if (memoryMode()) {
    const existing = item.id ? memory.library.get(item.id) : null;
    if (item.id && existing?.userId !== userId) return null;
    const now = new Date().toISOString(); const row = { ...item, id: item.id ?? crypto.randomUUID(), userId, createdAt: existing?.createdAt ?? now, updatedAt: now };
    memory.library.set(row.id, row); return row;
  }
  const db = getDb();
  const [row] = item.id ? await db.update(accountLibrary).set({ kind: item.kind, title: item.title, content: item.content, updatedAt: new Date() }).where(and(eq(accountLibrary.id, item.id), eq(accountLibrary.userId, userId))).returning() : await db.insert(accountLibrary).values({ userId, kind: item.kind, title: item.title, content: item.content }).returning();
  return row ? { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } : null;
}
export async function deleteLibrary(userId: string, id: string) {
  if (memoryMode()) return memory.library.get(id)?.userId === userId && memory.library.delete(id);
  return (await getDb().delete(accountLibrary).where(and(eq(accountLibrary.id, id), eq(accountLibrary.userId, userId))).returning()).length > 0;
}
const notificationKey: Record<string, keyof AccountSettings["notifications"]> = { generation_complete: "generationComplete", generation_failed: "generationFailed", agent_blocked: "agentBlocked", checkpoint: "checkpoint", plan_expiry: "planExpiry" };
export async function recordAccountActivity(userId: string, kind: string, title: string, planId: string | null = null, dedupeKey?: string) {
  try { await persistAccountActivity(userId, kind, title, planId, dedupeKey); }
  catch (error) { console.error("[account-activity]", error instanceof Error ? error.name : "Storage error"); }
}
async function persistAccountActivity(userId: string, kind: string, title: string, planId: string | null, dedupeKey?: string) {
  if (!userId) return;
  const key = notificationKey[kind];
  const notification = key ? (await getAccountSettings(userId)).notifications[key] : false;
  if (memoryMode()) {
    if (dedupeKey && Array.from(memory.activity.values()).some(row => row.dedupeKey === dedupeKey)) return;
    const id = crypto.randomUUID(); memory.activity.set(id, { id, userId, kind, title, planId, notification, readAt: null, createdAt: new Date().toISOString(), dedupeKey }); return;
  }
  await getDb().insert(accountActivity).values({ userId, kind, title, planId, notification, dedupeKey }).onConflictDoNothing();
}
export async function listActivity(userId: string): Promise<ActivityItem[]> {
  if (memoryMode()) return Array.from(memory.activity.values()).filter(item => item.userId === userId && item.kind !== "site_visit").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  const rows = await getDb().select().from(accountActivity).where(and(eq(accountActivity.userId, userId), ne(accountActivity.kind, "site_visit"))).orderBy(desc(accountActivity.createdAt)).limit(100);
  return rows.map(row => ({ ...row, readAt: row.readAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }));
}
export async function dashboardActivity(userId: string, timezone = "UTC") {
  const since = new Date(Date.now() - 367 * 86400_000);
  if (memoryMode()) return Array.from(memory.activity.values()).filter(row => row.userId === userId && Date.parse(row.createdAt) >= since.getTime()).map(row => ({ kind: row.kind, createdAt: row.createdAt }));
  const localDate = sql<string>`to_char(${accountActivity.createdAt} AT TIME ZONE ${timezone}, 'YYYY-MM-DD')`;
  // Position 2 reuses the selected local date without binding the timezone twice.
  const rows = await getDb().select({ kind: accountActivity.kind, date: localDate, count: sql<number>`count(*)::int` }).from(accountActivity).where(and(eq(accountActivity.userId, userId), gte(accountActivity.createdAt, since))).groupBy(accountActivity.kind, sql`2`);
  return rows.map(row => ({ kind: row.kind, date: row.date, count: row.count }));
}
export async function recordSiteVisit(userId: string) {
  const bucket = Math.floor(Date.now() / 1800_000);
  await persistAccountActivity(userId, "site_visit", "ScratchAgent visit", null, `visit:${userId}:${bucket}`);
}
export async function readNotifications(userId: string) {
  if (memoryMode()) { for (const row of memory.activity.values()) if (row.userId === userId && row.notification) row.readAt = new Date().toISOString(); return; }
  await getDb().update(accountActivity).set({ readAt: new Date() }).where(and(eq(accountActivity.userId, userId), isNull(accountActivity.readAt)));
}
export async function accountUsage(userId: string) {
  if (memoryMode()) return memoryListUsage(userId).slice(-100).reverse();
  return getDb().select({ id: usageEvents.id, planId: usageEvents.planId, stage: usageEvents.stage, tier: usageEvents.tier, tokensIn: usageEvents.tokensIn, tokensOut: usageEvents.tokensOut, model: usageEvents.model, createdAt: usageEvents.createdAt }).from(usageEvents).where(and(eq(usageEvents.userId, userId), ne(usageEvents.stage, "generation-attempt"))).orderBy(desc(usageEvents.createdAt)).limit(100);
}
export async function getTokenPolicy(hash: string): Promise<TokenPolicy> {
  if (memoryMode()) return memory.policy.get(hash) ?? { expiresAt: null, lastUsedAt: null, access: "write", projectIds: [] };
  const [row] = await getDb().select().from(tokenPolicy).where(eq(tokenPolicy.tokenHash, hash));
  return { expiresAt: row?.expiresAt?.toISOString() ?? null, lastUsedAt: row?.lastUsedAt?.toISOString() ?? null, access: row?.access === "read" ? "read" : "write", projectIds: row?.projectIds ?? [] };
}
export async function saveTokenPolicy(hash: string, policy: TokenPolicy) {
  if (memoryMode()) { memory.policy.set(hash, policy); return; }
  const values = { ...policy, expiresAt: policy.expiresAt ? new Date(policy.expiresAt) : null, lastUsedAt: policy.lastUsedAt ? new Date(policy.lastUsedAt) : null };
  await getDb().insert(tokenPolicy).values({ tokenHash: hash, ...values }).onConflictDoUpdate({ target: tokenPolicy.tokenHash, set: values });
}
export async function touchToken(hash: string) {
  if (memoryMode()) { const policy = await getTokenPolicy(hash); memory.policy.set(hash, { ...policy, lastUsedAt: new Date().toISOString() }); return; }
  await getDb().insert(tokenPolicy).values({ tokenHash: hash, lastUsedAt: new Date() }).onConflictDoUpdate({ target: tokenPolicy.tokenHash, set: { lastUsedAt: new Date() }, setWhere: sql`${tokenPolicy.lastUsedAt} IS NULL OR ${tokenPolicy.lastUsedAt} < now() - interval '1 minute'` });
}
export async function trackSession(id: string, userId: string, device: string, issuedAt?: number) {
  if (memoryMode()) return true;
  const db = getDb();
  const [settings] = await db.select({ cutoff: accountSettings.sessionsRevokedBefore, retained: accountSettings.retainedSessionId }).from(accountSettings).where(eq(accountSettings.userId, userId));
  if (settings?.cutoff && settings.retained !== id && (!issuedAt || issuedAt * 1000 <= settings.cutoff.getTime())) return false;
  const [row] = await db.select().from(accountSessions).where(eq(accountSessions.id, id));
  if (row?.revokedAt || row && row.userId !== userId) return false;
  await db.insert(accountSessions).values({ id, userId, device }).onConflictDoUpdate({ target: accountSessions.id, set: { lastSeenAt: new Date() }, setWhere: and(isNull(accountSessions.revokedAt), sql`${accountSessions.lastSeenAt} < now() - interval '1 minute'`) });
  const [current] = await db.select({ revoked: accountSessions.revokedAt }).from(accountSessions).where(eq(accountSessions.id, id));
  return !current?.revoked;
}
export async function listSessions(userId: string) {
  if (memoryMode()) return [];
  return getDb().select().from(accountSessions).where(eq(accountSessions.userId, userId)).orderBy(desc(accountSessions.lastSeenAt)).limit(50);
}
export async function revokeOtherSessions(userId: string, currentId: string) {
  if (memoryMode()) return;
  await getDb().transaction(async tx => {
    const revokedAt = new Date();
    await tx.insert(accountSettings).values({ userId, ...defaultAccountSettings, sessionsRevokedBefore: revokedAt, retainedSessionId: currentId }).onConflictDoUpdate({ target: accountSettings.userId, set: { sessionsRevokedBefore: revokedAt, retainedSessionId: currentId } });
    await tx.update(accountSessions).set({ revokedAt }).where(and(eq(accountSessions.userId, userId), ne(accountSessions.id, currentId), isNull(accountSessions.revokedAt)));
  });
}
export async function exportAccountData(userId: string, ownerKey: string) {
  const identity = memoryMode() ? memoryGetUserById(userId) : (await getDb().select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt }).from(users).where(eq(users.id, userId)))[0];
  const [settings, library, activity, usage, sessions] = await Promise.all([getAccountSettings(userId), listLibrary(userId), listActivity(userId), accountUsage(userId), listSessions(userId)]);
  const userPlans = memoryMode() ? memoryListPlans(ownerKey) : await getDb().select().from(plans).where(eq(plans.userId, userId));
  const [{ listPlans }, { listTokens }] = await Promise.all([import("./storage"), import("./tokens")]);
  const fullPlans = memoryMode() ? userPlans : await listPlans(userId);
  const ids = fullPlans.map(row => row.id);
  const tokenRows = await listTokens(userId);
  return { exportedAt: new Date().toISOString(), version: 1, identity, settings, library, activity, usage, sessions, plans: fullPlans, projectSettings: await projectStates(ids), tokens: await Promise.all(tokenRows.map(async row => ({ label: row.label, createdAt: row.createdAt, revokedAt: row.revokedAt, policy: await getTokenPolicy("hash" in row ? row.hash : row.tokenHash) }))) };
}
export async function deleteApplicationData(userId: string) {
  if (memoryMode()) throw new Error("Account deletion requires configured authentication and database.");
  await getDb().transaction(async tx => { await tx.delete(tokens).where(eq(tokens.userId, userId)); await tx.delete(users).where(eq(users.id, userId)); });
}
