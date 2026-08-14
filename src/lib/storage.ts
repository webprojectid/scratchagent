import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { plans, features, subFeatures, tasks, taskEvents, usageEvents, users } from "@/db/schema";
import type { Plan } from "./types";
import { demoPlan } from "./demo";
import { applyArchFallback } from "./arch-fallback";
import {
  memoryDeletePlan,
  memoryFindTask,
  memoryGetPlan,
  memoryListAllPlans,
  memoryListPlans,
  memorySavePlan,
  memoryUpdatePlanStatus,
  memoryUpdateTask,
} from "./memory-store";

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

/**
 * Pastikan architecture & databaseSchema punya diagram Mermaid.
 * Kalau LLM cuma ngasih narasi tanpa diagram, suntikkan diagram fallback.
 * Dipakai saat plan dibaca, supaya plan lama (yang tersimpan tanpa diagram)
 * tetap menampilkan arsitektur & ERD.
 */
function withDiagrams(plan: Plan): Plan {
  const { architecture, databaseSchema } = applyArchFallback(
    { title: plan.title, stack: plan.stack ?? [], features: plan.features },
    plan.architecture ?? "",
    plan.databaseSchema ?? "",
  );
  return { ...plan, architecture, databaseSchema };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Di DB mode, plans.user_id adalah UUID. UI ngirim email / "shared", jadi harus di-resolve.
async function resolveDbUserId(userId: string): Promise<string | null> {
  if (UUID_RE.test(userId)) return userId;
  const db = getDb();
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, userId));
  return rows[0]?.id ?? null;
}

export async function savePlan(plan: Plan, userId: string): Promise<void> {
  if (isMemoryMode()) return memorySavePlan(plan, userId);
  const dbUserId = await resolveDbUserId(userId);
  const db = getDb();
  await db.insert(plans).values({
    id: plan.id,
    userId: dbUserId,
    title: plan.title,
    brief: plan.brief,
    techPrefs: {
      stack: plan.stack ?? [],
      techStack: plan.techStack ?? [],
      architecture: plan.architecture ?? "",
      databaseSchema: plan.databaseSchema ?? "",
      requirements: plan.requirements ?? { fungsional: [], nonFungsional: [] },
      userFlow: plan.userFlow ?? [],
    },
    assumptions: plan.asumsi ?? [],
    status: plan.status ?? "generating",
    createdAt: plan.createdAt ? new Date(plan.createdAt) : new Date(),
  } as any).onConflictDoNothing();

  for (const feature of (plan.features as any[])) {
    const fid = feature.id || crypto.randomUUID();
    await db.insert(features).values({
      id: fid,
      planId: plan.id,
      slug: feature.slug,
      title: feature.title,
      icon: feature.icon,
      description: feature.description,
      tujuan: feature.tujuan,
      selesaiBila: feature.selesaiBila,
      priority: feature.priority ?? null,
      status: feature.status ?? "direncanakan",
      order: feature.order ?? 0,
    } as any).onConflictDoNothing();

    const existingSubs = await db
      .select({ id: subFeatures.id, title: subFeatures.title })
      .from(subFeatures)
      .where(eq(subFeatures.featureId, fid));
    const titleToSid = new Map<string, string>(existingSubs.map((s) => [s.title, s.id]));

      for (const subFeature of (feature.subFeatures as any[])) {
      const sid = subFeature.id || titleToSid.get(subFeature.title) || crypto.randomUUID();
      titleToSid.set(subFeature.title, sid);
      await db.insert(subFeatures).values({
        id: sid,
        featureId: fid,
        title: subFeature.title,
        tujuan: subFeature.tujuan ?? null,
        selesaiBila: subFeature.selesaiBila ?? [],
        order: 0,
      } as any).onConflictDoNothing();

      for (const task of (subFeature.tasks as any[])) {
        await db.insert(tasks).values({
          planId: plan.id,
          featureId: fid,
          subFeatureId: sid,
          ref: task.ref,
          title: task.title,
          layer: task.layer,
          phase: task.phase,
          page: task.page ?? null,
          deps: task.deps ?? [],
          status: task.status ?? "pending",
          retryCount: task.retryCount ?? 0,
          lastFailReason: task.lastFailReason ?? null,
          failReason: task.failReason ?? null,
          startedAt: task.startedAt ?? null,
          completedAt: task.completedAt ?? null,
          order: task.order ?? 0,
        } as any).onConflictDoNothing();
      }
    }
  }
}

