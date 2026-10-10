import { test } from "node:test";
import assert from "node:assert/strict";
import { getCurrentUser, refreshCurrentUser } from "@/lib/current-user";

test("local identity cannot claim admin or Pro when verification fails", async () => {
  const descriptors = ["window", "localStorage", "fetch"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => JSON.stringify({ email: "user@example.test", name: "User", role: "admin", tier: "pro" }) } });
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: async () => new Response("Unavailable", { status: 503 }) });
    refreshCurrentUser();
    const fallback = await getCurrentUser();
    assert.equal(fallback?.role, "user");
    assert.equal(fallback?.tier, undefined);

    Object.defineProperty(globalThis, "fetch", { configurable: true, value: async () => Response.json({ name: "Verified admin", role: "admin", tier: "pro", proActive: true }) });
    refreshCurrentUser();
    const verified = await getCurrentUser();
    assert.equal(verified?.role, "admin");
    assert.equal(verified?.tier, "pro");
    assert.equal(verified?.proActive, true);
  } finally {
    refreshCurrentUser();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    if (previousUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  }
});
