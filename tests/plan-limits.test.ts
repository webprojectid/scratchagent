import { describe, test } from "node:test";
import assert from "node:assert";
import {
  STRUCTURE_LIMITS,
  QA_INJECTED_TASKS,
  structureLimits,
  taskBudgetPerFeature,
  taskRangePerFeature,
  trimToMax,
} from "../src/lib/plan-limits";
import { assignTasksToSubFeatures } from "../src/lib/generate";

describe("plan-limits: batas struktur PRD per tier", () => {
  test("Free: fase 4-8, sub-fitur 3-5, task per fitur 8-12", () => {
    assert.deepEqual(STRUCTURE_LIMITS.free.features, [4, 8]);
    assert.deepEqual(STRUCTURE_LIMITS.free.subFeatures, [3, 5]);
    assert.deepEqual(STRUCTURE_LIMITS.free.tasks, [8, 12]);
  });

  test("Pro: fase 10-15, sub-fitur 12-20, task per fitur 15-25", () => {
    assert.deepEqual(STRUCTURE_LIMITS.pro.features, [10, 15]);
    assert.deepEqual(STRUCTURE_LIMITS.pro.subFeatures, [12, 20]);
    assert.deepEqual(STRUCTURE_LIMITS.pro.tasks, [15, 25]);
  });

  test("tier null/undefined/string asing selalu jatuh ke free", () => {
    assert.strictEqual(structureLimits(null), STRUCTURE_LIMITS.free);
    assert.strictEqual(structureLimits(undefined), STRUCTURE_LIMITS.free);
    assert.strictEqual(structureLimits("hacker"), STRUCTURE_LIMITS.free);
    assert.strictEqual(structureLimits("pro"), STRUCTURE_LIMITS.pro);
  });

  test("budget task per fitur sesuai batas tier", () => {
    for (const tier of ["free", "pro"] as const) {
      const limits = STRUCTURE_LIMITS[tier];
      for (let featureCount = limits.features[0]; featureCount <= limits.features[1]; featureCount++) {
        const budget = taskBudgetPerFeature(tier, featureCount);
        assert.strictEqual(budget, limits.tasks[1], `${tier} budget task per fitur harus ${limits.tasks[1]}`);
      }
    }
  });

  test("rentang task per fitur konsisten dengan budget dan sub-fitur", () => {
    const [lo, hi] = taskRangePerFeature("free", 6, 4);
    assert.ok(lo >= 4 && lo <= hi);
    assert.strictEqual(hi, taskBudgetPerFeature("free", 6));

    const [proLo, proHi] = taskRangePerFeature("pro", 12, 8);
    assert.ok(proLo >= 8 && proLo <= proHi);
    assert.strictEqual(proHi, taskBudgetPerFeature("pro", 12));
  });

  test("trimToMax memotong kelebihan dan tidak menyentuh yang pas", () => {
    assert.deepEqual(trimToMax([1, 2, 3, 4, 5], 3), [1, 2, 3]);
    assert.deepEqual(trimToMax([1, 2, 3], 3), [1, 2, 3]);
    assert.deepEqual(trimToMax([], 8), []);
  });

  test("kasus nyata dari simulasi: 17 fase free harus terpangkas jadi 8", () => {
    const fase = Array.from({ length: 17 }, (_, i) => `F${i + 1}`);
    assert.strictEqual(trimToMax(fase, STRUCTURE_LIMITS.free.features[1]).length, 8);
  });
});

describe("assignTasksToSubFeatures: dedupe distribusi task", () => {
  test("exact match menang dan tiap task hanya masuk satu sub-fitur", () => {
    const m = assignTasksToSubFeatures(
      [{ sub_feature: "Login" }, { sub_feature: "Register" }],
      ["Login", "Register", "Lupa Password"],
    );
    assert.deepStrictEqual(m.get(0), [0]);
    assert.deepStrictEqual(m.get(1), [1]);
    assert.strictEqual(m.get(2), undefined);
    const total = [...m.values()].reduce((a, v) => a + v.length, 0);
    assert.strictEqual(total, 2);
  });

  test("sub_feature kosong tidak lagi menyalin task ke SEMUA sub-fitur", () => {
    // Bug lama: b.includes("") selalu true -> 1 task masuk 4 sub-fitur.
    const m = assignTasksToSubFeatures(
      [{ sub_feature: "" }, { sub_feature: null }],
      ["Akses Admin", "Penerimaan", "Penimbangan", "Status Proses"],
    );
    const total = [...m.values()].reduce((a, v) => a + v.length, 0);
    assert.strictEqual(total, 2, "task kosong harus tetap dihitung 2, bukan 8");
    assert.deepStrictEqual(m.get(0), [0, 1], "task tak dikenal masuk sub-fitur pertama");
  });

  test("substring match fallback tidak bikin duplikat lintas sub-fitur", () => {
    const m = assignTasksToSubFeatures(
      [{ sub_feature: "Fitur Login dan keamanan" }, { sub_feature: "Form Login" }],
      ["Login", "Register"],
    );
    const total = [...m.values()].reduce((a, v) => a + v.length, 0);
    assert.strictEqual(total, 2);
  });
});
