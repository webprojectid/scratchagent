import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { plans, features, subFeatures, tasks, taskEvents, usageEvents, users } from "@/db/schema";
import type { Plan } from "./types";
import { demoPlan } from "./demo";
import {
  buildFallbackArchitecture,
  buildFallbackDatabaseSchema,
  containsTemplateArchitectureDiagram,
  containsTemplateErDiagram,
  isFullArchitectureTemplate,
  isFullDatabaseTemplate,
  normalizeMermaidFences,
  stripTemplateDiagrams,
} from "./arch-fallback";
import {
  memoryDeletePlan,
  memoryFindTask,
  memoryGetPlan,
  memoryListAllPlans,
  memoryListPlans,
  memoryRemoveFeature,
  memoryRemoveSubFeature,
  memoryRemoveTask,
  memorySavePlan,
  memoryUpdatePlanStatus,
  memoryUpdateTask,
} from "./memory-store";

function isMemoryMode() {
  return !process.env.DATABASE_URL;
}

/**
 * Siapkan arsitektur & databaseSchema sebelum ditampilkan:
 * 1. Normalisasi fence tanpa label yang isinya mermaid (biar ke-render).
 * 2. STRIP blok diagram template yang tersuntik ke narasi unik LLM
 *    (biang "semua project kelihatan template"); narasi asli dipertahankan.
 * 3. Isi dengan template HANYA kalau konten benar-benar kosong.
 * Kalau ada bagian yang murni template generik, catat di plan.warnings
 * supaya UI bisa menampilkan banner jujur.
 */
