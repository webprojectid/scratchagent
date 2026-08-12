import type { Plan, Task } from "./types";

type StoredPlan = Plan & { userId?: string };
type StoredToken = { hash: string; userId: string; label: string; revokedAt: string | null; createdAt: string };
type StoredUser = { id: string; email: string; name: string };

type MemoryStore = {
  planStore: Map<string, StoredPlan>;
  taskEventsStore: { planId: string; taskRef: string; type: string; meta: unknown; createdAt: string }[];
  tokenStore: Map<string, StoredToken>;
  userStore: Map<string, StoredUser>;
};

const globalStore = globalThis as unknown as { __scratchAgentMemoryStore?: MemoryStore };
if (!globalStore.__scratchAgentMemoryStore) {
  globalStore.__scratchAgentMemoryStore = {
    planStore: new Map<string, StoredPlan>(),
    taskEventsStore: [],
    tokenStore: new Map<string, StoredToken>(),
    userStore: new Map<string, StoredUser>(),
  };
}
const { planStore, taskEventsStore, tokenStore, userStore } = globalStore.__scratchAgentMemoryStore;

export function memoryGetOrCreateUser(email: string, name?: string): StoredUser {
  for (const u of userStore.values()) {
    if (u.email === email) return u;
  }
  const id = crypto.randomUUID();
  const user: StoredUser = { id, email, name: name ?? email.split("@")[0] };
  userStore.set(id, user);
  return user;
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

export function memoryFindTaskByRef(ref: string): { task: Task; plan: Plan } | undefined {
  for (const p of planStore.values()) {
    for (const f of p.features) {
      for (const sf of f.subFeatures) {
        for (const t of sf.tasks) {
          if (t.ref === ref) return { task: clone(t), plan: clone(p) };
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
