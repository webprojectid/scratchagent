import { test } from "node:test";
import assert from "node:assert/strict";
import { translateUi } from "../src/lib/ui-messages";

test("English project UI translates Pro access and dynamic idea feedback", () => {
  assert.equal(translateUi("Fitur khusus Pro", "en"), "Pro feature");
  assert.equal(translateUi("Upgrade ke Pro", "en"), "Upgrade to Pro");
  assert.equal(translateUi("Sisa {0}/{1}", "en", 1, 2), "1/2 remaining");
  assert.equal(translateUi('Fase baru "{0}" sudah ditambahkan ke struktur.', "en", "Booking"), 'New phase "Booking" has been added to the roadmap.');
  assert.equal(translateUi("Hapus task {0}", "en", "F01-S01-T01"), "Delete task F01-S01-T01");
});

test("Indonesian choice and project names survive UI translation", () => {
  assert.equal(translateUi("Fitur khusus Pro", "id"), "Fitur khusus Pro");
  assert.equal(translateUi("Sisa {0}/{1}", "id", 1, 2), "Sisa 1/2");
  assert.equal(translateUi('Fase baru "{0}" sudah ditambahkan ke struktur.', "en", "Tabungan Keluarga"), 'New phase "Tabungan Keluarga" has been added to the roadmap.');
});
