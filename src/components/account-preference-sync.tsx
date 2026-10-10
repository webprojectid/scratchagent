"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/current-user";
import { displaySettingsSchema } from "@/lib/account-preferences";
import { applyDisplaySettings } from "./account-settings-state";

export function AccountPreferenceSync() {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const email = user?.email;
  useEffect(() => {
    if (!email || new URLSearchParams(location.search).has("preview")) return;
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
