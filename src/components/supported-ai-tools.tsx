"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

interface AiTool {
  name: string;
  icon: React.ReactNode; // SVG brand icon or local image
  containerStyle?: string;
}

/* ─── Faithful SVG brand icons ───────────────────────────────────────── */

// Anthropic Claude — terracotta starfish logo
const ClaudeIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="size-6">
    <path d="M24 4l3.5 11.5L38 9l-7 10 12 2-11.5 3.5L36 36l-10-7-2 12-2-12-10 7 4.5-11.5L4 26l12-2-7-10 10.5 6.5L24 4z"
      fill="#CC785C" />
  </svg>
);

// OpenAI — black and white swirl (Codex uses OpenAI API)
const OpenAIIcon = () => (
  <svg viewBox="0 0 24 24" className="size-6" fill="white">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.759a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.05 14.518A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.843-3.37 2.019-1.168a.076.076 0 0 1 .071 0l4.767 2.752a4.5 4.5 0 0 1-.69 8.118v-5.68a.79.79 0 0 0-.324-.652zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.767-2.752a4.5 4.5 0 0 1 6.693 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L9.7 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

// Cursor — 3D isometric cube
const CursorIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" className="size-7">
    <path d="M16 2L2 10v12l14 8 14-8V10L16 2z" fill="#1A1A1A" />
    <path d="M16 2L2 10l14 8 14-8L16 2z" fill="#2D2D2D" />
    <path d="M2 10v12l14 8V18L2 10z" fill="#141414" />
    <path d="M30 10v12l-14 8V18L30 10z" fill="#3A3A3A" />
    <path d="M16 2l14 8-14 8L2 10l14-8z" stroke="#555" strokeWidth="0.5" />
  </svg>
);

// Cline — robot face icon
const ClineIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <rect width="40" height="40" rx="8" fill="white" />
    <rect x="7" y="11" width="26" height="20" rx="5" fill="#111" />
    <rect x="3" y="16" width="4" height="10" rx="2" fill="#111" />
    <rect x="33" y="16" width="4" height="10" rx="2" fill="#111" />
    <circle cx="14" cy="21" r="3.5" fill="white" />
    <circle cx="26" cy="21" r="3.5" fill="white" />
    <circle cx="14" cy="21" r="1.5" fill="#111" />
    <circle cx="26" cy="21" r="1.5" fill="#111" />
  </svg>
);

// Aider — green terminal with chevron
const AiderIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <rect width="40" height="40" rx="10" fill="#059669" />
    <path d="M8 22l6-6-6-6" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 28h14" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

// Goose CLI — Block orange goose bird
const GooseIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <rect width="40" height="40" rx="10" fill="#EA580C" />
    <ellipse cx="20" cy="23" rx="10" ry="8" fill="white" />
    <ellipse cx="20" cy="14" rx="5" ry="5" fill="white" />
    <path d="M25 13c2-1 5-1 6 1" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 29l-4 5M26 29l4 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="22" cy="13" r="1" fill="#EA580C" />
  </svg>
);

// Roo Code — cyan coding roo
const RooIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <rect width="40" height="40" rx="10" fill="#0891B2" />
    <path d="M10 28l8-8-8-8" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 28h10" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

// OpenHands — purple palm hand
const OpenHandsIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <rect width="40" height="40" rx="10" fill="url(#ohGrad)" />
    <defs>
      <linearGradient id="ohGrad" x1="0" y1="0" x2="40" y2="40">
        <stop stopColor="#9333EA" />
        <stop offset="1" stopColor="#C026D3" />
      </linearGradient>
    </defs>
    <path d="M20 30V18M16 30V20M12 30V23M24 30V20M28 30V23" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <path d="M12 23c0-1.5 1-2 2-2s2 .5 2 2v-3c0-1.5 1-2 2-2s2 .5 2 2v-2c0-1.5 1-2 2-2s2 .5 2 2v3c0-1.5 1-2 2-2s2 .5 2 2v7H12v-7z" fill="white" fillOpacity="0.9" />
  </svg>
);

// OpenCode — white square on dark
const OpenCodeIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <rect width="40" height="40" rx="8" fill="#0F172A" />
    <rect x="10" y="10" width="20" height="20" rx="3" fill="white" />
  </svg>
);

// Kilo CLI — bold monospace wordmark
const KiloIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <rect width="40" height="40" rx="8" fill="black" />
    <rect x="7" y="7" width="26" height="26" rx="4" fill="none" stroke="white" strokeWidth="2.5" />
    <text x="20" y="19" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="10" fontWeight="900">KI</text>
    <text x="20" y="32" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="10" fontWeight="900">LO</text>
  </svg>
);