export async function getPlan(planId: string): Promise<Plan | undefined> {
  if (planId === "demo") return { ...demoPlan, userId: "demo" } as Plan;
  if (isMemoryMode()) {
    const p = memoryGetPlan(planId);
    return p ? withDiagrams(p) : undefined;
  }
  const db = getDb();
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan) return undefined;

  const featuresRows = await db.select().from(features).where(eq(features.planId, planId));
  const resultFeatures = await Promise.all(featuresRows.map(async (feature) => {
    const subs = await db.select().from(subFeatures).where(eq(subFeatures.featureId, feature.id));
    const subFeaturesWithTasks = await Promise.all(subs.map(async (sub) => {
      const taskRows = await db.select().from(tasks).where(eq(tasks.subFeatureId, sub.id));
        return {
          id: sub.id,
          title: sub.title,
          tujuan: sub.tujuan ?? "",
          selesaiBila: sub.selesaiBila ?? [],
          tasks: taskRows.map((t) => ({
          ref: t.ref,
          title: t.title,
          layer: t.layer as any,
          phase: t.phase,
          page: t.page ?? null,
          deps: t.deps ?? [],
          status: t.status as any,
          retryCount: t.retryCount,
          lastFailReason: t.lastFailReason ?? null,
          failReason: t.failReason ?? null,
          startedAt: t.startedAt ?? null,
          completedAt: t.completedAt ?? null,
          order: t.order,
        })),
      };
    }));
    return {
      id: feature.id,
      slug: feature.slug,
      title: feature.title,
      icon: feature.icon,
      description: feature.description,
      tujuan: feature.tujuan,
      selesaiBila: feature.selesaiBila,
      priority: (feature.priority as any) ?? "medium",
      status: feature.status as any,
      subFeatures: subFeaturesWithTasks,
    };
  }));

  const savedMeta = plan.techPrefs && !Array.isArray(plan.techPrefs) ? plan.techPrefs as any : {};
  const savedStack = Array.isArray(plan.techPrefs) ? plan.techPrefs as any[] : savedMeta.stack ?? [];

  const built: Plan = {
    id: plan.id,
    title: plan.title,
    brief: plan.brief,
    techStack: savedMeta.techStack ?? (Array.isArray(plan.techPrefs) ? plan.techPrefs : []),
    stack: savedStack.map((t: any) => t.name ?? t),
    asumsi: plan.assumptions ?? [],
    requirements: savedMeta.requirements ?? { fungsional: [], nonFungsional: [] },
    userFlow: savedMeta.userFlow ?? [],
    architecture: savedMeta.architecture ?? "",
    databaseSchema: savedMeta.databaseSchema ?? "",
    features: resultFeatures,
    status: plan.status as any,
    createdAt: plan.createdAt?.toISOString(),
    userId: plan.userId ?? undefined,
  } as Plan;

  return withDiagrams(built);
}

export async function listPlans(userId: string): Promise<Plan[]> {
  if (isMemoryMode()) return memoryListPlans(userId);
  const dbUserId = await resolveDbUserId(userId);
  if (!dbUserId) return [];
  const db = getDb();
  const rows = await db.select().from(plans).where(eq(plans.userId, dbUserId));
  const result = await Promise.all(rows.map((r) => getPlan(r.id).then((p) => p!).catch(() => undefined)));
  return result.filter((p): p is Plan => !!p);
}

export async function listAllPlans(): Promise<Plan[]> {
  if (isMemoryMode()) return memoryListAllPlans();
  const db = getDb();
  const rows = await db.select().from(plans);
  const result = await Promise.all(rows.map((r) => getPlan(r.id).then((p) => p!).catch(() => undefined)));
  return result.filter((p): p is Plan => !!p);
}

