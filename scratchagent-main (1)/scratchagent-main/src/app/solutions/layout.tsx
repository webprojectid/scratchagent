import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Solutions · Scratch Agent",
  description:
    "Untuk solo dev, freelancer, agency, dan operator agent coding. Lihat bagaimana Scratch Agent mengubah brief jadi plan siap eksekusi.",
};

export default function SolutionsLayout({ children }: { children: ReactNode }) {
  return children;
}
