"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/current-user";
import { displaySettingsSchema } from "@/lib/account-preferences";
import { applyDisplaySettings } from "./account-settings-state";
import { useTheme } from "next-themes";

export function AccountPreferenceSync() {
  const { setTheme } = useTheme();
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const email = user?.email;
  useEffect(() => {
    const sync = () => {
      try {
        const cached = localStorage.getItem("scratch_account_preferences");
        if (!cached) return;
        const parsed = displaySettingsSchema.safeParse(JSON.parse(cached));
        if (parsed.success) { document.documentElement.dataset.colorStyle = "scratch"; setTheme(parsed.data.theme); }
      } catch {}
    };
    sync(); window.addEventListener("storage", sync); window.addEventListener("scratch:preferences", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("scratch:preferences", sync); };
  }, [setTheme]);
  useEffect(() => {
    if (!email || new URLSearchParams(location.search).has("preview")) return;
    let lastBucket: number | null = null;
    const visit = () => {
      if (document.visibilityState !== "visible") return;
      const bucket = Math.floor(Date.now() / 1800_000);
      if (lastBucket === bucket) return;
      lastBucket = bucket;
      void fetch("/api/account/dashboard", { method: "POST" }).then(response => { if (!response.ok) lastBucket = null; }).catch(() => { lastBucket = null; });
    };
    visit();
    const interval = window.setInterval(visit, 1800_000);
    document.addEventListener("visibilitychange", visit);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", visit); };
  }, [email]);
  useEffect(() => {
    if (!email || pathname === "/settings" || pathname === "/profile" || new URLSearchParams(location.search).has("preview")) return;
    const controller = new AbortController();
    fetch("/api/account/settings", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const data = await response.json();
        const display = displaySettingsSchema.safeParse(data.display);
        if (display.success) applyDisplaySettings(display.data);
      })
      .catch(() => { /* The last saved browser preference remains available offline. */ });
    return () => controller.abort();
  }, [email, pathname]);
  return null;
}
