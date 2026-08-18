import type { Lang } from "./lang";

// Kamus terjemahan untuk elemen publik (nav header, CTA, footer ringkas).
// Kunci stabil dalam bahasa Indonesia; nilai berisi pasangan id/en.
type Entry = { id: string; en: string };

export const dict = {
  nav: {
    pricing: { id: "Harga", en: "Pricing" },
    solutions: { id: "Solusi", en: "Solutions" },
    docs: { id: "Docs", en: "Docs" },
    profile: { id: "Profil", en: "Profile" },
    login: { id: "Masuk", en: "Login" },
  },
  cta: {
    login: { id: "Masuk", en: "Login" },
    createPlan: { id: "Buat plan", en: "Create plan" },
    startFree: { id: "mulai dari paket Free", en: "start with the Free plan" },
    start: { id: "Mulai", en: "Start" },
    seeDemo: { id: "Lihat demo", en: "Watch demo" },
    examplePlan: { id: "contoh plan", en: "example plan" },
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
