import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { getPhaseIconName, projectStockIcons } from "../src/lib/phase-icons";
import { stockIconNames } from "../src/lib/stock-icon-catalog";

test("phase icons represent product capabilities in both supported languages", () => {
  for (const [title, expected] of [
    ["Online Deposits & Payments", "credit-card"], ["Pembayaran QRIS", "credit-card"],
    ["Akun dan Autentikasi", "shield-lock"], ["Pengingat Menabung", "bell"],
    ["Pencarian Lapangan Terdekat", "search"], ["Target Menabung", "target"],
    ["Staff Check-in Operations", "user-check"], ["Revenue Reports", "file-analytics"],
    ["Notifikasi Pengingat H-1 Sebelum Booking", "bell"],
  ]) assert.equal(getPhaseIconName({ title, icon: "package" }), expected, title);
});

test("stored icon hints cannot introduce remote SVGs or unknown symbols", () => {
  assert.equal(getPhaseIconName({ title: "Unclassified capability", icon: "https://example.test/icon.svg" }), "sitemap");
  assert.equal(getPhaseIconName({ title: "Unclassified capability", icon: "📦" }), "sitemap");
  assert.equal(getPhaseIconName({ title: "Unclassified capability", icon: "rocket" }), "rocket");
});

test("all displayed project and phase symbols are bundled locally with their license", () => {
  const sprite = readFileSync("public/icons/tabler/sprite.svg", "utf8");
  for (const name of new Set([...stockIconNames, ...Object.values(projectStockIcons)])) {
    assert.ok(existsSync(`public/icons/tabler/${name}.svg`), name);
    assert.ok(sprite.includes(`<symbol id="${name}"`), name);
  }
  assert.ok(existsSync("public/icons/tabler/LICENSE.txt"));
  assert.ok(existsSync("public/icons/iconoir/LICENSE.txt"));
  assert.doesNotMatch(sprite, /<script|<foreignObject|\bon\w+\s*=/i);
});
