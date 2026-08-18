import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Docs · Scratch Agent",
  description: "Quickstart, konsep plan, prompt agent, dan FAQ Scratch Agent. Mulai dari paket Free.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}