function withDiagrams(plan: Plan): Plan {
  let arch = normalizeMermaidFences(plan.architecture ?? "");
  let db = normalizeMermaidFences(plan.databaseSchema ?? "");

  const fullArchTemplate = isFullArchitectureTemplate(arch);
  const fullDbTemplate = isFullDatabaseTemplate(db);

  // Narasi unik + diagram template suntikan -> buang diagram palsunya.
  if (!fullArchTemplate && containsTemplateArchitectureDiagram(arch)) {
    arch = stripTemplateDiagrams(arch, "architecture");
  }
  if (!fullDbTemplate && containsTemplateErDiagram(db)) {
    db = stripTemplateDiagrams(db, "database");
  }

  // Konten kosong total -> template fallback biar PRD tidak blank.
  if (!arch.trim()) {
    arch = buildFallbackArchitecture(plan.title, plan.stack ?? [], plan.features.map((f) => f.title));
  }
  if (!db.trim()) {
    db = buildFallbackDatabaseSchema(plan.features.map((f) => f.title));
  }

  const result = { ...plan, architecture: arch, databaseSchema: db };

  // Bagian yang murni template generik dicatat sebagai warning (tanpa duplikat)
  // supaya UI bisa menampilkan banner jujur.
  const templateWarnings: string[] = [];
  if (fullArchTemplate) templateWarnings.push("Arsitektur memakai template generik karena LLM gagal");
  if (fullDbTemplate) templateWarnings.push("Database schema memakai template generik karena LLM gagal");
  if (templateWarnings.length) {
    const existing = plan.warnings ?? [];
    const extra = templateWarnings.filter((w) => !existing.includes(w));
    if (extra.length) result.warnings = [...existing, ...extra];
  }
  return result;
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
      warnings: plan.warnings ?? [],
      tier: plan.tier ?? "free",
      ideas: plan.ideas ?? [],
    },
    assumptions: plan.asumsi ?? [],
    status: plan.status ?? "generating",
    createdAt: plan.createdAt ? new Date(plan.createdAt) : new Date(),
  } as any)
    // onConflict update tech_prefs: metadata dinamis (ideas, tier, warnings)
    // hidup di tech_prefs dan HARUS ikut ter-update saat plan disimpan ulang
    // (contoh: submit ide dari kolom chat "Ide Kamu").
    .onConflictDoUpdate({ target: plans.id, set: { techPrefs: { stack: plan.stack ?? [], techStack: plan.techStack ?? [], architecture: plan.architecture ?? "", databaseSchema: plan.databaseSchema ?? "", requirements: plan.requirements ?? { fungsional: [], nonFungsional: [] }, userFlow: plan.userFlow ?? [], warnings: plan.warnings ?? [], tier: plan.tier ?? "free", ideas: plan.ideas ?? [] } } });

  // BATCH INSERT: fitur, sub-fitur, dan task dikumpulkan lalu ditulis masing-
  // masing SATU statement. Dulu tiap baris INSERT sendiri-sendiri — plan 90
  // task berarti 120+ perjalanan bolak-balik ke pooler Supabase, makan waktu
  // dan menggempur koneksi (max 5). Sekarang ~3-6 query total.
  const featureRows: (typeof features.$inferInsert)[] = [];
  const subRows: (typeof subFeatures.$inferInsert)[] = [];
  const taskRows: (typeof tasks.$inferInsert)[] = [];
  const fidByIndex = new Map<number, string>();

  for (const [index, feature] of (plan.features as any[]).entries()) {
    const fid = feature.id || crypto.randomUUID();
    fidByIndex.set(index, fid);
    const slug = feature.slug || feature.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `fase-${fid.slice(0, 8)}`;
    featureRows.push({
      id: fid,
      planId: plan.id,
      slug,
      title: feature.title,
      icon: feature.icon || "📦",
      description: feature.description || feature.tujuan || feature.title || "",
      tujuan: feature.tujuan || feature.description || feature.title || "",
      selesaiBila: Array.isArray(feature.selesaiBila) ? feature.selesaiBila : [],
      priority: feature.priority ?? null,
      status: feature.status ?? "direncanakan",
      order: feature.order ?? 0,
    } as any);
  }
  if (featureRows.length > 0) {
    await db.insert(features).values(featureRows).onConflictDoNothing();
  }

  // Satu query untuk SEMUA sub-fitur existing dari seluruh fitur plan ini
  // (dulu satu query per fitur), dipakai buat dedupe sub-fitur berdasar judul.
  const existingSubs = featureRows.length > 0
    ? await db
        .select({ id: subFeatures.id, title: subFeatures.title, featureId: subFeatures.featureId })
        .from(subFeatures)
        .where(inArray(subFeatures.featureId, Array.from(fidByIndex.values())))
    : [];
  const titleToSid = new Map<string, string>(existingSubs.map((s) => [`${s.featureId}::${s.title}`, s.id]));

  for (const [index, feature] of (plan.features as any[]).entries()) {
    const fid = fidByIndex.get(index)!;
    for (const subFeature of (feature.subFeatures as any[])) {
      const sid = subFeature.id || titleToSid.get(`${fid}::${subFeature.title}`) || crypto.randomUUID();
      titleToSid.set(`${fid}::${subFeature.title}`, sid);
      subRows.push({
        id: sid,
        featureId: fid,
        title: subFeature.title,
        tujuan: subFeature.tujuan ?? null,
        selesaiBila: subFeature.selesaiBila ?? [],
        order: 0,
      } as any);

      const subTasks = Array.isArray(subFeature.tasks)
        ? subFeature.tasks
        : (Array.isArray(feature.tasks) ? feature.tasks.filter((t: any) => (t.sub_feature || t.subFeature || "").toLowerCase().trim() === subFeature.title.toLowerCase().trim()) : []);

      for (const task of subTasks) {
        taskRows.push({
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
        } as any);
      }
    }

    // Fallback: jika task ada di feature.tasks tapi belum tersimpan via subFeatures
    if (Array.isArray(feature.tasks) && feature.tasks.length > 0) {
      const firstSid = existingSubs.find((s) => s.featureId === fid)?.id ?? subRows.find((r) => r.featureId === fid)?.id ?? null;
      for (const task of feature.tasks) {
        taskRows.push({
          planId: plan.id,
          featureId: fid,
          subFeatureId: firstSid,
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
        } as any);
      }
    }
  }

  if (subRows.length > 0) {
    await db.insert(subFeatures).values(subRows).onConflictDoNothing();
  }
  if (taskRows.length > 0) {
    await db.insert(tasks).values(taskRows).onConflictDoNothing();
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
      order: feature.order,
      subFeatures: subFeaturesWithTasks,
    };
  }));

  // Urutan fase: (1) kolom order; plan lama punya order=0 semua, jadi
  // tiebreak (2) phase terkecil dari task di dalamnya (= posisi asli fitur
  // saat generate); tiebreak (3) urutan insert dari DB. Fase baru dari
  // kolom chat ide dapat order = posisi akhir, sehingga selalu tampil akhir.
  resultFeatures
    .map((f, i) => ({ f, i }))
    .sort((a, b) => {
      const orderA = a.f.order ?? 0;
      const orderB = b.f.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      const phaseOf = (x: { f: typeof a.f }) => {
        const phases = x.f.subFeatures.flatMap((sf) => sf.tasks.map((t) => t.phase)).filter((p) => Number.isFinite(p));
        return phases.length ? Math.min(...phases) : Number.POSITIVE_INFINITY;
      };
      const pa = phaseOf(a);
      const pb = phaseOf(b);
      if (pa !== pb) return pa - pb;
      return a.i - b.i;
    })
    .forEach((entry, idx) => { resultFeatures[idx] = entry.f; });

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
    warnings: Array.isArray(savedMeta.warnings) ? savedMeta.warnings : undefined,
    tier: savedMeta.tier === "pro" ? "pro" : "free",
    ideas: Array.isArray(savedMeta.ideas) ? savedMeta.ideas : undefined,
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

