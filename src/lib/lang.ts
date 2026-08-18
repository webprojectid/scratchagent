"use client";

// Store bahasa ringan tanpa dependensi: pilihan disimpan di localStorage,
// atribut <html lang> ikut diset, dan semua komponen berlangganan via hook.
// Default "id". Render pertama selalu "id" supaya tidak mismatch dengan SSR;
// setelah mount, nilai localStorage baru dipakai.

import { useEffect, useState } from "react";

export type Lang = "id" | "en";

const STORAGE_KEY = "***";
const listeners = new Set<() => void>();
let cache: Lang | null = null;

function read(): Lang {
  if (cache) return cache;
  if (typeof window === "undefined") return "id";
  try {
    cache = window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "id";
  } catch {
    cache = "id";
  }
  return cache;
}

export function getLang(): Lang {
  return read();
}

export function setLang(lang: Lang) {
  cache = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // storage tidak tersedia (private mode), abaikan
  }
  document.documentElement.lang = lang === "en" ? "en" : "id";
  listeners.forEach((fn) => fn());
}

export function useLang(): Lang {
  const [lang, setLangState] = useState<Lang>("id");
  useEffect(() => {
    const sync = () => setLangState(read());
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return lang;
}

/** Script inline di <head>: set <html lang> dari localStorage sebelum paint,
 *  supaya tidak ada kilatan bahasa yang salah saat halaman dimuat. */
export const langInitScript = `(function(){try{if(localStorage.getItem('${STORAGE_KEY}')==='en'){document.documentElement.lang='en'}}catch(e){}})();`;
