import assert from "node:assert/strict";
import { test } from "node:test";
import { legacyQaPhaseRefs, orderPlanFeatures } from "../src/lib/storage";
import type { Plan, Task } from "../src/lib/types";

function feature(id: string, order: number, phases: number[] = []) {
  return { id, order, subFeatures: [{ tasks: phases.map((phase) => ({ phase })) }] };
}

test("persisted feature order keeps phase indexes stable as parallel task batches finish", () => {
  const first = feature("z", 0);
  const second = feature("a", 1);
  const final = feature("m", 2);
  const unordered = [final, first, second];
  assert.deepEqual(orderPlanFeatures(unordered, "generating").map((item) => item.id), ["z", "a", "m"]);

  second.subFeatures[0].tasks.push({ phase: 2 });
  assert.deepEqual(orderPlanFeatures(unordered, "generating").map((item) => item.id), ["z", "a", "m"]);
});

test("legacy order ties use stable IDs during generation and task phases after completion", () => {
  const legacy = [feature("c", 0, [1]), feature("a", 0), feature("b", 0, [2])];
  assert.deepEqual(orderPlanFeatures(legacy, "generating").map((item) => item.id), ["a", "b", "c"]);
  assert.deepEqual(orderPlanFeatures(legacy, "ready").map((item) => item.id), ["c", "b", "a"]);
});

test("legacy QA phase repair targets only automatic QA refs on the last feature", () => {
  const makeTask = (ref: string, layer: Task["layer"], phase: number): Task => ({
    ref, title: "Jalankan aplikasi end-to-end", layer, phase, page: null, deps: [], status: "done",
  });
  const features: Plan["features"] = Array.from({ length: 4 }, (_, index) => ({
    slug: `fase-${index + 1}`, title: `Fase ${index + 1}`, icon: "", description: "",
    tujuan: "", selesaiBila: [], status: "direncanakan", subFeatures: [],
  }));
  features[0].subFeatures.push({ title: "QA & Integrasi", tasks: [makeTask("F01-S99-T01", "qa", 4)] });
  features[3].subFeatures.push({ title: "QA & Integrasi", tasks: [
    makeTask("F04-S99-T01", "qa", 4),
    makeTask("F04-S99-T02", "backend", 4),
    makeTask("F04-S99-T03", "qa", 5),
    makeTask("F03-S99-T04", "qa", 4),
  ] });

  assert.deepEqual(legacyQaPhaseRefs({ features }), ["F04-S99-T01"]);
  assert.equal(features[3].subFeatures[0].tasks[0].status, "done");
});

test("English automatic QA refs are eligible for targeted legacy phase repair", () => {
  const features: Plan["features"] = Array.from({ length: 3 }, (_, index) => ({
    slug: `phase-${index + 1}`, title: `Phase ${index + 1}`, icon: "", description: "",
    tujuan: "", selesaiBila: [], status: "direncanakan", subFeatures: [],
  }));
  const makeTask = (ref: string, phase: number): Task => ({
    ref, title: "Run the app end to end", layer: "qa", phase, page: null, deps: [], status: "done",
  });
  features[2].subFeatures.push({ title: "QA & Integration", tasks: [
    makeTask("F03-S99-T01", 3),
    makeTask("F03-S99-T02", 4),
    makeTask("F02-S99-T03", 3),
  ] });
  assert.deepEqual(legacyQaPhaseRefs({ features }), ["F03-S99-T01"]);
});