export async function deletePlan(planId: string): Promise<boolean> {
  if (isMemoryMode()) return memoryDeletePlan(planId);
  const db = getDb();
  await db.delete(taskEvents).where(eq(taskEvents.planId, planId));
  await db.delete(usageEvents).where(eq(usageEvents.planId, planId));
  await db.delete(tasks).where(eq(tasks.planId, planId));
  const featureIds = await db.select({ id: features.id }).from(features).where(eq(features.planId, planId));
  if (featureIds.length > 0) {
    const fIds = featureIds.map((f) => f.id);
    await db.delete(subFeatures).where(inArray(subFeatures.featureId, fIds));
    await db.delete(features).where(eq(features.planId, planId));
  }
  const deleted = await db.delete(plans).where(eq(plans.id, planId));
  return (deleted as any).rowCount !== 0;
}

export async function updatePlanStatus(planId: string, status: Plan["status"]): Promise<void> {
  if (isMemoryMode()) return memoryUpdatePlanStatus(planId, status);
  const db = getDb();
  await db.update(plans).set({ status } as any).where(eq(plans.id, planId));
}

export async function updateTask(planId: string, ref: string, patch: any): Promise<void> {
  if (isMemoryMode()) return memoryUpdateTask(planId, ref, patch);
  const db = getDb();
  const taskRows = await db.select().from(tasks).where(and(eq(tasks.ref, ref), eq(tasks.planId, planId)));
  const task = taskRows[0];
  if (!task) return;

  const updateData: any = {};
  if (patch.status) updateData.status = patch.status;
  if (patch.startedAt) updateData.startedAt = new Date(patch.startedAt);
  if (patch.completedAt) updateData.completedAt = new Date(patch.completedAt);
  if (patch.lastFailReason !== undefined) updateData.lastFailReason = patch.lastFailReason;
  if (patch.failReason !== undefined) updateData.failReason = patch.failReason;
  if (patch.retryCount !== undefined) updateData.retryCount = patch.retryCount;

  await db.update(tasks).set(updateData).where(eq(tasks.id, task.id));

  await db.insert(taskEvents).values({
    planId,
    taskId: task.id,
    type: patch.status ?? "update",
    meta: patch,
    cliVersion: "cli",
  } as any);
}

// Sinkronkan status tiap fitur berdasarkan task-task-nya:
// semua done -> "selesai"; ada yang done/in_progress/failed -> "berjalan"; selain itu "direncanakan".
export async function syncFeatureStatuses(planId: string): Promise<void> {
  if (isMemoryMode()) return;
  const db = getDb();
  const featureRows = await db.select().from(features).where(eq(features.planId, planId));
  for (const feature of featureRows) {
    const taskRows = await db
      .select({ status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.planId, planId), eq(tasks.featureId, feature.id)));
    let status: "direncanakan" | "berjalan" | "selesai" = "direncanakan";
    if (taskRows.length > 0) {
      if (taskRows.every((t) => t.status === "done")) status = "selesai";
      else if (taskRows.some((t) => t.status === "done" || t.status === "in_progress" || t.status === "failed")) status = "berjalan";
    }
    if (feature.status !== status) {
      await db.update(features).set({ status } as any).where(eq(features.id, feature.id));
    }
  }
}

// Kembalikan semua status fitur di plan ke "direncanakan" (dipakai reset-plan).
export async function resetFeatureStatuses(planId: string): Promise<void> {
  if (isMemoryMode()) return;
  const db = getDb();
  await db.update(features).set({ status: "direncanakan" } as any).where(eq(features.planId, planId));
}

export async function findTask(planId: string, ref: string): Promise<{ task: any; plan: Plan } | undefined> {
  if (isMemoryMode()) return memoryFindTask(planId, ref);
  const plan = await getPlan(planId);
  if (!plan) return undefined;

  for (const feature of plan.features) {
    for (const sub of feature.subFeatures) {
      for (const task of sub.tasks) {
        if (task.ref === ref) return { task, plan };
      }
    }
  }
}

export function allTasks(plan: Plan): any[] {
  return plan.features.flatMap((f) => f.subFeatures.flatMap((s) => s.tasks));
}
