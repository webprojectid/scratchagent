import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteOpenGraph } from "@/lib/site-metadata";

export const metadata: Metadata = {
  alternates: { canonical: "/pricing" },
  title: "Pricing · Scratch Agent",
  description:
    "Start with Free and upgrade when you need more. Compare ScratchAgent Free and Pro for solo developers, freelancers, and agencies.",
  openGraph: {
    ...siteOpenGraph,
    url: "/pricing",
    title: "Pricing · Scratch Agent",
    description:
      "Start with Free and upgrade when you need more. Compare ScratchAgent Free and Pro for solo developers, freelancers, and agencies.",
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
