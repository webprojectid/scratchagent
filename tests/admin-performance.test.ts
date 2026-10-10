import { before, test } from "node:test";
import assert from "node:assert/strict";
import { getAccountSummary, listAccounts } from "@/lib/billing";
import { memoryGetOrCreateUser, memoryAddSubscription, memoryEndSubscription } from "@/lib/memory-store";
import { cachedIpGeo, lookupIpGeo } from "@/lib/security";

before(() => { delete process.env.DATABASE_URL; });

test("lightweight identity preserves active, expired, ended and indefinite memberships", async () => {
  const expired = memoryGetOrCreateUser("perf-expired@example.test");
  const active = memoryGetOrCreateUser("perf-active@example.test");
  const indefinite = memoryGetOrCreateUser("perf-indefinite@example.test");
  const ended = memoryGetOrCreateUser("perf-ended@example.test");
  memoryAddSubscription(expired.id, "test", new Date(Date.now() - 1000).toISOString());
  memoryAddSubscription(active.id, "test", new Date(Date.now() + 60_000).toISOString());
  memoryAddSubscription(indefinite.id, "test");
  memoryAddSubscription(ended.id, "test"); memoryEndSubscription(ended.id, "test");
  assert.equal((await getAccountSummary(expired.id))?.tier, "free");
  assert.equal((await getAccountSummary(active.id))?.tier, "pro");
  assert.equal((await getAccountSummary(indefinite.id))?.proExpiresAt, null);
  assert.equal((await getAccountSummary(ended.id))?.tier, "free");
  assert.equal(await getAccountSummary("missing-account"), null);
  const rows = await listAccounts("perf-");
  assert.equal(rows.find(row => row.id === expired.id)?.tier, "free");
  assert.equal(rows.find(row => row.id === indefinite.id)?.tier, "pro");
});

test("geolocation is nonblocking on cache reads and coalesces concurrent lookups", async () => {
  const original = globalThis.fetch;
  let requests = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  globalThis.fetch = async () => { requests++; await barrier; return Response.json({ success: true, country: "Test", city: "City", country_code: "TT" }); };
  try {
    const one = lookupIpGeo("203.0.113.40"); const two = lookupIpGeo("203.0.113.40");
    assert.equal(cachedIpGeo("203.0.113.40").country, null);
    assert.equal(requests, 1);
    release(); const results = await Promise.all([one, two]);
    assert.deepEqual(results[0], results[1]);
    assert.equal(cachedIpGeo("203.0.113.40").country, "Test");
    await lookupIpGeo("203.0.113.40"); assert.equal(requests, 1);
    await lookupIpGeo("127.0.0.1"); assert.equal(requests, 1);
  } finally { globalThis.fetch = original; }
});

test("failed geolocation is cached briefly rather than retried on every refresh", async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("offline"); };
  try {
    await lookupIpGeo("203.0.113.41"); await lookupIpGeo("203.0.113.41");
    assert.equal(requests, 1);
    assert.equal(cachedIpGeo("203.0.113.41").country, null);
  } finally { globalThis.fetch = original; }
});
