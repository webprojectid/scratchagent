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

function readLegacyUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem("scratch_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u?.email) {
      return {
        email: u.email,
        name: u.name || String(u.email).split("@")[0],
        provider: u.provider,
        role: u.role,
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
        return {
          email: su.email,
          name: (meta.full_name as string) || (meta.name as string) || su.email.split("@")[0],
          provider: ((su.app_metadata?.provider as string) ?? "oauth"),
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

/** Hook React: return user + loading. */
export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  return { user, loading };
}
