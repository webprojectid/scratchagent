"use client";
import { useState } from "react";
import Link from "next/link";
import { clearCurrentUser } from "@/lib/current-user";
import { useUiLanguage } from "@/lib/ui-text";
import { Shell } from "@/components/brand";

export default function ResetPassword() {
  const en = useUiLanguage() === "en";
  const [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState("");
  return <Shell sidebar={false}><section className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-24"><h1 className="text-2xl font-semibold">{en ? "Choose a new password" : "Buat password baru"}</h1>{done ? <><p role="status" className="mt-5 text-sm">{en ? "Your password has been updated. Sign in with your new password." : "Password berhasil diubah. Login dengan password baru Anda."}</p><Link href="/login" className="btn mt-6">{en ? "Sign in" : "Login"}</Link></> : <form className="mt-7 space-y-5" onSubmit={async event => {
    event.preventDefault(); setError("");
    if (password !== confirm) { setError(en ? "Passwords do not match." : "Password tidak sama."); return; }
    setBusy(true);
    try {
      const result = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!result.ok) throw new Error();
      clearCurrentUser(); setPassword(""); setConfirm(""); setDone(true);
    } catch { setError(en ? "The reset link may have expired, or the password was not accepted. Request a new link or choose a different password." : "Link reset mungkin kedaluwarsa atau password tidak diterima. Minta link baru atau pilih password lain."); }
    finally { setBusy(false); }
  }}><label className="block text-sm">{en ? "New password" : "Password baru"}<input className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)}/></label><label className="block text-sm">{en ? "Confirm password" : "Konfirmasi password"}<input className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={event => setConfirm(event.target.value)}/></label><button className="btn w-full" disabled={busy}>{busy ? (en ? "Saving…" : "Menyimpan…") : (en ? "Update password" : "Simpan password")}</button>{error && <p role="alert" className="text-sm text-red-400">{error}</p>}<Link className="block py-3 text-sm text-white/60" href="/forgot-password">{en ? "Request a new reset link" : "Minta link reset baru"}</Link></form>}</section></Shell>;
}
