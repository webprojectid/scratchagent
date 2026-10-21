"use client";

import { uiText as ui, useUiLanguage } from "@/lib/ui-text";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

// Halaman bridge setelah OAuth callback: pastikan session Supabase aktif,
// lalu lanjut. Client sekarang membaca session Supabase langsung (via
// getCurrentUser), jadi tidak perlu lagi menulis scratch_user ke localStorage.
export default function AuthComplete() {
  useUiLanguage();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data, error: err }) => {
        if (err || !data.user) {
          setError(err?.message ?? ui("Session tidak ditemukan"));
          setTimeout(() => router.push("/login"), 1500);
          return;
        }
        return fetch("/api/auth/social-otp", { cache: "no-store" }).then(async response => {
          if (!response.ok) throw new Error("Verification unavailable");
          const status = await response.json();
          router.replace(status.verified ? "/new" : "/auth/verify");
        });
      })
      .catch(() => {
        setError(ui("Gagal membaca session"));
        setTimeout(() => router.push("/login"), 1500);
      });
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-4">
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-[#74FA6A]" />
          <p className="text-slate-400 text-sm">{ui("Lagi masuk… sebentar ya.")}</p>
        </>
      )}
    </div>
  );
}
