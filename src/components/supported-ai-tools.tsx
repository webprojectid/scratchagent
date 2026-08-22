"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

interface AiTool {
  name: string;
  logoUrl: string;
  logoBg: string; // background color matching official brand
}

// Official logos via LobeHub CDN and official favicons/GitHub raw assets
const AI_TOOLS: AiTool[] = [
  {
    name: "Qwen Code",
    logoUrl: "https://lobechat.com/icons/qwen.svg",
    logoBg: "#6366F1",
  },
  {
    name: "Cline",
    logoUrl: "https://lobehub.com/icons/cline-color.svg",
    logoBg: "#1C1C1C",
  },
  {
    name: "Claude Code",
    logoUrl: "https://lobechat.com/icons/claude.svg",
    logoBg: "#CC785C",
  },
  {
    name: "Cursor",
    logoUrl: "https://lobehub.com/icons/cursor-color.svg",
    logoBg: "#161616",
  },
  {
    name: "OpenCode",
    logoUrl: "https://avatars.githubusercontent.com/u/214657506?s=200&v=4",
    logoBg: "#111111",
  },
  {
    name: "Codex",
    logoUrl: "https://lobechat.com/icons/openai.svg",
    logoBg: "#000000",
  },
  {
    name: "Kilo CLI",
    logoUrl: "https://avatars.githubusercontent.com/u/203721993?s=200&v=4",
    logoBg: "#18181B",
  },
  {
    name: "OpenClaw",
    logoUrl: "https://avatars.githubusercontent.com/u/192600165?s=200&v=4",
    logoBg: "#DC2626",
  },
  {
    name: "Aider CLI",
    logoUrl: "https://avatars.githubusercontent.com/u/141457272?s=200&v=4",
    logoBg: "#059669",
  },
  {
    name: "Goose CLI",
    logoUrl: "https://avatars.githubusercontent.com/u/191096793?s=200&v=4",
    logoBg: "#F97316",
  },
  {
    name: "Roo Code",
    logoUrl: "https://lobehub.com/icons/roo-cline-color.svg",
    logoBg: "#0E7490",
  },
  {
    name: "OpenHands",
    logoUrl: "https://avatars.githubusercontent.com/u/159147714?s=200&v=4",
    logoBg: "#7C3AED",
  },
];

export function SupportedAiTools() {
  return (
    <section className="relative mx-auto max-w-[1360px] px-5 py-20 md:px-10 md:py-28" aria-label="Supported AI Tools">
      {/* Subtle radial ambient glow behind the section */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[640px] rounded-full bg-[radial-gradient(circle_at_center,rgba(116,250,106,0.06),transparent_70%)] blur-3xl" />

      <div className="relative mx-auto flex max-w-[840px] flex-col items-center text-center">
        <h2 className="text-balance text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.05] tracking-[-.05em] text-[#F0F3F5]">
          Supported AI Tools
        </h2>
        <p className="mt-3.5 max-w-[62ch] text-[14px] leading-relaxed text-[#8C97A5] md:text-[15px]">
          Token Plan works with mainstream tools that support OpenAI and Anthropic protocols{" "}
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 font-medium text-[#74FA6A] underline-offset-4 transition-all hover:text-[#A8FF9B] hover:underline"
          >
            Learn More <ArrowUpRight size={14} className="inline" />
          </Link>
        </p>
      </div>

      {/* Grid Cards 4 Columns - iOS Glassmorphic Cards with Official Brand Logos */}
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

            {/* Official Logo Container */}
            <div
              className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundColor: tool.logoBg }}
            >
              <Image
                src={tool.logoUrl}
                alt={`${tool.name} logo`}
                width={28}
                height={28}
                className="size-7 object-contain"
                unoptimized
              />
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
