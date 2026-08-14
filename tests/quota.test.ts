import { test, before } from "node:test";
import assert from "node:assert/strict";
import { getQuota, consumeQuota, refundQuota } from "@/lib/quota";

// Paksa memory mode: tanpa DATABASE_URL. (node --test menjalankan file ini di
// proses terpisah, jadi manipulasi env di sini aman.)
before(() => {
  delete process.env.DATABASE_URL;
  process.env.QUOTA_GENERATE_DAILY = "2";
});

test("getQuota awal: remaining = limit", async () => {
  const q = await getQuota("quota-user-a");
  assert.equal(q.limit, 2);
  assert.equal(q.remaining, 2);
  assert.ok(q.resetAt > Date.now());
});

test("consumeQuota mengurangi remaining", async () => {
  const r1 = await consumeQuota("quota-user-b");
  assert.ok(r1, "konsumsi pertama berhasil");
  const q = await getQuota("quota-user-b");
  assert.equal(q.remaining, 1);
});

test("consumeQuota mengembalikan null saat kuota habis", async () => {
  const u = "quota-user-c";
  const r1 = await consumeQuota(u);
  const r2 = await consumeQuota(u);
  assert.ok(r1);
  assert.ok(r2);
  const q = await getQuota(u);
  assert.equal(q.remaining, 0);
  const r3 = await consumeQuota(u);
  assert.equal(r3, null, "konsumsi ketiga ditolak karena limit 2");
});

test("refundQuota mengembalikan kuota setelah gagal", async () => {
  const u = "quota-user-d";
  const receipt = await consumeQuota(u);
  assert.ok(receipt);
  assert.equal((await getQuota(u)).remaining, 1);
  await refundQuota(receipt);
  assert.equal((await getQuota(u)).remaining, 2, "refund mengembalikan remaining");
});