// OpenClaw — red crab
const OpenClawIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <rect width="40" height="40" rx="20" fill="#DC2626" />
    <ellipse cx="20" cy="22" rx="9" ry="7" fill="#FCA5A5" />
    <path d="M11 22c-3-2-5-6-3-9 2 1 3 4 3 6M29 22c3-2 5-6 3-9-2 1-3 4-3 6" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="16" cy="20" r="2" fill="#DC2626" />
    <circle cx="24" cy="20" r="2" fill="#DC2626" />
    <path d="M14 29l-2 4M26 29l2 4M20 30v4" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Qwen — purple ribbon logo
const QwenIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="size-7">
    <circle cx="20" cy="20" r="20" fill="#6366F1" />
    <path d="M20 6c-5 0-9 4-9 9 0 3.5 1.8 6.5 4.5 8l-3 7c-3.5-2-6-5.5-6-9.5 0-7.7 6.3-14 14-14s14 6.3 14 14c0 4-2.5 7.5-6 9.5l-3-7c2.7-1.5 4.5-4.5 4.5-8 0-5-4-9-9-9z" fill="white" />
  </svg>
);

const AI_TOOLS: AiTool[] = [
  { name: "Qwen Code", icon: <QwenIcon />, containerStyle: "bg-[#6366F1]" },
  { name: "Cline", icon: <ClineIcon />, containerStyle: "bg-[#1C1C1E]" },
  { name: "Claude Code", icon: <Image src="/logos/claude.png" alt="Claude" width={28} height={28} className="size-7 object-contain" />, containerStyle: "bg-[#CC785C]" },
  { name: "Cursor", icon: <CursorIcon />, containerStyle: "bg-[#111111]" },
  { name: "OpenCode", icon: <OpenCodeIcon />, containerStyle: "bg-[#0F172A]" },
  { name: "Codex", icon: <OpenAIIcon />, containerStyle: "bg-[#111111]" },
  { name: "Kilo CLI", icon: <KiloIcon />, containerStyle: "bg-[#000000]" },
  { name: "OpenClaw", icon: <OpenClawIcon />, containerStyle: "bg-[#DC2626]" },
  { name: "Aider CLI", icon: <AiderIcon />, containerStyle: "bg-[#059669]" },
  { name: "Goose CLI", icon: <GooseIcon />, containerStyle: "bg-[#EA580C]" },
  { name: "Roo Code", icon: <RooIcon />, containerStyle: "bg-[#0891B2]" },
  { name: "OpenHands", icon: <OpenHandsIcon />, containerStyle: "bg-[#7C3AED]" },
];

export function SupportedAiTools() {
  return (
    <section className="relative mx-auto max-w-[1360px] px-5 py-20 md:px-10 md:py-28" aria-label="Supported AI Tools">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[640px] rounded-full bg-[radial-gradient(circle_at_center,rgba(116,250,106,0.06),transparent_70%)] blur-3xl" />

      <div className="relative mx-auto flex max-w-[840px] flex-col items-center text-center">
        <h2 className="text-balance text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.05] tracking-[-.05em] text-[#F0F3F5]">
          Supported AI Tools
        </h2>
        <p className="mt-3.5 max-w-[62ch] text-[14px] leading-relaxed text-[#8C97A5] md:text-[15px]">
          Token Plan works with mainstream tools that support OpenAI and Anthropic protocols{" "}
          <Link href="/docs" className="inline-flex items-center gap-1 font-medium text-[#74FA6A] underline-offset-4 transition-all hover:text-[#A8FF9B] hover:underline">
            Learn More <ArrowUpRight size={14} className="inline" />
          </Link>
        </p>
      </div>

      <div className="relative mt-14 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {AI_TOOLS.map((tool, idx) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.45, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex items-center gap-3.5 overflow-hidden rounded-[20px] border border-white/[0.12] bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] px-4 py-3.5 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_12px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.28] hover:bg-white/[0.09] hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.35),0_18px_45px_-10px_rgba(0,0,0,0.65)]"
          >
            {/* Top Gloss Highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:via-white/60" />

            {/* Brand Icon Container */}
            <div
              className={`relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/[0.15] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-105 ${tool.containerStyle ?? "bg-white/[0.08]"}`}
            >
              {tool.icon}
            </div>

            {/* Tool Name */}
            <span className="flex-1 truncate text-[14.5px] font-semibold tracking-[-0.01em] text-[#F1F5F9] transition-colors group-hover:text-white">
              {tool.name}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
