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
    <div className="mt-8 rounded-xl border border-white/[.08] bg-white/[.04] p-4">
      <p className="mb-2 font-mono text-[9px] uppercase tracking-[.18em] text-[#5C6A7A]">Sample Prompt</p>
      <p className="text-[12px] leading-[1.65] text-[#8C97A5]">{prompt}</p>
      <button
        onClick={handleCopy}
        className={`mt-3 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
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
