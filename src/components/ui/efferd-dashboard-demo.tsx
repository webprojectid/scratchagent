"use client";

// Demo empat: ScratchDashboard2 berjalan di dalam frame Safari dark-mode.

import { SafariFrame } from "@/components/ui/safari-browser-frame";
import { ScratchDashboard2 } from "@/components/ui/efferd-dashboard-2";

const DemoEfferd = () => {
  return (
    <SafariFrame url="efferd.app/dashboard" ratio="desktop">
      <ScratchDashboard2 />
    </SafariFrame>
  );
};

export { DemoEfferd };