/** Ringkasan plan untuk halaman daftar: tanpa hydrate penuh, tanpa diagram. */
export type PlanSummary = {
  id: string;
  title: string;
  status: string;
  createdAt: string | undefined;
  userId: string | null;
  stack: string[];
  featureCount: number;
  taskCount: number;
  tasksDone: number;
  tasksActive: number;
  tasksFailed: number;
};

function summaryFromPlan(p: Plan): PlanSummary {
  const allTasks = (p.features ?? []).flatMap((f) => (f.subFeatures ?? []).flatMap((sf) => sf.tasks ?? []));
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    createdAt: p.createdAt,
    userId: p.userId ?? null,
    stack: (p.stack ?? []).slice(0, 3),
    featureCount: (p.features ?? []).length,
    taskCount: allTasks.length,
    tasksDone: allTasks.filter((t) => t.status === "done").length,
    tasksActive: allTasks.filter((t) => t.status === "in_progress").length,
    tasksFailed: allTasks.filter((t) => t.status === "failed").length,
  };
}

/**
 * Ringkasan semua plan milik user, dioptimalkan untuk halaman profile:
 * hanya 3 query tetap (plans, hitung task, hitung feature) berapa pun
 * jumlah plan-nya. Jalur lama memanggil getPlan() per plan sehingga
 * setiap plan menambah beberapa round trip ke database.
 */
export async function listPlanSummaries(userId: string): Promise<PlanSummary[]> {
  if (isMemoryMode()) return memoryListPlans(userId).map(summaryFromPlan);
  const dbUserId = await resolveDbUserId(userId);
  if (!dbUserId) return [];
  const db = getDb();
  const rows = await db
    .select({ id: plans.id, title: plans.title, status: plans.status, createdAt: plans.createdAt, techPrefs: plans.techPrefs })
    .from(plans)
    .where(eq(plans.userId, dbUserId))
    .orderBy(sql`${plans.createdAt} desc`);
  if (rows.length === 0) return [];

  const planIds = rows.map((r) => r.id);
  const taskAgg = await db
    .select({ planId: tasks.planId, status: tasks.status, n: sql<number>`count(*)::int` })
    .from(tasks)
    .where(inArray(tasks.planId, planIds))
    .groupBy(tasks.planId, tasks.status);
  const featureAgg = await db
    .select({ planId: features.planId, n: sql<number>`count(*)::int` })
    .from(features)
    .where(inArray(features.planId, planIds))
    .groupBy(features.planId);

  const taskByPlan = new Map<string, { total: number; done: number; active: number; failed: number }>();
  for (const t of taskAgg) {
    const acc = taskByPlan.get(t.planId) ?? { total: 0, done: 0, active: 0, failed: 0 };
    acc.total += Number(t.n);
    if (t.status === "done") acc.done += Number(t.n);
    if (t.status === "in_progress") acc.active += Number(t.n);
    if (t.status === "failed") acc.failed += Number(t.n);
    taskByPlan.set(t.planId, acc);
  }
  const featureByPlan = new Map<string, number>();
  for (const f of featureAgg) featureByPlan.set(f.planId, Number(f.n));

  return rows.map((r) => {
    const meta = r.techPrefs && !Array.isArray(r.techPrefs) ? (r.techPrefs as Record<string, unknown>) : {};
    const rawStack = Array.isArray(r.techPrefs) ? (r.techPrefs as unknown[]) : (meta.stack as unknown[] | undefined) ?? [];
    const stack = rawStack.map((t: unknown) => ((t as { name?: string })?.name ?? String(t))).slice(0, 3);
    const agg = taskByPlan.get(r.id) ?? { total: 0, done: 0, active: 0, failed: 0 };
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt?.toISOString(),
      userId: dbUserId,
      stack,
      featureCount: featureByPlan.get(r.id) ?? 0,
      taskCount: agg.total,
      tasksDone: agg.done,
      tasksActive: agg.active,
      tasksFailed: agg.failed,
    };
  });
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

