import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pricing · Scratch Agent",
  description:
    "Start with Free and upgrade when you need more. Compare ScratchAgent Free and Pro for solo developers, freelancers, and agencies.",
  openGraph: {
    title: "Pricing · Scratch Agent",
    description:
      "Start with Free and upgrade when you need more. Compare ScratchAgent Free and Pro for solo developers, freelancers, and agencies.",
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
