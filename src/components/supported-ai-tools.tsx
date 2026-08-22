"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, Terminal } from "lucide-react";

interface AiTool {
  name: string;
  category: "cli" | "editor" | "extension";
  iconType: "svg" | "img" | "component";
  iconUrl?: string;
  iconBg?: string;
  iconColor?: string;
  customIcon?: React.ReactNode;
}

const AI_TOOLS: AiTool[] = [
  // 8 Tools from user reference
  {
    name: "Qwen Code",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#6366F1]/15",
    iconColor: "text-[#818CF8]",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-4.5 text-[#818CF8]" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    name: "Cline",
    category: "extension",
    iconType: "svg",
    iconBg: "bg-white/10",
    iconColor: "text-white",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-white">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
      </svg>
    ),
  },
  {
    name: "Claude Code",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#D97706]/15",
    iconColor: "text-[#F59E0B]",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 text-[#D97706]">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    ),
  },
  {
    name: "Cursor",
    category: "editor",
    iconType: "svg",
    iconBg: "bg-white/10",
    iconColor: "text-white",
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
    iconBg: "bg-white/10",
    iconColor: "text-white",
    customIcon: (
      <div className="size-3.5 rounded-[2px] border-2 border-white" />
    ),
  },
  {
    name: "Codex",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#3B82F6]/15",
    iconColor: "text-[#60A5FA]",
    customIcon: (
      <div className="flex items-center gap-0.5 font-mono text-[10px] font-bold text-[#60A5FA]">
        <span>&gt;_</span>
      </div>
    ),
  },
  {
    name: "Kilo CLI",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#8B5CF6]/15",
    iconColor: "text-[#A78BFA]",
    customIcon: (
      <div className="rounded-[3px] border border-[#A78BFA] px-1 py-0.2 font-mono text-[8px] font-bold text-[#A78BFA]">
        KILO
      </div>
    ),
  },
  {
    name: "OpenClaw",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#EF4444]/15",
    iconColor: "text-[#F87171]",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-[#EF4444]">
        <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
      </svg>
    ),
  },

  // 4 Additional Terminal/CLI coding agents requested by user
  {
    name: "Aider CLI",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#10B981]/15",
    iconColor: "text-[#34D399]",
    customIcon: (
      <div className="flex items-center gap-0.5 font-mono text-[10px] font-bold text-[#34D399]">
        <span>aider</span>
      </div>
    ),
  },
  {
    name: "Goose CLI",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#F97316]/15",
    iconColor: "text-[#FB923C]",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 text-[#F97316]">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" />
      </svg>
    ),
  },
  {
    name: "Roo Code",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#06B6D4]/15",
    iconColor: "text-[#22D3EE]",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-4 text-[#22D3EE]" stroke="currentColor" strokeWidth="2.2">
        <path d="M4 17l6-6-6-6M12 19h8" />
      </svg>
    ),
  },
  {
    name: "OpenHands",
    category: "cli",
    iconType: "svg",
    iconBg: "bg-[#EC4899]/15",
    iconColor: "text-[#F472B6]",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 text-[#EC4899]">
        <path d="M18 11.2V5a2 2 0 0 0-4 0v4.2A2 2 0 0 0 12 8a2 2 0 0 0-2 2v2.2A2 2 0 0 0 8 11a2 2 0 0 0-2 2v4a7 7 0 0 0 14 0v-4a2 2 0 0 0-2-1.8z" />
      </svg>
    ),
  },
];

export function SupportedAiTools() {
  return (
    <section className="relative mx-auto max-w-[1360px] px-5 py-16 md:px-10 md:py-24" aria-label="Supported AI Tools">
      <div className="mx-auto flex max-w-[840px] flex-col items-center text-center">
        <h2 className="text-balance text-[clamp(2rem,3.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-.045em] text-[#F0F3F5]">
          Supported AI Tools
        </h2>
        <p className="mt-3.5 max-w-[62ch] text-[14px] leading-relaxed text-[#8C97A5] md:text-[15px]">
          Token Plan works with mainstream tools that support OpenAI and Anthropic protocols{" "}
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 font-medium text-[#74FA6A] underline-offset-4 transition-colors hover:text-[#9AFF82] hover:underline"
          >
            Learn More <ArrowUpRight size={13} className="inline" />
          </Link>
        </p>
      </div>

      {/* Grid Cards 4 Columns */}
      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AI_TOOLS.map((tool, idx) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex items-center gap-3.5 rounded-[16px] border border-white/[0.08] bg-[#12161A]/70 px-4 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-[#181F26] hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
          >
            <div
              className={`grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] ${tool.iconBg || "bg-white/[0.05]"} transition-transform duration-300 group-hover:scale-105`}
            >
              {tool.customIcon || <Terminal size={16} className="text-white/70" />}
            </div>

            <div className="flex flex-1 items-center justify-between">
              <span className="text-[14px] font-medium tracking-tight text-[#E2E8F0] transition-colors group-hover:text-white">
                {tool.name}
              </span>
              <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/30 group-hover:text-white/50">
                {tool.category}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
