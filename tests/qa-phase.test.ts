import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ensureQaPhase } from "../src/lib/tasks";
import type { Feature, Plan, Task } from "../src/lib/types";

function makeFeature(index: number, subCount: number, taskCount: number): Feature {
  const subFeatures = Array.from({ length: subCount }, (_, subIndex) => ({
    title: `Area ${index + 1}.${subIndex + 1}`,
    tasks: [] as Task[],
  }));
  for (let taskIndex = 0; taskIndex < taskCount; taskIndex++) {
    subFeatures[taskIndex % subCount].tasks.push({
      ref: `F${String(index + 1).padStart(2, "0")}-S${String(taskIndex % subCount + 1).padStart(2, "0")}-T${String(taskIndex + 1).padStart(2, "0")}`,
      title: `Implementasi ${index + 1}.${taskIndex + 1}`,
      layer: "backend",
      phase: index + 1,
      page: null,
      deps: [],
      status: "pending",
    });
  }
  return {
    slug: `area-${index + 1}`,
    title: `Fitur ${index + 1}`,
    icon: "",
    description: "",
    tujuan: "",
    selesaiBila: [],
    status: "direncanakan",
    subFeatures,
  };
}

function makePlan(tier: "free" | "pro", featureCount: number, subCount: number, taskCount: number): Plan {
  return {
    id: "qa-test-plan",
    title: "Plan",
    brief: "Brief",
    stack: [],
    asumsi: [],
    status: "generating",
    tier,
    features: Array.from({ length: featureCount }, (_, index) => makeFeature(index, subCount, taskCount)),
  };
}

function tasksIn(feature: Feature): Task[] {
  return feature.subFeatures.flatMap((sub) => sub.tasks);
}

