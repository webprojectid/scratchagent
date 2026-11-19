"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { ChromeArcs } from "@/components/ui/chrome-arcs";
import styles from "./site-background.module.css";

const arcsStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  background: "#090a0a",
  opacity: 0.68,
};

/** Persistent ChromeArcs canvas for the planning and generation routes. Because it lives in the
 *  root layout, client-side navigation between those routes never remounts the WebGL canvas. */
export function SiteBackground() {
  const pathname = usePathname();
  const active = pathname === "/new" || pathname.startsWith("/new/") || pathname === "/generate" || pathname.startsWith("/generate/");
  if (!active) return null;

  return (
    <>
      <ChromeArcs
        aria-hidden="true"
        interactive={false}
        speed={0.2}
        intensity={0.45}
        style={arcsStyle}
      />
      <div className={styles.scrim} aria-hidden="true" />
    </>
  );
}
