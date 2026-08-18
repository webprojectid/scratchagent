"use client";

// Demo: galaxy hero berjalan di dalam frame Safari dark-mode.
// scrollRef frame viewport disambungkan ke HeroSection supaya parallax
// screenshot + fade hero content bergerak mengikuti scroll di dalam frame,
// bukan scroll page utama.

import { useRef } from "react";
import { SafariFrame } from "@/components/ui/safari-browser-frame";
import { HeroSection } from "@/components/ui/galaxy-interactive-hero-section";

export function HeroSectionBasic() {
  const viewportRef = useRef<HTMLDivElement>(null);

  return (
    <SafariFrame ref={viewportRef} className="w-full">
      <HeroSection scrollRef={viewportRef} height="fill" />
    </SafariFrame>
  );
}
