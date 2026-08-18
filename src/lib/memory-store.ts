import type { Plan, Task } from "./types";

type StoredPlan = Plan & { userId?: string };
type StoredToken = { hash: string; userId: string; label: string; revokedAt: string | null; createdAt: string };
type StoredUser = { id: string; email: string; name: string; tier: "free" | "pro"; bannedAt: string | null; createdAt: string };

type MemoryStore = {
  planStore: Map<string, StoredPlan>;
  taskEventsStore: { planId: string; taskRef: string; type: string; meta: unknown; createdAt: string }[];
  tokenStore: Map<string, StoredToken>;
  userStore: Map<string, StoredUser>;
  subscriptionStore: { id: string; userId: string; startedAt: string; endedAt: string | null; expiresAt: string | null; grantedBy: string | null; endedBy: string | null }[];
  usageStore: { id: string; userId: string; planId: string | null; stage: string; tier: "free" | "pro"; createdAt: string }[];
};

const globalStore = globalThis as unknown as { __scratchAgentMemoryStore?: MemoryStore };
if (!globalStore.__scratchAgentMemoryStore) {
  globalStore.__scratchAgentMemoryStore = {
    planStore: new Map<string, StoredPlan>(),
    taskEventsStore: [],
    tokenStore: new Map<string, StoredToken>(),
    userStore: new Map<string, StoredUser>(),
    subscriptionStore: [],
    usageStore: [],
  };
}
const { planStore, taskEventsStore, tokenStore, userStore, subscriptionStore, usageStore } = globalStore.__scratchAgentMemoryStore;

export function memoryGetOrCreateUser(email: string, name?: string): StoredUser {
  for (const u of userStore.values()) {
    if (u.email === email) return u;
  }
  const id = crypto.randomUUID();
  const user: StoredUser = { id, email, name: name ?? email.split("@")[0], tier: "free", bannedAt: null, createdAt: new Date().toISOString() };
  userStore.set(id, user);
  return user;
}

export function memoryGetUserById(id: string): StoredUser | undefined {
  return userStore.get(id);
}

export function memoryListUsers(): StoredUser[] {
  return Array.from(userStore.values());
}

export function memorySetUserTier(userId: string, tier: "free" | "pro"): StoredUser | undefined {
  const u = userStore.get(userId);
  if (u) u.tier = tier;
  return u;
}

export function memorySetUserBanned(userId: string, bannedAt: string | null): StoredUser | undefined {
  const u = userStore.get(userId);
  if (u) u.bannedAt = bannedAt;
  return u;
}

export function memoryListSubscriptions(userId: string) {
  return subscriptionStore.filter((s) => s.userId === userId);
}

export function memoryAddSubscription(userId: string, grantedBy: string | null, expiresAtIso: string | null = null) {
  const sub = { id: crypto.randomUUID(), userId, startedAt: new Date().toISOString(), endedAt: null, expiresAt: expiresAtIso, grantedBy, endedBy: null };
  subscriptionStore.push(sub);
  return sub;
}

export function memoryEndSubscription(userId: string, endedBy: string | null) {
  const sub = subscriptionStore.find((s) => s.userId === userId && !s.endedAt);
  if (!sub) return null;
  sub.endedAt = new Date().toISOString();
  sub.endedBy = endedBy;
  return sub;
}

/** Tutup langganan yang masa berlakunya habis: endedAt diisi sesuai expiresAt. */
export function memoryExpireSubscription(userId: string, endedBy: string, now: Date = new Date()) {
  const nowMs = now.getTime();
  const sub = subscriptionStore.find(
    (s) => s.userId === userId && !s.endedAt && s.expiresAt && new Date(s.expiresAt).getTime() <= nowMs,
  );
  if (!sub) return null;
  sub.endedAt = sub.expiresAt;
  sub.endedBy = endedBy;
  return sub;
}

export function memoryAddUsage(userId: string, stage: string, tier: "free" | "pro", planId: string | null = null) {
  const ev = { id: crypto.randomUUID(), userId, planId, stage, tier, createdAt: new Date().toISOString() };
  usageStore.push(ev);
  return ev;
}

export function memorySetUsagePlan(eventId: string, planId: string): void {
  const ev = usageStore.find((e) => e.id === eventId);
  if (ev) ev.planId = planId;
}

export function memoryRemoveUsage(eventId: string): void {
  const idx = usageStore.findIndex((e) => e.id === eventId);
  if (idx >= 0) usageStore.splice(idx, 1);
}

