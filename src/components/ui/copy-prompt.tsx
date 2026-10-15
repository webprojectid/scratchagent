"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mt-6 rounded-xl border border-white/[.08] bg-white/[.04] p-5">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#9CA9A0]">Sample Prompt</p>
      <p className="text-[14px] leading-[1.65] text-[#A9B3AE]">{prompt}</p>
      <button
        onClick={handleCopy}
        className={`mt-4 flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition-all duration-200 ${
          copied
            ? "bg-[#74FA6A]/15 text-[#74FA6A]"
            : "bg-white/[.06] text-[#9CA9B8] hover:bg-white/[.10] hover:text-[#E8F0E8]"
        }`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied!" : "Copy prompt"}
      </button>
    </div>
  );
}
