"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";
import { createClient } from "@/lib/supabase/client";
import { useUiLanguage } from "@/lib/ui-text";
import { Shell } from "@/components/brand";

function ForgotPasswordForm() {
  const expired = useSearchParams().get("expired") === "1";
  const en = useUiLanguage() === "en";
  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState<string>();
  const [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState("");
  return <Shell sidebar={false} back="/login"><section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-24"><h1 className="text-2xl font-semibold">{en ? "Reset your password" : "Atur ulang password"}</h1><p className="mt-3 text-sm leading-6 text-white/60">{en ? "Enter your account email. We will send you a link to choose a new password." : "Masukkan email akun Anda. Kami akan mengirim link untuk membuat password baru."}</p>{expired && <p role="alert" className="mt-5 text-sm text-amber-300">{en ? "That reset link is invalid or has expired. Request a new link below." : "Link reset tidak valid atau sudah kedaluwarsa. Minta link baru di bawah."}</p>}{sent ? <p role="status" className="mt-6 text-sm leading-6">{en ? "If this email is eligible for password recovery, a reset link will arrive shortly. Check your spam folder too." : "Jika email ini dapat dipulihkan, link reset akan segera dikirim. Periksa juga folder spam."}</p> : <form className="mt-7 space-y-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/recovery`, captchaToken: captcha });
      if (result.error) throw new Error();
      setSent(true);
    } catch { setError(en ? "We could not request a reset link. Wait a moment, then reload this page and try again." : "Link reset belum bisa diminta. Tunggu sebentar, muat ulang halaman, lalu coba lagi."); }
    finally { setBusy(false); }
  }}><label className="block text-sm">Email<input type="email" autoComplete="email" required maxLength={320} value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3"/></label>{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} onSuccess={setCaptcha} onExpire={() => setCaptcha(undefined)} onError={() => setCaptcha(undefined)} options={{ theme: "dark" }}/>}<button className="btn w-full" disabled={busy || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captcha)}>{busy ? (en ? "Sending…" : "Mengirim…") : (en ? "Send reset link" : "Kirim link reset")}</button>{error && <p role="alert" className="text-sm text-red-400">{error}</p>}</form>}<Link href="/login" className="mt-6 py-3 text-sm text-white/60">{en ? "Back to sign in" : "Kembali ke login"}</Link></section></Shell>;
}

export default function ForgotPassword() {
  return <Suspense fallback={<Shell sidebar={false}><p className="mx-auto max-w-md px-6 py-24">Loading…</p></Shell>}><ForgotPasswordForm/></Suspense>;
}
