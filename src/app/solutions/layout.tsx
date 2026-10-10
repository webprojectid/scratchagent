import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Solutions · Scratch Agent",
  description:
    "See how ScratchAgent turns product briefs into implementation plans for solo developers, freelancers, agencies, and teams working with coding agents.",
};

export default function SolutionsLayout({ children }: { children: ReactNode }) {
  return children;
}
