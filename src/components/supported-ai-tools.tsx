"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Terminal } from "lucide-react";

interface AiTool {
  name: string;
  category: "cli" | "editor" | "extension";
  iconType: "svg" | "img" | "component";
  iconBg?: string;
  iconBorder?: string;
  customIcon?: React.ReactNode;
}

const AI_TOOLS: AiTool[] = [
  // 8 Tools from user reference
  {
    name: "Qwen Code",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#6366F1]/30 to-[#4338CA]/20",
    iconBorder: "border-[#818CF8]/30",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-5 text-[#818CF8]" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    name: "Cline",
    category: "extension",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-white/20 to-white/5",
    iconBorder: "border-white/25",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 text-white">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
      </svg>
    ),
  },
  {
    name: "Claude Code",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#D97706]/35 to-[#B45309]/20",
    iconBorder: "border-[#F59E0B]/35",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 text-[#F59E0B]">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    ),
  },
  {
    name: "Cursor",
    category: "editor",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-white/25 to-white/5",
    iconBorder: "border-white/30",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-4.5 text-white" stroke="currentColor" strokeWidth="2.2">
        <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="m13 13 6 6" />
      </svg>
    ),
  },
  {
    name: "OpenCode",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-white/20 to-white/5",
    iconBorder: "border-white/25",
    customIcon: (
      <div className="size-4 rounded-[3px] border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
    ),
  },
  {
    name: "Codex",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#3B82F6]/35 to-[#1D4ED8]/20",
    iconBorder: "border-[#60A5FA]/35",
    customIcon: (
      <div className="flex items-center gap-0.5 font-mono text-[11px] font-bold text-[#60A5FA] drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]">
        <span>&gt;_</span>
      </div>
    ),
  },
  {
    name: "Kilo CLI",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#8B5CF6]/35 to-[#6D28D9]/20",
    iconBorder: "border-[#A78BFA]/35",
    customIcon: (
      <div className="rounded-[4px] border border-[#A78BFA] px-1 py-0.5 font-mono text-[8.5px] font-extrabold tracking-wider text-[#A78BFA] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
        KILO
      </div>
    ),
  },
  {
    name: "OpenClaw",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#EF4444]/35 to-[#B91C1C]/20",
    iconBorder: "border-[#F87171]/35",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 text-[#F87171]">
        <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
      </svg>
    ),
  },

  // 4 Additional Terminal/CLI coding agents requested by user
  {
    name: "Aider CLI",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#10B981]/35 to-[#047857]/20",
    iconBorder: "border-[#34D399]/35",
    customIcon: (
      <div className="flex items-center gap-0.5 font-mono text-[10px] font-extrabold text-[#34D399] drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">
        <span>aider</span>
      </div>
    ),
  },
  {
    name: "Goose CLI",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#F97316]/35 to-[#C2410C]/20",
    iconBorder: "border-[#FB923C]/35",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 text-[#FB923C]">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" />
      </svg>
    ),
  },
  {
    name: "Roo Code",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#06B6D4]/35 to-[#0E7490]/20",
    iconBorder: "border-[#22D3EE]/35",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-4.5 text-[#22D3EE]" stroke="currentColor" strokeWidth="2.4">
        <path d="M4 17l6-6-6-6M12 19h8" />
      </svg>
    ),
  },
  {
    name: "OpenHands",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-gradient-to-br from-[#EC4899]/35 to-[#BE185D]/20",
    iconBorder: "border-[#F472B6]/35",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 text-[#F472B6]">
        <path d="M18 11.2V5a2 2 0 0 0-4 0v4.2A2 2 0 0 0 12 8a2 2 0 0 0-2 2v2.2A2 2 0 0 0 8 11a2 2 0 0 0-2 2v4a7 7 0 0 0 14 0v-4a2 2 0 0 0-2-1.8z" />
      </svg>
    ),
  },
];

export function SupportedAiTools() {
  return (
    <section className="relative mx-auto max-w-[1360px] px-5 py-20 md:px-10 md:py-28" aria-label="Supported AI Tools">
      {/* Subtle radial ambient glow behind the section */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[640px] rounded-full bg-[radial-gradient(circle_at_center,rgba(116,250,106,0.06),transparent_70%)] blur-3xl" />

      <div className="relative mx-auto flex max-w-[840px] flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] px-3.5 py-1 text-[11px] font-medium tracking-wide text-[#A9C5A7] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
          <span className="size-1.5 rounded-full bg-[#74FA6A] shadow-[0_0_8px_#74FA6A]" />
          Terminal & Editor Ecosystem
        </div>

        <h2 className="mt-4 text-balance text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.05] tracking-[-.05em] text-[#F0F3F5]">
          Supported AI Tools
        </h2>
        <p className="mt-3.5 max-w-[62ch] text-[14px] leading-relaxed text-[#8C97A5] md:text-[15px]">
          Token Plan works with mainstream tools that support OpenAI and Anthropic protocols{" "}
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 font-medium text-[#74FA6A] underline-offset-4 transition-all hover:text-[#A8FF9B] hover:underline"
          >
            Learn More <ArrowUpRight size={14} className="inline transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </p>
      </div>

      {/* Grid Cards 4 Columns - iOS Glassmorphic Cards */}
      <div className="relative mt-14 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {AI_TOOLS.map((tool, idx) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.45, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex items-center gap-3.5 overflow-hidden rounded-[20px] border border-white/[0.12] bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] p-3.5 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_12px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.28] hover:bg-white/[0.09] hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.35),0_18px_45px_-10px_rgba(0,0,0,0.65)]"
          >
            {/* Top Gloss Highlight (iOS Glass Specular) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent transition-opacity duration-300 group-hover:via-white/60" />

            {/* iOS App-style Squircle Icon */}
            <div
              className={`relative grid size-10 shrink-0 place-items-center rounded-[14px] border ${tool.iconBorder || "border-white/20"} ${tool.iconBg || "bg-white/[0.08]"} shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-md transition-transform duration-300 group-hover:scale-105`}
            >
              {tool.customIcon || <Terminal size={17} className="text-white/80" />}
            </div>

            {/* Label & Category Badge */}
            <div className="flex flex-1 items-center justify-between min-w-0 pr-1">
              <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#F1F5F9] transition-colors group-hover:text-white">
                {tool.name}
              </span>
              <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-white/45 transition-colors group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-white/75">
                {tool.category}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
