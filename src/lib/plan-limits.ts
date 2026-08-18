/**
 * Batas struktur PRD per tier. Dipaksakan dua lapis:
 * 1. Prompt LLM diberi rentang eksplisit (bimbingan utama).
 * 2. Enforce keras di kode: trim fitur/sub-fitur/task ke maksimum,
 *    budget task per fitur dihitung floor supaya total + task QA
 *    tidak pernah melebihi batas atas.
 *
 * Free: fase 4-8, sub-fitur 3-5 per fitur, total 14-20 task.
 * Pro : fase 10-15, sub-fitur 8-12 per fitur, total 15-25 task.
 */

export type Tier = "free" | "pro";

export interface StructureLimits {
  /** Jumlah fase (= jumlah fitur, tiap fitur jadi satu fase). */
  features: [min: number, max: number];
  /** Sub-fitur per fitur. */
  subFeatures: [min: number, max: number];
  /** Total task satu plan, termasuk task QA & Integrasi. */
  tasks: [min: number, max: number];
}

export const STRUCTURE_LIMITS: Record<Tier, StructureLimits> = {
  free: { features: [4, 8], subFeatures: [3, 5], tasks: [14, 20] },
  pro: { features: [10, 15], subFeatures: [8, 12], tasks: [15, 25] },
};

/** Jumlah task yang disuntikkan otomatis sebagai sub-fitur "QA & Integrasi". */
export const QA_INJECTED_TASKS = 4;

/** Maksimal ide dari kolom chat "Ide Kamu" per project (khusus Pro). */
export const IDEAS_PER_PLAN_LIMIT = 2;

export function structureLimits(tier: Tier | string | null | undefined): StructureLimits {
  return STRUCTURE_LIMITS[tier === "pro" ? "pro" : "free"];
}

/**
 * Budget task maksimum per fitur supaya total plan (fitur x budget + task QA)
 * tidak pernah melewati batas atas tier. Floor disengaja: kombinasi fitur
 * banyak + batas task kecil (mis. Pro 15 fase, 25 task) hanya bisa dipenuhi
 * dengan 1-2 task per fitur, dan floor menjamin tidak pernah overshoot.
 */
export function taskBudgetPerFeature(tier: Tier | string | null | undefined, featureCount: number): number {
  const limits = structureLimits(tier);
  if (featureCount <= 0) return limits.tasks[1];
  return Math.max(1, Math.floor((limits.tasks[1] - QA_INJECTED_TASKS) / featureCount));
}

/** Rentang task per fitur untuk dipajang di prompt LLM. */
export function taskRangePerFeature(tier: Tier | string | null | undefined, featureCount: number): [number, number] {
  const limits = structureLimits(tier);
  const maxPer = taskBudgetPerFeature(tier, featureCount);
  const minPer = Math.max(1, Math.floor((limits.tasks[0] - QA_INJECTED_TASKS) / Math.max(1, featureCount)));
  return [Math.min(minPer, maxPer), maxPer];
}

/** Potong kelebihan ke maksimum tier (enforce keras hasil LLM). */
export function trimToMax<T>(items: T[], max: number): T[] {
  return items.length > max ? items.slice(0, max) : items;
}