describe("ensureQaPhase", () => {
  test("Free menambah QA di fase terakhir tanpa fase ke-9 atau task ke-13", () => {
    const plan = makePlan("free", 8, 4, 8);
    const originalRefs = new Set(plan.features.flatMap(tasksIn).map((task) => task.ref));

    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: true });
    assert.equal(plan.features.length, 8);
    const last = plan.features.at(-1)!;
    assert.equal(last.subFeatures.length, 5);
    assert.equal(tasksIn(last).length, 12);
    const qa = last.subFeatures.at(-1)!;
    assert.equal(qa.title, "QA & Integrasi");
    assert.equal(qa.tasks.length, 4);
    assert.ok(qa.tasks.every((task) => task.phase === 8 && task.layer === "qa"));
    assert.equal(new Set(plan.features.flatMap(tasksIn).map((task) => task.ref)).size, originalRefs.size + 4);
    assert.ok([...originalRefs].every((ref) => plan.features.flatMap(tasksIn).some((task) => task.ref === ref)));
    assert.deepEqual(ensureQaPhase(plan), { changed: false, ready: true });
  });

  test("Pro memakai sisa 1 sub-fitur dan 4 task secara tepat", () => {
    const plan = makePlan("pro", 15, 19, 21);
    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: true });
    const last = plan.features.at(-1)!;
    assert.equal(last.subFeatures.length, 20);
    assert.equal(tasksIn(last).length, 25);
    assert.ok(last.subFeatures.at(-1)!.tasks.every((task) => task.phase === 15));
  });

  test("English plans receive English QA tasks and remain unchanged on rerun", () => {
    const plan = makePlan("pro", 4, 12, 15);
    plan.generationSettings = { language: "en" } as Plan["generationSettings"];
    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: true });
    const qa = plan.features.at(-1)!.subFeatures.at(-1)!;
    assert.equal(qa.title, "QA & Integration");
    assert.deepEqual(qa.tasks.map((task) => task.title), [
      "Run the app end to end",
      "Check each core flow against its acceptance criteria",
      "Fix bugs found during testing",
      "Remove leftover stubs and console.log calls",
    ]);
    assert.deepEqual(ensureQaPhase(plan), { changed: false, ready: true });
    assert.equal(plan.features.at(-1)!.subFeatures.filter((sub) => sub.title === "QA & Integration").length, 1);
  });

  test("switching an existing Indonesian QA plan to English keeps completed tasks without duplicates", () => {
    const plan = makePlan("free", 4, 3, 8);
    ensureQaPhase(plan);
    const qa = plan.features.at(-1)!.subFeatures.at(-1)!;
    const originalTasks = [...qa.tasks];
    qa.tasks[0].status = "done";
    plan.generationSettings = { language: "en" } as Plan["generationSettings"];
    assert.deepEqual(ensureQaPhase(plan), { changed: false, ready: true });
    assert.equal(plan.features.at(-1)!.subFeatures.length, 4);
    assert.equal(qa.title, "QA & Integrasi");
    assert.ok(qa.tasks.every((task, index) => task === originalTasks[index]));
    assert.equal(qa.tasks[0].status, "done");
  });

  test("English QA capacity warning is localized and clears once capacity is restored", () => {
    const plan = makePlan("free", 4, 5, 12);
    plan.generationSettings = { language: "en" } as Plan["generationSettings"];
    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: false });
    assert.match(plan.warnings?.[0] ?? "", /QA & Integration is incomplete/);
    assert.deepEqual(ensureQaPhase(plan), { changed: false, ready: false });
    const last = plan.features.at(-1)!;
    last.subFeatures.pop();
    last.subFeatures.forEach((sub) => { sub.tasks = sub.tasks.slice(0, 2); });
    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: true });
    assert.equal(plan.warnings?.length, 0);
  });

  test("English QA phase repair preserves task identity and progress", () => {
    const plan = makePlan("free", 4, 3, 8);
    plan.generationSettings = { language: "en" } as Plan["generationSettings"];
    ensureQaPhase(plan);
    const qa = plan.features.at(-1)!.subFeatures.at(-1)!;
    const originalTask = qa.tasks[0];
    originalTask.phase = 5;
    originalTask.status = "done";
    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: true });
    assert.equal(qa.tasks[0], originalTask);
    assert.equal(originalTask.phase, 4);
    assert.equal(originalTask.status, "done");
  });

  test("plan penuh tidak kehilangan task, tidak diselipkan QA, dan diberi peringatan", () => {
    const plan = makePlan("free", 8, 5, 12);
    const before = plan.features.flatMap(tasksIn).map((task) => ({ ...task }));
    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: false });
    assert.deepEqual(plan.features.flatMap(tasksIn), before);
    assert.equal(plan.features.at(-1)!.subFeatures.length, 5);
    assert.match(plan.warnings?.[0] ?? "", /QA & Integrasi belum lengkap/);
    assert.deepEqual(ensureQaPhase(plan), { changed: false, ready: false });
  });

  test("masing-masing batas sub-fitur dan task mencegah QA yang berlebihan", () => {
    for (const [subCount, taskCount] of [[5, 8], [4, 12]]) {
      const plan = makePlan("free", 8, subCount, taskCount);
      const before = JSON.stringify(plan.features);
      assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: false });
      assert.equal(JSON.stringify(plan.features), before);
    }
  });

  test("sub-fitur QA kosong yang sudah ada dipakai ulang tanpa melampaui batas", () => {
    const plan = makePlan("free", 8, 4, 8);
    plan.features.at(-1)!.subFeatures.push({ title: "QA & Integrasi", tasks: [] });
    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: true });
    assert.equal(plan.features.at(-1)!.subFeatures.length, 5);
    assert.equal(tasksIn(plan.features.at(-1)!).length, 12);
  });

  test("fase QA lama yang salah satu tingkat dibetulkan tanpa mengganti task", () => {
    const plan = makePlan("free", 8, 4, 8);
    ensureQaPhase(plan);
    const qa = plan.features.at(-1)!.subFeatures.at(-1)!;
    const originalTasks = [...qa.tasks];
    for (const task of qa.tasks) task.phase = 9;
    assert.deepEqual(ensureQaPhase(plan), { changed: true, ready: true });
    assert.ok(qa.tasks.every((task, index) => task === originalTasks[index] && task.phase === 8));
  });

  test("QA tidak ditambahkan sebelum setiap fitur memiliki task reguler", () => {
    const plan = makePlan("free", 4, 3, 8);
    plan.features[2].subFeatures.forEach((sub) => { sub.tasks = []; });
    assert.deepEqual(ensureQaPhase(plan), { changed: false, ready: false });
    assert.equal(plan.features.at(-1)!.subFeatures.length, 3);
  });
});
