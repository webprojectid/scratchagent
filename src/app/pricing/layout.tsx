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
    images: [{
      url: "/opengraph-image.jpg",
      width: 2048,
      height: 1076,
      alt: "Scratch Agent — From ideas to execution.",
    }],
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
