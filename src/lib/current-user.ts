import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { effectiveAccountTier } from "@/lib/account-membership";

export interface CurrentUser {
  email: string;
  name: string;
  provider?: string;
  role?: string;
  tier?: "free" | "pro";
  proActive?: boolean;
  createdAt?: string | null;
  proExpiresAt?: string | null;
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

let cached: Promise<CurrentUser | null> | null = null;

async function resolveIdentity(): Promise<CurrentUser | null> {
  // 1) Sumber utama: session Supabase (cookie).
  if (supabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const su = data.user;
      if (su?.email) {
        const meta = (su.user_metadata ?? {}) as Record<string, unknown>;
        const rawName = (meta.full_name as string) || (meta.name as string);
        return {
          email: su.email,
          name: formatDisplayName(su.email, rawName),
          provider: ((su.app_metadata?.provider as string) ?? "oauth"),
          role: "user",
        };
      }
    } catch {
      /* lanjut ke fallback */
    }
  }
  // 2) Fallback: localStorage (mode dev polos / legacy).
  return readLegacyUser();
}

async function resolveUser(): Promise<CurrentUser | null> {
  const identity = await resolveIdentity();
  if (!identity) return null;
  try {
    const response = await fetch(`/api/me?userId=${encodeURIComponent(identity.email)}`, { cache: "no-store" });
    if (response.ok) {
      const account = await response.json();
      return { ...identity, name: account.name || identity.name, role: account.role === "admin" ? "admin" : "user", tier: effectiveAccountTier(account), proActive: typeof account.proActive === "boolean" ? account.proActive : undefined, emailVerified: account.emailVerified, createdAt: account.createdAt ?? null, proExpiresAt: account.proExpiresAt ?? null };
    }
  } catch { /* Keep the signed-in identity when the account service is unavailable. */ }
  return identity;
}

/**
 * Ambil identitas user saat ini. Supabase session jadi sumber utama;
 * localStorage hanya fallback untuk dev tanpa Supabase. Hasil di-cache
 * supaya banyak pemanggil berbagi resolusi yang sama.
 */
export function getCurrentUser(): Promise<CurrentUser | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!cached) cached = resolveUser();
  return cached;
}

/** Paksa resolusi ulang (mis. setelah login/logout). */
export function refreshCurrentUser(): void {
  cached = null;
}

/** Hook React: return user + loading (auto-sync dengan Supabase dan Storage). */
export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const syncUser = () => {
      refreshCurrentUser();
      getCurrentUser().then((u) => {
        if (!active) return;
        setUser(u);
        setLoading(false);
      });
    };

    // Initial load
    getCurrentUser().then((u) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
    });

    // Supabase auth subscription
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data } = supabase.auth.onAuthStateChange((event) => {
          if (event !== "INITIAL_SESSION") syncUser();
        });
        authSubscription = data.subscription;
      } catch {}
    }

    // Storage & focus listeners for multi-tab sync
    window.addEventListener("storage", syncUser);
    window.addEventListener("focus", syncUser);

    return () => {
      active = false;
      authSubscription?.unsubscribe();
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("focus", syncUser);
    };
  }, []);

  return { user, loading };
}
