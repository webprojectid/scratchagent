import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeDeps, buildTaskRef } from "@/lib/generate";

function depsOf(nodes: { ref: string; deps: string[] }[]) {
  return sanitizeDeps(nodes);
}

test("buildTaskRef formats F/S/T with padding", () => {
  assert.equal(buildTaskRef(0, 0, 1), "F01-S01-T01");
  assert.equal(buildTaskRef(2, 1, 12), "F03-S02-T12");
});

test("sanitizeDeps preserves a linear chain", () => {
  const res = depsOf([
    { ref: "A", deps: [] },
    { ref: "B", deps: ["A"] },
    { ref: "C", deps: ["B"] },
  ]);
  assert.deepEqual(res.get("A"), []);
  assert.deepEqual(res.get("B"), ["A"]);
  assert.deepEqual(res.get("C"), ["B"]);
});

test("sanitizeDeps breaks a 3-node cycle", () => {
  const res = depsOf([
    { ref: "A", deps: ["C"] },
    { ref: "B", deps: ["A"] },
    { ref: "C", deps: ["B"] },
  ]);
  // Hasil harus asiklik: minimal satu edge dibuang.
  assert.deepEqual(res.get("C"), [], "edge pembentuk siklus dibuang");
  assert.deepEqual(res.get("A"), ["C"]);
  assert.deepEqual(res.get("B"), ["A"]);
});

test("sanitizeDeps breaks a 2-node cycle", () => {
  const res = depsOf([
    { ref: "A", deps: ["B"] },
    { ref: "B", deps: ["A"] },
  ]);
  const total = (res.get("A")?.length ?? 0) + (res.get("B")?.length ?? 0);
  assert.equal(total, 1, "salah satu edge dibuang agar tidak siklus");
});

test("sanitizeDeps drops self-dependency", () => {
  const res = depsOf([
    { ref: "A", deps: ["A"] },
    { ref: "B", deps: ["A"] },
  ]);
  assert.deepEqual(res.get("A"), []);
  assert.deepEqual(res.get("B"), ["A"]);
});

test("sanitizeDeps drops unknown refs and duplicates", () => {
  const res = depsOf([
    { ref: "A", deps: [] },
    { ref: "B", deps: ["A", "ZZZ", "A"] },
  ]);
  assert.deepEqual(res.get("B"), ["A"]);
});
