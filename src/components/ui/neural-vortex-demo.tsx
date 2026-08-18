"use client";

// Demo satu: neural-vortex berjalan di dalam frame Safari dark-mode,
// meniru pengalaman membuka websitenya langsung di browser.
// scrollRef frame disambungkan ke komponen agar progress shader mengikuti
// scroll DI DALAM frame, bukan scroll page utama.

import { useRef } from "react";
import { SafariFrame } from "@/components/ui/safari-browser-frame";
import InteractiveNeuralVortex from "@/components/ui/interactive-neural-vortex-background";

const DemoOne = () => {
  const frameRef = useRef<HTMLDivElement | null>(null);

  return (
    <SafariFrame ref={frameRef} url="immersiavr.app">
      <InteractiveNeuralVortex fill scrollRef={frameRef} />
    </SafariFrame>
  );
};

export { DemoOne };
