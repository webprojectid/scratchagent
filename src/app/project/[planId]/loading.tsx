"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";
export default function Loading() {
  useUiLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0D0F] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-[#74FA6A]" />
        <span className="font-mono text-xs text-white/50">{ui("Memuat visual roadmap...")}</span>
      </div>
    </div>
  );
}
