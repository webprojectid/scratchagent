import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./color-styles.css";
import { Providers } from "@/components/providers";
import { langInitScript } from "@/lib/lang";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Scratch Agent",
  description: "Hire your AI agent.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-US"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: langInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: "try{var p=JSON.parse(localStorage.getItem('scratch_account_preferences')||'{}');if(['scratch','blue','violet','amber','rose'].includes(p.colorStyle))document.documentElement.dataset.colorStyle=p.colorStyle}catch(e){}" }} />
      </head>
      <body className="min-h-full flex flex-col"><Providers>{children}</Providers></body>
    </html>
  );
}
