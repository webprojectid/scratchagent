"use client";
import { useCallback, useEffect, useState } from "react";
import { defaultAccountSettings, type AccountSettings, type DisplaySettings } from "@/lib/account-preferences";
import { setLang } from "@/lib/lang";
export function applyDisplaySettings(display: DisplaySettings) {
  document.documentElement.dataset.colorStyle = display.colorStyle ?? "scratch";
  localStorage.setItem("scratch_account_preferences", JSON.stringify(display));
  document.documentElement.dataset.accountTextSize = display.textSize;
  document.documentElement.dataset.accountMotion = display.motion;
  setLang(display.language);
  window.dispatchEvent(new Event("scratch:preferences"));
}
export function useAccountSettings(email?: string, preview = false) {
  const [data, setData] = useState<AccountSettings>(defaultAccountSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    await Promise.resolve();
    if (signal?.aborted) return;
    if (!email) return;
    setLoading(true); setError("");
    try {
      if (preview) { setData(structuredClone(defaultAccountSettings)); return; }
      const response = await fetch(`/api/account/settings?userId=${encodeURIComponent(email)}`, { signal, cache: "no-store" });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setData(result); try { applyDisplaySettings(result.display); } catch { /* Server preferences remain saved when browser storage is unavailable. */ }
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Pengaturan belum bisa dimuat."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [email, preview]);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => load(controller.signal)); return () => controller.abort(); }, [load]);
  async function save<K extends keyof AccountSettings>(category: K, value: AccountSettings[K]) {
    if (error || loading) throw new Error("Muat pengaturan akun sebelum menyimpan perubahan.");
    let result = { ...data, [category]: value };
    if (!preview) {
      const response = await fetch(`/api/account/settings?userId=${encodeURIComponent(email ?? "")}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [category]: value }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error); result = body;
    }
    setData(result);
    if (category === "display") {
      if (preview) { setLang(result.display.language, false); document.documentElement.dataset.colorStyle = result.display.colorStyle; }
      else { try { applyDisplaySettings(result.display); } catch { /* Optional local cache. */ } }
    }
    return result;
  }
  return { data, loading, error, reload: () => load(), save };
}
