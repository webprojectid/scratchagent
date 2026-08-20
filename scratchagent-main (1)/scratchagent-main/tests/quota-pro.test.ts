import { test, before } from "node:test";
import assert from "node:assert/strict";
import { getQuota, consumeQuota } from "@/lib/quota";

// Memory mode: tanpa DATABASE_URL.
before(() => {
  delete process.env.DATABASE_URL;
  process.env.QUOTA_GENERATE_DAILY = "3";
});

test("tier pro tidak dibatasi kuota", async () => {
  const u = "pro-unlimited";
  for (let i = 0; i < 6; i++) {
    const r = await consumeQuota(u, "pro");
    assert.ok(r, `generate ke-${i + 1} sebagai pro selalu berhasil`);
    assert.equal(r!.tier, "pro");
  }
  const q = await getQuota(u, "pro");
  assert.equal(q.unlimited, true);
  assert.equal(q.remaining, Infinity);
});

test("jatah free tidak berkurang oleh generate pro", async () => {
  const u = "pro-campur";
  await consumeQuota(u, "free");
  await consumeQuota(u, "pro");
  await consumeQuota(u, "pro");
  const q = await getQuota(u, "free");
  assert.equal(q.remaining, 2, "hanya 1 generate free yang tercatat, pro tidak memotong jatah");
});

test("konsumsi free tetap dibatasi 3 dalam rolling 24 jam", async () => {
  const u = "free-tetap-limit";
  assert.ok(await consumeQuota(u, "free"));
  assert.ok(await consumeQuota(u, "free"));
  assert.ok(await consumeQuota(u, "free"));
  assert.equal(await consumeQuota(u, "free"), null, "generate free keempat ditolak");
});
