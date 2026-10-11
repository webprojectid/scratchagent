"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { AccountPreferenceSync } from "./account-preference-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange><SessionProvider><AccountPreferenceSync/>{children}</SessionProvider></ThemeProvider>;
}
