"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUiLanguage } from "@/lib/ui-text";
import { refreshCurrentUser, clearCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/client";
import { Shell } from "@/components/brand";

export default function VerifySocialLogin() {
  const en = useUiLanguage() === "en";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/auth/social-otp", { cache: "no-store" }).then(async response => {
      if (response.status === 401) { router.replace("/login"); return; }
      const result = await response.json();
      if (!response.ok) throw new Error();
      if (!active) return;
      if (result.verified) { refreshCurrentUser(); router.replace("/new"); }
      else setEmail(result.email);
    }).catch(() => { if (active) setError(en ? "We could not check your session. Please try signing in again." : "Sesi belum bisa diperiksa. Coba login kembali."); });
    return () => { active = false; };
  }, [en, router]);
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setTimeout(() => setRetryAfter(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retryAfter]);
  const send = useCallback(async (resend = false) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/social-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", language: en ? "en" : "id", resend }) });
      const result = await response.json();
      if (!response.ok) throw new Error();
      if (result.verified) { refreshCurrentUser(); router.replace("/new"); return; }
      if (resend) setCode("");
      setRetryAfter(result.retryAfter);
    } catch { setError(en ? "The code could not be sent. Wait a minute and try again." : "Kode belum bisa dikirim. Tunggu sebentar lalu coba lagi."); }
    finally { setBusy(false); }
  }, [en, router]);
  useEffect(() => {
    if (!email) return;
    // The server deduplicates Strict Mode replays and page reloads within the resend interval.
    const start = setTimeout(() => void send(), 0);
    return () => clearTimeout(start);
  }, [email, send]);
  return <Shell sidebar={false}><section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-24"><h1 className="text-2xl font-semibold">{en ? "Verify your sign-in" : "Verifikasi login Anda"}</h1><p className="mt-3 text-sm leading-6 text-white/60">{en ? "Enter the 6-digit code sent to" : "Masukkan kode 6 angka yang dikirim ke"} {email || "…"}.</p><form className="mt-7 space-y-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/social-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", code }) });
      if (!response.ok) {
        setError(response.status === 400
          ? (en ? "Use the most recent six-digit code. Codes expire after 10 minutes." : "Gunakan kode enam angka dari email terbaru. Kode kedaluwarsa setelah 10 menit.")
          : response.status === 429
            ? (en ? "Too many attempts. Wait a minute and try again." : "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.")
            : (en ? "Verification is temporarily unavailable. Please try again." : "Verifikasi sementara tidak tersedia. Coba lagi."));
        return;
      }
      refreshCurrentUser(); router.replace("/new");
    } catch { setError(en ? "Could not connect. Please try verifying again." : "Belum bisa terhubung. Coba verifikasi lagi."); }
    finally { setBusy(false); }
  }}><label className="block text-sm">{en ? "Verification code" : "Kode verifikasi"}<input className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-mono text-xl tracking-[.35em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#74FA6A]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}/></label>{error && <p role="alert" className="text-sm text-red-400">{error}</p>}<button className="btn w-full" disabled={busy || !email || code.length !== 6}>{busy ? (en ? "Please wait…" : "Mohon tunggu…") : (en ? "Verify and continue" : "Verifikasi dan lanjutkan")}</button></form><button type="button" className="mt-5 min-h-11 text-sm text-white/70 disabled:opacity-40" disabled={busy || !email || retryAfter > 0} onClick={() => void send(true)}>{retryAfter > 0 ? (en ? `Resend in ${retryAfter}s` : `Kirim ulang dalam ${retryAfter}d`) : (en ? "Resend code" : "Kirim ulang kode")}</button><button type="button" className="mt-2 min-h-11 text-sm text-white/50" onClick={async () => { await createClient().auth.signOut({ scope: "local" }); clearCurrentUser(); router.replace("/login"); }}>{en ? "Use another account" : "Gunakan akun lain"}</button></section></Shell>;
}
