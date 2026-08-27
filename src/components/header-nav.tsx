"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { LanguageToggle } from "@/components/lang-toggle";
import { useLang } from "@/lib/lang";
import { t, type NavKey, type CtaKey } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/current-user";

/** Halaman tempat lo jualan API key, dibuka di tab baru. */
export const API_KEY_STORE_URL = "https://scratchagent.store/";

// Nav header halaman publik (pricing/solutions/docs) sebagai client component
// supaya label link dan CTA ikut berganti bahasa saat LanguageToggle diklik
// serta mendeteksi status login pengguna secara otomatis.
export function HeaderNav({
  links,
  ctaHref,
  ctaKey,
}: {
  links: NavKey[];
  ctaHref?: string;
  ctaKey?: CtaKey;
}) {
  const lang = useLang();
  const { user } = useCurrentUser();
  const loggedIn = !!user;

  const resolvedHref = ctaHref ?? (loggedIn ? "/new" : "/login");
  const resolvedKey: CtaKey = ctaKey ?? (loggedIn ? "createPlan" : "login");

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-white/60">
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
      {loggedIn && (
        <Link href="/profile" className="text-white/80 transition-colors hover:text-[#74FA6A]">
          {t("nav", "profile", lang)}
        </Link>
      )}
      <LanguageToggle />
      <Link
        href={resolvedHref}
        className="rounded-full bg-[#74FA6A] px-3.5 py-1.5 font-semibold text-black transition hover:bg-[#A8FF9B]"
      >
        {t("cta", resolvedKey, lang)}
      </Link>
    </div>
  );
}
