import { test } from "node:test";
import assert from "node:assert/strict";
import { getProjectIdentity } from "@/lib/project-identity";

test("project identity recognizes Indonesian and English product titles without accidental keyword matches", () => {
  for (const [title, category] of [
    ["Aplikasi HabitKu", "habit"], ["Sistem Klinik Sehat", "health"],
    ["Keuangan Keluarga", "finance"], ["Learning platform", "education"],
    ["Celengan Digital", "finance"], ["FutsalGo", "sports"],
    ["Booking Hotel", "travel"], ["Kopi Nusantara", "food"],
    ["Toko Online", "commerce"], ["Inventori Gudang", "logistics"],
    ["Sewa Rumah", "property"], ["Password manager", "security"],
    ["Forum komunitas", "social"], ["Portofolio Fotografi", "creative"],
    ["Marketing CRM", "marketing"], ["Manajemen Proyek", "productivity"],
    ["Coding Agent", "developer"], ["Analytics Dashboard", "data"],
    ["LaundryKilo", "services"], ["TokoOnline Pro", "commerce"], ["FreelanceFlow", "productivity"], ["Pratitah", "general"],
  ]) assert.equal(getProjectIdentity({ id: "project", title }).category, category, title);
});

test("project identity remains deterministic across serializations, case changes, and progress updates", () => {
  const project = { id: "stable-project", title: "Toko Online", status: "ready", tasksDone: 0 };
  const identity = getProjectIdentity(project);
  assert.deepEqual(getProjectIdentity(JSON.parse(JSON.stringify(project))), identity);
  assert.deepEqual(getProjectIdentity({ ...project, title: "TOKO ONLINE", status: "done", tasksDone: 80 }), identity);
  assert.deepEqual(getProjectIdentity({ id: "", title: "" }), getProjectIdentity({ id: "", title: "" }));
});

test("unknown projects have substantial variation instead of sharing a single default icon", () => {
  const identities = Array.from({ length: 300 }, (_, index) => getProjectIdentity({ id: `project-${index}`, title: "Karsati" }));
  assert.equal(new Set(identities.map(identity => identity.icon)).size, 12);
  assert.deepEqual(new Set(identities.map(identity => identity.tone)), new Set(["green"]));
});

test("projects within one category vary while preserving a relevant symbol", () => {
  const identities = Array.from({ length: 100 }, (_, index) => getProjectIdentity({ id: `habit-${index}`, title: "Habit tracker" }));
  assert.deepEqual(new Set(identities.map(identity => identity.icon)), new Set(["Sprout", "Leaf", "Flower2"]));
  assert.deepEqual(new Set(identities.map(identity => identity.tone)), new Set(["green"]));
});
