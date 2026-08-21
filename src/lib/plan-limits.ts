/**
 * Batas struktur PRD per tier.
 * Perhitungan berlaku per unit (fitur/fase dan sub-fitur):
 * - Free: 4-8 fase per plan, 3-5 sub-fitur per fase, 8-12 task per fitur.
 * - Pro : 10-15 fase per plan, 12-20 sub-fitur per fase, 15-25 task per fitur.
 */

export type Tier = "free" | "pro";

export interface StructureLimits {
  /** Jumlah fase (= jumlah fitur, tiap fitur jadi satu fase) per plan. */
  features: [min: number, max: number];
  /** Sub-fitur per fitur (fase). */
  subFeatures: [min: number, max: number];
  /** Batas task per fitur (fase). */
  tasks: [min: number, max: number];
}

export const STRUCTURE_LIMITS: Record<Tier, StructureLimits> = {
  free: { features: [4, 8], subFeatures: [3, 5], tasks: [8, 12] },
  pro: { features: [10, 15], subFeatures: [12, 20], tasks: [15, 25] },
};

/** Jumlah task yang disuntikkan otomatis sebagai sub-fitur "QA & Integrasi". */
export const QA_INJECTED_TASKS = 4;

/** Maksimal ide dari kolom chat "Ide Kamu" per project (khusus Pro). */
export const IDEAS_PER_PLAN_LIMIT = 2;

export function structureLimits(tier: Tier | string | null | undefined): StructureLimits {
  return STRUCTURE_LIMITS[tier === "pro" ? "pro" : "free"];
}

/**
 * Budget task maksimum per fitur.
 * Batas task berlaku per fitur/sub-fitur (bukan dibagi rata untuk seluruh plan),
 * sehingga setiap sub-fitur memiliki alokasi task yang cukup.
 */
export function taskBudgetPerFeature(tier: Tier | string | null | undefined, _featureCount = 1): number {
  const limits = structureLimits(tier);
  return limits.tasks[1];
}

/** Rentang task per fitur untuk dipajang di prompt LLM. */
export function taskRangePerFeature(
  tier: Tier | string | null | undefined,
  _featureCount = 1,
  subFeatureCount = 3,
): [number, number] {
  const limits = structureLimits(tier);
  const maxPer = limits.tasks[1];
  const minPer = Math.min(Math.max(subFeatureCount, limits.tasks[0]), maxPer);
  return [minPer, maxPer];
}

/** Potong kelebihan ke maksimum tier (enforce keras hasil LLM). */
export function trimToMax<T>(items: T[], max: number): T[] {
  return items.length > max ? items.slice(0, max) : items;
}
