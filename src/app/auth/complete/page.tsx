"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

// Halaman bridge setelah OAuth callback: pastikan session Supabase aktif,
// lalu lanjut. Client sekarang membaca session Supabase langsung (via
// getCurrentUser), jadi tidak perlu lagi menulis scratch_user ke localStorage.
export default function AuthComplete() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data, error: err }) => {
        if (err || !data.user) {
          setError(err?.message ?? "Session tidak ditemukan");
          setTimeout(() => router.push("/login"), 1500);
          return;
        }
        router.push("/new");
      })
      .catch(() => {
        setError("Gagal membaca session");
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
          <p className="text-slate-400 text-sm">Lagi masuk… sebentar ya.</p>
        </>
      )}
    </div>
  );
}
