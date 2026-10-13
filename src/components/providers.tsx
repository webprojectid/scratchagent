"use client";
import { MotionConfig } from "motion/react";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { AccountPreferenceSync } from "./account-preference-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}><MotionConfig reducedMotion="user"><SessionProvider><AccountPreferenceSync/>{children}</SessionProvider></MotionConfig></ThemeProvider>;
}
