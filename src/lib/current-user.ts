import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CurrentUser {
  email: string;
  name: string;
  provider?: string;
  role?: string;
}

/** Supabase dianggap aktif kalau env-nya terisi (bukan placeholder). */
export function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!anonKey && url.startsWith("https://") && !anonKey.startsWith("ISI_");
}

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (lower.startsWith("admin@") || lower === "admin") return true;
  const list = ["teguhends@gmail.com"];
  return list.includes(lower);
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
        role: u.role || (isAdmin(u.email) ? "admin" : "user"),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

let cached: Promise<CurrentUser | null> | null = null;

async function resolveUser(): Promise<CurrentUser | null> {
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
          role: (meta.role as string) || (isAdmin(su.email) ? "admin" : "user"),
        };
      }
    } catch {
      /* lanjut ke fallback */
    }
  }
  // 2) Fallback: localStorage (mode dev polos / legacy).
  return readLegacyUser();
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
        const { data } = supabase.auth.onAuthStateChange(() => {
          syncUser();
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
