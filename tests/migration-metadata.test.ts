import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "@/db/schema";
import * as account from "@/db/account-schema";
import * as email from "@/db/email-schema";

test("every journal migration has linked metadata and a SQL file", () => {
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
  let previousId: string | undefined;
  for (const entry of journal.entries) {
    assert.ok(existsSync(`drizzle/${entry.tag}.sql`));
    const snapshot = JSON.parse(readFileSync(`drizzle/meta/${String(entry.idx).padStart(4, "0")}_snapshot.json`, "utf8"));
    if (previousId) assert.equal(snapshot.prevId, previousId);
    previousId = snapshot.id;
  }
});
test("schema includes all 22 protected tables and generates no phantom changes", async () => {
  const snapshot = JSON.parse(readFileSync("drizzle/meta/0011_snapshot.json", "utf8"));
  const current = generateDrizzleJson({ ...schema, ...account, ...email });
  assert.equal(Object.keys(current.tables).length, 22);
  assert.ok(Object.values(current.tables).every(table => table.isRLSEnabled));
  assert.deepEqual(await generateMigration(snapshot, current), []);
});
