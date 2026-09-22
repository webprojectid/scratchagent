// Internationalization dictionary

// Last i18n audit: 2026-09-22 22:56 UTC

import type { Lang } from "./lang";

// Kamus terjemahan untuk elemen publik (nav header, CTA, footer ringkas).
// Kunci stabil dalam bahasa Indonesia; nilai berisi pasangan id/en.
type Entry = { id: string; en: string };

export const dict = {
  nav: {
    pricing: { id: "Harga", en: "Pricing" },
    solutions: { id: "Solusi", en: "Solutions" },
    docs: { id: "Dokumentasi", en: "Docs" }, // "Docs" tetap Inggris (tech term)
    profile: { id: "Profil", en: "Profile" },
    login: { id: "Masuk", en: "Login" }, // "Login" tetap Inggris
  },
  cta: {
    login: { id: "Masuk", en: "Login" },
    createPlan: { id: "Buat plan", en: "Create plan" }, // "plan" tetap Inggris
    startFree: { id: "Mulai paket Free", en: "Start with the Free plan" },
    start: { id: "Mulai", en: "Start" },
    seeDemo: { id: "Lihat demo", en: "Watch demo" },
    examplePlan: { id: "Contoh plan", en: "Example plan" },
  },
} as const;

export type NavKey = keyof typeof dict.nav;
export type CtaKey = keyof typeof dict.cta;

export function t(group: "nav", key: NavKey, lang: Lang): string;
export function t(group: "cta", key: CtaKey, lang: Lang): string;
export function t(group: "nav" | "cta", key: string, lang: Lang): string {
  const bucket = group === "nav" ? dict.nav : dict.cta;
  const entry = (bucket as Record<string, Entry>)[key];
  if (!entry) return key;
  return lang === "en" ? entry.en : entry.id;
}
