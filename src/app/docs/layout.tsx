import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Docs · Scratch Agent",
  description: "Explore the ScratchAgent quickstart, product plans, agent prompts, and FAQs. Get started with the Free plan.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}
