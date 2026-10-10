"use client";

// Store bahasa ringan tanpa dependensi: pilihan disimpan di localStorage,
// atribut <html lang> ikut diset, dan semua komponen berlangganan via hook.
// English (US) is the default; explicit Indonesian choices survive reloads.

import { useEffect, useState } from "react";

export type Lang = "id" | "en";

const STORAGE_KEY = "scratch_language";
const LEGACY_KEY = "***";
const listeners = new Set<() => void>();
let cache: Lang | null = null;

function read(): Lang {
  if (cache) return cache;
  if (typeof window === "undefined") return "en"; // Default to English!
  try {
    cache = (window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY)) === "id" ? "id" : "en";
  } catch {
    cache = "en"; // Fallback to English!
  }
  return cache;
}

export function getLang(): Lang {
  // Match the server render until the language hook mounts.
  return cache ?? "en";
}

export function setLang(lang: Lang, persist = true) {
  cache = lang;
  if (persist) {
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch { /* The current page still follows the selected language. */ }
  }
  document.documentElement.lang = lang === "en" ? "en-US" : "id";
  if (persist) document.cookie = `scratch_language=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  listeners.forEach((fn) => fn());
}

export function useLang(): Lang {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const sync = () => setLangState(read());
    sync();
    listeners.add(sync);
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) { cache = null; sync(); } };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return lang;
}

/** Script inline di <head>: set <html lang> dari localStorage sebelum paint,
 *  supaya tidak ada kilatan bahasa yang salah saat halaman dimuat. */
export const langInitScript = `(function(){try{document.documentElement.lang=(localStorage.getItem('${STORAGE_KEY}')??localStorage.getItem('${LEGACY_KEY}'))==='id'?'id':'en-US'}catch(e){document.documentElement.lang='en-US'}})();`;
