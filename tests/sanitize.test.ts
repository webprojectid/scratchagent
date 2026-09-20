import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeTechTerms } from "@/lib/generate";

test("sanitizeTechTerms replaces pratinjau with preview", () => {
  assert.equal(sanitizeTechTerms("Area Pratinjau Tangkapan Layar"), "Area Preview Screenshot");
  assert.equal(sanitizeTechTerms("halaman pratinjau menu"), "halaman preview menu");
});

test("sanitizeTechTerms replaces antarmuka with UI", () => {
  assert.equal(sanitizeTechTerms("Buat antarmuka pengguna"), "Buat user interface");
  assert.equal(sanitizeTechTerms("Antarmuka utama"), "UI utama");
});

test("sanitizeTechTerms replaces screenshot, clipboard, database, password", () => {
  assert.equal(
    sanitizeTechTerms("Simpan cuplikan layar ke basis data lalu salin ke papan klip dengan kata sandi dan kredensial"),
    "Simpan screenshot ke database lalu salin ke clipboard dengan password dan credentials",
  );
});

test("sanitizeTechTerms handles complex dev phrases", () => {
  assert.equal(sanitizeTechTerms("Pipa Aliran Data Asinkron"), "Data stream Asinkron");
  assert.equal(sanitizeTechTerms("Penyandi Base64"), "Base64 Encoder");
  assert.equal(sanitizeTechTerms("Umpan Balik Haptik"), "Haptic feedback");
  assert.equal(sanitizeTechTerms("Pengguliran Otomatis"), "Auto-scroll");
  assert.equal(sanitizeTechTerms("Tata Letak MainActivity"), "Layout MainActivity");
});
