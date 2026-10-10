"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";

import { useState, useSyncExternalStore } from "react";
import { accountBadges, type AccountMembership } from "@/lib/account-membership";
import s from "./account-badges.module.css";

function subscribeMotion(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener("scratch:preferences", update);
  window.addEventListener("focus", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("scratch:preferences", update);
    window.removeEventListener("focus", update);
  };
}

function readBadgeMotion(): "system" | "animated" | "reduced" {
  try {
    const preferences = JSON.parse(localStorage.getItem("scratch_account_preferences") || "{}");
    if (preferences.motion === "reduced" || preferences.badgeMotion === "reduced") return "reduced";
    return preferences.badgeMotion === "animated" ? "animated" : "system";
  } catch { return "system"; }
}

export function AccountBadges({ account, reducedMotion = false, compact = false }: {
  account: AccountMembership; reducedMotion?: boolean; compact?: boolean;
}) {
  useUiLanguage();
  const motion = useSyncExternalStore(subscribeMotion, readBadgeMotion, () => "system" as const);
  const [motionKey, setMotionKey] = useState(0);
  const replayMotion = () => {
    if (!reducedMotion && motion !== "reduced") setMotionKey(key => key + 1);
  };

  return (
    <span
      className={`${s.badges} ${compact ? s.compact : ""}`}
      data-motion={reducedMotion ? "reduced" : motion}
      aria-label={ui("Role dan paket akun")}
      onPointerEnter={replayMotion}
      onPointerDown={replayMotion}
    >
      {accountBadges(account).map(kind => (
        <span
          key={kind}
          className={`${s.badge} ${s[kind]}`}
          data-account-badge={kind}
          title={kind === "admin" ? "Role administrator; terpisah dari paket langganan" : kind === "pro" ? "Langganan Scratch Pro aktif" : kind === "free" ? "Paket Scratch Free" : ui("Status paket belum terverifikasi")}
        >
          {kind !== "pending" && (
            <span className={s.iconTile} aria-hidden="true">
              <svg key={`${kind}-${motionKey}`} className={s.icon} viewBox="0 0 20 20" fill="currentColor" focusable="false">
                {kind === "free" ? (
                  <rect className={s.freeLine} x="3" y="8.5" width="14" height="3" rx=".5" />
                ) : kind === "pro" ? (
                  <>
                    <rect className={s.proBar} x="5" y="3" width="3.5" height="14" rx=".5" />
                    <rect className={s.proBar} x="11.5" y="3" width="3.5" height="14" rx=".5" />
                  </>
                ) : (
                  <>
                    <rect className={s.adminCell} x="3" y="3" width="5.5" height="5.5" rx=".6" />
                    <rect className={s.adminCell} x="11.5" y="3" width="5.5" height="5.5" rx=".6" />
                    <rect className={s.adminCell} x="3" y="11.5" width="5.5" height="5.5" rx=".6" />
                    <rect className={s.adminCell} x="11.5" y="11.5" width="5.5" height="5.5" rx=".6" />
                  </>
                )}
              </svg>
            </span>
          )}
          <span className={s.label}>{kind === "pending" ? ui("Belum terverifikasi") : kind.toUpperCase()}</span>
          {kind === "pro" && <span className={s.signalDot} aria-hidden="true" />}
        </span>
      ))}
    </span>
  );
}
