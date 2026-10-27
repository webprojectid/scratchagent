import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { effectiveAccountTier } from "@/lib/account-membership";

export interface CurrentUser {
  email: string;
  name: string;
  provider?: string;
  role?: string;
  tier?: "free" | "pro" | "max";
  proActive?: boolean;
  createdAt?: string | null;
  proExpiresAt?: string | null;
  bannedAt?: string | null;
  emailVerified?: boolean;
}

/** Supabase dianggap aktif kalau env-nya terisi (bukan placeholder). */
export function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!anonKey && url.startsWith("https://") && !anonKey.startsWith("ISI_");
}

import { formatDisplayName } from "@/lib/user-utils";
export { formatDisplayName };

function readLegacyUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem("scratch_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u?.email) {
      return {
        email: u.email,
        name: formatDisplayName(u.email, u.name),
        provider: u.provider,
        role: "user",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

type UserSnapshot = { user: CurrentUser | null; loading: boolean };
const serverSnapshot: UserSnapshot = { user: null, loading: true };
let snapshot = serverSnapshot;
let cached: Promise<CurrentUser | null> | null = null;
let cachedUntil = 0;
let revision = 0;
const listeners = new Set<() => void>();

function publish(user: CurrentUser | null, loading = false) {
  snapshot = { user, loading };
  listeners.forEach(listener => listener());
}

export function getCurrentUserSnapshot(): UserSnapshot { return snapshot; }

async function resolveIdentity(): Promise<CurrentUser | null> {
  if (supabaseConfigured()) {
    try {
      // Session identity is for presentation only; /api/me verifies permissions.
      const { data } = await createClient().auth.getSession();
      const user = data.session?.user;
      if (user?.email) {
        const meta = user.user_metadata ?? {};
        return { email: user.email, name: formatDisplayName(user.email, meta.full_name || meta.name), provider: user.app_metadata?.provider ?? "oauth", role: "user" };
      }
    } catch {}
    return null;
  }
  return readLegacyUser();
}

async function resolveUser(version: number): Promise<CurrentUser | null> {
  const identity = await resolveIdentity();
  if (version !== revision) return snapshot.user;
  if (!identity) { publish(null); return null; }
  publish(snapshot.user?.email === identity.email ? snapshot.user : identity, true);
  let user = identity;
  try {
    const response = await fetch(`/api/me?userId=${encodeURIComponent(identity.email)}`, { cache: "no-store" });
    if (response.ok) {
      const account = await response.json();
      const tier = effectiveAccountTier(account);
      user = { ...identity, name: account.name || identity.name, role: account.role === "admin" ? "admin" : "user", tier, proActive: tier === "free" ? false : typeof account.proActive === "boolean" ? account.proActive : undefined, emailVerified: account.emailVerified, createdAt: account.createdAt ?? null, proExpiresAt: account.proExpiresAt ?? null, bannedAt: account.bannedAt ?? null };
    } else if (response.status === 401 || response.status === 403) {
      if (version === revision) publish(null);
      return null;
    }
  } catch {}
  if (version !== revision) return snapshot.user;
  publish(user);
  return user;
}

export function getCurrentUser(options: { fresh?: boolean } = {}): Promise<CurrentUser | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (cached && (options.fresh || Date.now() >= cachedUntil || snapshot.user?.proActive && effectiveAccountTier(snapshot.user) === "free")) {
    revision++;
    cached = null;
  }
  if (!cached) { cachedUntil = Date.now() + 30_000; cached = resolveUser(revision); }
  return cached;
}

export function refreshCurrentUser(): void {
  revision++;
  cached = null;
  if (listeners.size) void getCurrentUser();
}

export function clearCurrentUser(): void {
  revision++;
  cached = Promise.resolve(null);
  publish(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

let observers = 0;
let stopObserving: (() => void) | undefined;
function observeAuth() {
  if (observers++ === 0) {
    const sync = () => refreshCurrentUser();
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === "scratch_user" || event.key?.startsWith("sb-")) sync();
    };
    let subscription: { unsubscribe: () => void } | undefined;
    if (supabaseConfigured()) {
      const { data } = createClient().auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT") clearCurrentUser();
        else if (event !== "INITIAL_SESSION") {
          // Do not call session methods while Supabase holds its auth lock.
          setTimeout(sync, 0);
        }
      });
      subscription = data.subscription;
    }
    window.addEventListener("focus", sync);
    window.addEventListener("storage", storage);
    stopObserving = () => {
      subscription?.unsubscribe();
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", storage);
    };
  }
  return () => { if (--observers === 0) stopObserving?.(); };
}

export function useCurrentUser(): UserSnapshot {
  const state = useSyncExternalStore(subscribe, getCurrentUserSnapshot, () => serverSnapshot);
  useEffect(() => {
    const stop = observeAuth();
    void getCurrentUser();
    return stop;
  }, []);
  return state;
}
