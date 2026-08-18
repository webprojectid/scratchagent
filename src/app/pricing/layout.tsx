import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pricing · Scratch Agent",
  description:
    "Mulai dari paket Free, upgrade saat butuh lebih. Free dan Pro untuk solo dev, freelancer, dan agency.",
  openGraph: {
    title: "Pricing · Scratch Agent",
    description:
      "Mulai dari paket Free, upgrade saat butuh lebih. Free dan Pro untuk solo dev, freelancer, dan agency.",
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
