"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { LanguageToggle } from "@/components/lang-toggle";
import { useLang } from "@/lib/lang";
import { t, type NavKey, type CtaKey } from "@/lib/i18n";

/** Halaman tempat lo jualan API key, dibuka di tab baru. */
export const API_KEY_STORE_URL = "https://scratchagent.store/";

// Nav header halaman publik (pricing/solutions/docs) sebagai client component
// supaya label link dan CTA ikut berganti bahasa saat LanguageToggle diklik.
export function HeaderNav({
  links,
  ctaHref,
  ctaKey,
}: {
  links: NavKey[];
  ctaHref: string;
  ctaKey: CtaKey;
}) {
  const lang = useLang();
  return (
    <div className="flex items-center gap-5 font-mono text-[12px] text-white/60">
      {links.map((key) => (
        <Link key={key} href={`/${key}`} className="transition-colors hover:text-[#74FA6A]">
          {t("nav", key, lang)}
        </Link>
      ))}
      <a
        href={API_KEY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[#74FA6A] transition-colors hover:text-[#A8FF9B]"
      >
        <KeyRound size={13} strokeWidth={2.2} aria-hidden="true" />
        Api Key
      </a>
      <LanguageToggle />
      <Link
        href={ctaHref}
        className="rounded-full bg-[#74FA6A] px-3.5 py-1.5 font-semibold text-black transition hover:bg-[#A8FF9B]"
      >
        {t("cta", ctaKey, lang)}
      </Link>
    </div>
  );
}
