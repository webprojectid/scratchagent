"use client";

import { useState } from "react";
import Link from "next/link";
import { clearCurrentUser } from "@/lib/current-user";
import { useUiLanguage } from "@/lib/ui-text";
import { Shell } from "@/components/brand";
import AuthChangePassword from "@/components/ui/auth-change-password";

export default function ResetPassword() {
  const en = useUiLanguage() === "en";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  return <Shell sidebar={false}>
    <section className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-24">
      <AuthChangePassword language={en ? "en" : "id"} isLoading={busy} isSuccess={done} error={error}
        successAction={<Link href="/login" className="btn">{en ? "Sign in" : "Login"}</Link>}
        footer={<Link className="block py-3 text-sm text-white/70 underline-offset-4 hover:underline" href="/forgot-password">{en ? "Request a new reset link" : "Minta link reset baru"}</Link>}
        onSubmit={async ({ newPassword }) => {
          setError("");
          setBusy(true);
          try {
            const result = await fetch("/api/auth/password-reset", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: newPassword }),
            });
            if (!result.ok) throw new Error();
            clearCurrentUser();
            setDone(true);
            return true;
          } catch {
            setError(en ? "The reset link may have expired, or the password was not accepted. Request a new link or choose a different password." : "Link reset mungkin kedaluwarsa atau password tidak diterima. Minta link baru atau pilih password lain.");
            return false;
          } finally { setBusy(false); }
        }}
      />
    </section>
  </Shell>;
}
