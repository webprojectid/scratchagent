import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { plans, features, subFeatures, tasks, taskEvents } from "@/db/schema";
import type { Plan } from "./types";
import { demoPlan } from "./demo";
import {
  memoryFindTask,
  memoryFindTaskByRef,
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

export async function savePlan(plan: Plan, userId: string): Promise<void> {
  if (isMemoryMode()) return memorySavePlan(plan, userId);
  const db = getDb();
  await db.insert(plans).values({
    id: plan.id,
    userId,
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
      status: feature.status ?? "direncanakan",
      order: feature.order ?? 0,
    } as any).onConflictDoNothing();

    for (const subFeature of (feature.subFeatures as any[])) {
      const sid = subFeature.id || crypto.randomUUID();
      await db.insert(subFeatures).values({
        id: sid,
        featureId: fid,
        title: subFeature.title,
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
  if (isMemoryMode()) return memoryGetPlan(planId);
  const db = getDb();
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan) return undefined;

  const featuresRows = await db.select().from(features).where(eq(features.planId, planId));
  const resultFeatures = await Promise.all(featuresRows.map(async (feature) => {
    const subs = await db.select().from(subFeatures).where(eq(subFeatures.featureId, feature.id));
    const subFeaturesWithTasks = await Promise.all(subs.map(async (sub) => {
      const taskRows = await db.select().from(tasks).where(eq(tasks.subFeatureId, sub.id));
      return {
        title: sub.title,
        tujuan: "",
        selesaiBila: [],
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
      slug: feature.slug,
      title: feature.title,
      icon: feature.icon,
      description: feature.description,
      tujuan: feature.tujuan,
      selesaiBila: feature.selesaiBila,
      priority: "medium" as const,
      status: feature.status as any,
      subFeatures: subFeaturesWithTasks,
    };
  }));

  const savedMeta = plan.techPrefs && !Array.isArray(plan.techPrefs) ? plan.techPrefs as any : {};
  const savedStack = Array.isArray(plan.techPrefs) ? plan.techPrefs as any[] : savedMeta.stack ?? [];

  return {
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
}

export async function listPlans(userId: string): Promise<Plan[]> {
  if (isMemoryMode()) return memoryListPlans(userId);
  const db = getDb();
  const rows = await db.select().from(plans).where(eq(plans.userId, userId));
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

export async function findTaskByRef(ref: string): Promise<{ task: any; plan: Plan } | undefined> {
  if (isMemoryMode()) return memoryFindTaskByRef(ref);
  const db = getDb();
  const taskRows = await db.select().from(tasks).where(eq(tasks.ref, ref));
  const task = taskRows[0];
  if (!task) return undefined;

  const plan = await getPlan(task.planId);
  if (!plan) return undefined;

  return { task, plan };
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
