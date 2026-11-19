import { test } from "node:test";
import assert from "node:assert/strict";
import { fallbackOutline, fallbackProductSpec, fallbackRequirements, fallbackSubfeatures, fallbackTasks } from "../src/lib/generation-fallback";
import { structureLimits } from "../src/lib/plan-limits";
import { validateProductSpec } from "../src/lib/product-spec";

const brief = "Buatkan aplikasi booking lapangan untuk pemilik lapangan dan penyewa. Penyewa memilih jadwal, membayar, lalu menerima konfirmasi. Pemilik mengelola lapangan dan melihat riwayat transaksi.";

test('discovery fallback is a valid contract with exact source evidence', () => {
  const spec = fallbackProductSpec(brief, [{ question: "Apakah perlu pembayaran?", answer: "Ya, pembayaran online" }], "id");
  assert.ok(spec.requirements.length >= 4);
  assert.deepEqual(validateProductSpec(spec, `${brief}\nApakah perlu pembayaran?: Ya, pembayaran online`), []);
  assert.equal(new Set(spec.requirements.map(requirement => requirement.id)).size, spec.requirements.length);
});

test('outline fallback covers every requirement and tier minimum', () => {
  const spec = fallbackProductSpec(brief, [], "id");
  const outline = fallbackOutline(brief, spec, "free", ["Next.js", "PostgreSQL"], "id");
  assert.ok(outline.features.length >= structureLimits("free").features[0]);
  const owned = outline.features.flatMap(feature => feature.requirement_ids);
  assert.deepEqual([...owned].sort(), spec.requirements.map(requirement => requirement.id).sort());
  assert.equal(new Set(outline.features.map(feature => feature.title.toLowerCase())).size, outline.features.length);
});

test('capability and requirement fallbacks preserve stable coverage', () => {
  const spec = fallbackProductSpec(brief, [], "id");
  const feature = { title: "Booking workflow", description: "Buyers choose a slot and confirm.", tujuan: "Complete a booking.", selesai_bila: ["A booking is stored"], requirement_ids: ["R01", "R02"] };
  const subs = fallbackSubfeatures(feature, 3, [], "id");
  assert.equal(subs.length, 3);
  assert.equal(new Set(subs.map(sub => sub.title)).size, 3);
  assert.ok(subs.every(sub => sub.requirement_ids.length > 0));

  const requirements = fallbackRequirements(spec, [{ title: feature.title, requirement_ids: feature.requirement_ids }], ["Next.js"], "id");
  for (const requirement of spec.requirements) {
    assert.ok(requirements.user_flow.some(flow => flow.requirementIds.includes(requirement.id)));
    assert.ok(requirements.requirements.fungsional.some(text => text.includes(`[${requirement.id}]`)));
  }
  assert.ok(requirements.requirements.non_fungsional.length >= 4);
});

test('task fallback covers every capability and the tier minimum', () => {
  const subs = ["Booking workflow: core workflow", "Booking workflow: validation", "Booking workflow: recovery"];
  const tasks = fallbackTasks("Booking workflow", subs, "free", 0, false, "id");
  assert.equal(tasks.length, structureLimits("free").tasks[0]);
  for (const sub of subs) assert.ok(tasks.some(task => task.sub_feature === sub));
  assert.equal(new Set(tasks.map(task => task.id)).size, tasks.length);

  const release = fallbackTasks("Release", subs, "free", 3, true, "id");
  assert.equal(release.length, structureLimits("free").tasks[0] - 4);

  const detailed = fallbackTasks("Booking workflow", subs, "free", 0, false, "id", [
    { id: "R01", verification: ["success", "failure", "concurrency"] },
    { id: "R02", verification: ["success", "recovery"] },
  ]);
  assert.ok(detailed.every(task => task.detail));
  assert.ok(detailed.some(task => task.detail?.requirementIds.includes("R01")));
  assert.ok(detailed.some(task => task.detail?.requirementIds.includes("R02")));
  assert.ok(detailed.flatMap(task => task.detail?.tests.map(test => test.scenario) ?? []).includes("concurrency"));
});