export function memoryCountUsageSince(userId: string, stage: string, sinceIso: string): number {
  return usageStore.filter((e) => e.userId === userId && e.stage === stage && e.createdAt >= sinceIso).length;
}

export function memoryCountUsageByTier(userId: string, stage: string, tier: "free" | "pro"): number {
  return usageStore.filter((e) => e.userId === userId && e.stage === stage && e.tier === tier).length;
}

export function memoryCountUsageSinceByTier(userId: string, stage: string, tier: "free" | "pro", sinceIso: string): number {
  return usageStore.filter((e) => e.userId === userId && e.stage === stage && e.tier === tier && e.createdAt >= sinceIso).length;
}

export function memoryCreateToken(userId: string, hash: string, label: string): void {
  tokenStore.set(hash, { hash, userId, label, revokedAt: null, createdAt: new Date().toISOString() });
}

export function memoryFindTokenByHash(hash: string): StoredToken | null {
  const t = tokenStore.get(hash);
  if (!t || t.revokedAt) return null;
  return t;
}

export function memoryListTokens(userId: string): StoredToken[] {
  return Array.from(tokenStore.values()).filter((t) => t.userId === userId && !t.revokedAt);
}

export function memoryRevokeToken(hash: string): boolean {
  const t = tokenStore.get(hash);
  if (!t || t.revokedAt) return false;
  t.revokedAt = new Date().toISOString();
  return true;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function memorySavePlan(plan: Plan, userId: string): void {
  planStore.set(plan.id, { ...clone(plan), userId });
}

export function memoryGetPlan(planId: string): Plan | undefined {
  const p = planStore.get(planId);
  return p ? clone(p) : undefined;
}

export function memoryListPlans(userId: string): Plan[] {
  return Array.from(planStore.values())
    .filter((p) => p.userId === userId)
    .map(clone);
}

export function memoryListAllPlans(): Plan[] {
  return Array.from(planStore.values()).map(clone);
}

export function memoryDeletePlan(planId: string): boolean {
  const existed = planStore.has(planId);
  planStore.delete(planId);
  return existed;
}

export function memoryUpdatePlanStatus(planId: string, status: Plan["status"]): void {
  const p = planStore.get(planId);
  if (p) p.status = status;
}

export function memoryUpdateTask(planId: string, ref: string, patch: Partial<Task> & { status?: Task["status"] }): void {
  const p = planStore.get(planId);
  if (!p) return;
  for (const f of p.features) {
    for (const sf of f.subFeatures) {
      for (const t of sf.tasks) {
        if (t.ref === ref) {
          Object.assign(t, patch);
          taskEventsStore.push({ planId, taskRef: ref, type: patch.status ?? "update", meta: patch, createdAt: new Date().toISOString() });
          return;
        }
      }
    }
  }
}

export function memoryFindTask(planId: string, ref: string): { task: Task; plan: Plan } | undefined {
  const p = memoryGetPlan(planId);
  if (!p) return undefined;
  for (const f of p.features) {
    for (const sf of f.subFeatures) {
      for (const t of sf.tasks) {
        if (t.ref === ref) return { task: clone(t), plan: p };
      }
    }
  }
}

// Hapus satu struktur dari plan (fitur Pro). Kembalikan true bila ketemu & terhapus.
export function memoryRemoveFeature(planId: string, featureSlug: string): boolean {
  const p = planStore.get(planId);
  if (!p) return false;
  const before = p.features.length;
  p.features = p.features.filter((f) => f.slug !== featureSlug);
  return p.features.length < before;
}

export function memoryRemoveSubFeature(planId: string, featureSlug: string, subTitle: string): boolean {
  const p = planStore.get(planId);
  if (!p) return false;
  const f = p.features.find((x) => x.slug === featureSlug);
  if (!f) return false;
  const before = f.subFeatures.length;
  f.subFeatures = f.subFeatures.filter((sf) => sf.title !== subTitle);
  return f.subFeatures.length < before;
}

export function memoryRemoveTask(planId: string, ref: string): boolean {
  const p = planStore.get(planId);
  if (!p) return false;
  for (const f of p.features) {
    for (const sf of f.subFeatures) {
      const before = sf.tasks.length;
      sf.tasks = sf.tasks.filter((t) => t.ref !== ref);
      if (sf.tasks.length < before) return true;
    }
  }
  return false;
}
