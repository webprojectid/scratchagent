"use client";

import { useLang, setLang, type Lang } from "@/lib/lang";
import { useState } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { uiText as ui } from "@/lib/ui-text";
import { displaySettingsSchema } from "@/lib/account-preferences";

const OPTIONS: { value: Lang; label: string; name: string }[] = [
  { value: "id", label: "ID", name: "Bahasa Indonesia" },
  { value: "en", label: "EN", name: "English (US)" },
];

export function LanguageToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function changeLanguage(language: Lang) {
    setBusy(true); setError("");
    try {
      const user = await getCurrentUser();
      if (user && !new URLSearchParams(location.search).has("preview")) {
        const url = `/api/account/settings?userId=${encodeURIComponent(user.email)}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const account = await response.json();
        const display = displaySettingsSchema.parse(account.display);
        const saved = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display: { ...display, language } }) });
        if (!saved.ok) throw new Error();
      }
      setLang(language);
    } catch { setError(ui("Your language could not be saved.")); }
    finally { setBusy(false); }
  }
  return (
    <div
      role="group"
      aria-label={ui("Pilih bahasa")}
      className={`flex items-center rounded-full border border-white/10 bg-white/[.03] p-0.5 ${className}`}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.name}
          aria-pressed={lang === opt.value}
          disabled={busy}
          onClick={() => void changeLanguage(opt.value)}
          className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] transition-colors ${
            lang === opt.value ? "text-[#74FA6A]" : "text-white/45 hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
      {error && <span role="alert" className="sr-only">{error}</span>}
    </div>
  );
}
