"use client";

// Demo tiga: SaaS template berjalan di dalam frame Safari dark-mode.

import { SafariFrame } from "@/components/ui/safari-browser-frame";
import SaasTemplate from "@/components/ui/saa-s-template";

const DemoSaas = () => {
  return (
    <SafariFrame url="template.app" ratio="desktop">
      <SaasTemplate />
    </SafariFrame>
  );
};

export { DemoSaas };
