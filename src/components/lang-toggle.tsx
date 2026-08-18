"use client";

import { useLang, setLang, type Lang } from "@/lib/lang";

const OPTIONS: { value: Lang; label: string; name: string }[] = [
  { value: "id", label: "ID", name: "Bahasa Indonesia" },
  { value: "en", label: "EN", name: "English (US)" },
];

export function LanguageToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div
      role="group"
      aria-label="Pilih bahasa"
      className={`flex items-center rounded-full border border-white/10 bg-white/[.03] p-0.5 ${className}`}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.name}
          aria-pressed={lang === opt.value}
          onClick={() => setLang(opt.value)}
          className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.06em] transition-colors ${
            lang === opt.value ? "text-[#74FA6A]" : "text-white/45 hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
