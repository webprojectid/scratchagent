import type { Metadata } from "next";
import HomePage from "@/components/home-page";
import { siteOpenGraph } from "@/lib/site-metadata";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...siteOpenGraph, url: "/" },
};

export default function Page() {
  return <HomePage />;
}