// ============================================================
// Edit struktur: hapus fase / sub-fitur / task (fitur Pro).
// FK database memakai onDelete: cascade, jadi baris anak ikut
// terhapus otomatis. Ref yang dihapus juga dibersihkan dari
// deps task lain supaya plan tidak macet permanen di scheduler.
// ============================================================

async function stripDeps(db: any, planId: string, removedRefs: string[]) {
  if (removedRefs.length === 0) return;
  const rows = await db
    .select({ id: tasks.id, deps: tasks.deps })
    .from(tasks)
    .where(eq(tasks.planId, planId));
  for (const row of rows) {
    const deps = Array.isArray(row.deps) ? row.deps : [];
    const next = deps.filter((d: string) => !removedRefs.includes(d));
    if (next.length !== deps.length) {
      await db.update(tasks).set({ deps: next } as any).where(eq(tasks.id, row.id));
    }
  }
}

/** Hapus satu fase (feature) beserta sub-fitur dan task-nya. */
export async function removeFeature(planId: string, featureSlug: string): Promise<boolean> {
  if (isMemoryMode()) return memoryRemoveFeature(planId, featureSlug);
  const db = getDb();
  const featureRows = await db.select({ id: features.id }).from(features).where(and(eq(features.planId, planId), eq(features.slug, featureSlug)));
  if (featureRows.length === 0) return false;
  const featureIds = featureRows.map((f) => f.id);
  // Kumpulkan ref task milik feature ini dulu untuk pembersihan deps.
  const taskRows = await db.select({ ref: tasks.ref }).from(tasks).where(and(eq(tasks.planId, planId), inArray(tasks.featureId, featureIds)));
  // taskEvents ikut lewat cascade tasks.id; hapus feature (subFeatures & tasks cascade).
  await db.delete(features).where(inArray(features.id, featureIds));
  await stripDeps(db, planId, taskRows.map((t) => t.ref));
  await syncFeatureStatuses(planId);
  return true;
}

/** Hapus satu sub-fitur beserta task-nya. */
export async function removeSubFeature(planId: string, featureSlug: string, subTitle: string): Promise<boolean> {
  if (isMemoryMode()) return memoryRemoveSubFeature(planId, featureSlug, subTitle);
  const db = getDb();
  const featureRows = await db.select({ id: features.id }).from(features).where(and(eq(features.planId, planId), eq(features.slug, featureSlug)));
  if (featureRows.length === 0) return false;
  const sfRows = await db
    .select({ id: subFeatures.id })
    .from(subFeatures)
    .where(and(eq(subFeatures.featureId, featureRows[0].id), eq(subFeatures.title, subTitle)));
  if (sfRows.length === 0) return false;
  const sfIds = sfRows.map((s) => s.id);
  const taskRows = await db.select({ ref: tasks.ref }).from(tasks).where(and(eq(tasks.planId, planId), inArray(tasks.subFeatureId, sfIds)));
  await db.delete(subFeatures).where(inArray(subFeatures.id, sfIds));
  await stripDeps(db, planId, taskRows.map((t) => t.ref));
  await syncFeatureStatuses(planId);
  return true;
}

/** Hapus satu task berdasarkan ref. */
export async function removeTask(planId: string, ref: string): Promise<boolean> {
  if (isMemoryMode()) return memoryRemoveTask(planId, ref);
  const db = getDb();
  const taskRows = await db.select({ id: tasks.id, featureId: tasks.featureId }).from(tasks).where(and(eq(tasks.planId, planId), eq(tasks.ref, ref)));
  if (taskRows.length === 0) return false;
  await db.delete(tasks).where(eq(tasks.id, taskRows[0].id));
  await stripDeps(db, planId, [ref]);
  await syncFeatureStatuses(planId);
  return true;
}

/** Ganti judul plan (dipakai alur asinkron: kerangka -> judul catchy hasil LLM). */
export async function updatePlanTitle(planId: string, title: string): Promise<void> {
  if (isMemoryMode()) {
    const p = memoryGetPlan(planId);
    if (p) p.title = title;
    return;
  }
  const db = getDb();
  await db.update(plans).set({ title } as any).where(eq(plans.id, planId));
}
