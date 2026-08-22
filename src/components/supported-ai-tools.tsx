"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

interface AiTool {
  name: string;
  customIcon: React.ReactNode;
}

const AI_TOOLS: AiTool[] = [
  // 1. Qwen Code (Official Qwen triple ribbon purple icon)
  {
    name: "Qwen Code",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-6 text-[#6366F1]">
        <path
          d="M12 2.5C9.2 2.5 7.5 4.5 7.5 7c0 1.8.8 3.2 2 4.1L8 14.5c-1.8-1-3-2.8-3-5 0-3.9 3.1-7 7-7s7 3.1 7 7c0 2.2-1.2 4-3 5l-1.5-3.4c1.2-.9 2-2.3 2-4.1 0-2.5-1.7-4.5-4.5-4.5z"
          fill="#6366F1"
        />
        <path
          d="M4.5 14c1.4-2.4 3.7-3.5 6.2-2.8l1.4 3.3c-1.6.4-2.8 1.4-3.4 2.8-1.2 2.2-.4 4.8 1.8 6-1.9.8-4.2.2-5.4-1.8-2-3.4-.8-7.8 2.4-9.8l1.4 3.3c-.8.5-1.5 1.3-1.8 2.3-.6 1.4-.4 2.8.4 3.7-1.4-.7-2.3-2-2.6-3.5-.2-1.2 0-2.5.6-3.5z"
          fill="#818CF8"
        />
        <path
          d="M19.5 14c-.6 1-1.5 1.8-2.6 2.3-.8.4-1.8.4-2.6.1l1.4-3.3c.6.2 1.3.1 1.8-.2 2.2-1.2 3-3.8 1.8-6l3-1.7c1.2 2 1.5 4.3.7 6.4-.8 2.1-2.4 3.7-4.5 4.4l1-2.3z"
          fill="#A5B4FC"
        />
      </svg>
    ),
  },

  // 2. Cline (Official Black robot with eyes)
  {
    name: "Cline",
    customIcon: (
      <div className="flex size-6 items-center justify-center rounded-md bg-white p-0.5">
        <svg viewBox="0 0 24 24" fill="#111827" className="size-5">
          <path d="M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8z" />
          <path d="M2 10a1 1 0 0 1 1-1h1v6H3a1 1 0 0 1-1-1v-4zM20 9h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1V9z" />
          <circle cx="8.5" cy="11.5" r="1.5" fill="#FFFFFF" />
          <circle cx="15.5" cy="11.5" r="1.5" fill="#FFFFFF" />
        </svg>
      </div>
    ),
  },

  // 3. Claude Code (Official Anthropic Terracotta 14-spoke starburst)
  {
    name: "Claude Code",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="#D97706" className="size-6 text-[#D97706]">
        <path d="M12 2l1.2 6.8L18 4.5l-3.8 5.8 7 1.2-6.8 1.2 5.8 3.8-6.8-1.2 3.8 6.8-5.8-3.8-1.2 7-1.2-6.8L4.5 20.5l3.8-5.8-7-1.2 6.8-1.2L2.3 8.5l6.8 1.2L5.3 2.9l5.8 3.8L12 2z" />
      </svg>
    ),
  },

  // 4. Cursor (Official 3D Isometric dark cube)
  {
    name: "Cursor",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-6">
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#18181B" stroke="#E4E4E7" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 22V12M12 12L3 7M12 12l9-5" stroke="#E4E4E7" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 12l9-5v10l-9 5V12z" fill="#27272A" />
      </svg>
    ),
  },

  // 5. OpenCode (Official thick square frame)
  {
    name: "OpenCode",
    customIcon: (
      <div className="flex size-6 items-center justify-center rounded-sm bg-white p-1">
        <div className="size-3.5 rounded-[1px] bg-black" />
      </div>
    ),
  },

  // 6. Codex (Official Blue capsule terminal prompt)
  {
    name: "Codex",
    customIcon: (
      <div className="flex size-6 items-center justify-center rounded-full bg-[#3B82F6] shadow-[0_0_10px_rgba(59,130,246,0.5)]">
        <span className="font-mono text-[11px] font-black text-white tracking-tighter">&gt;_</span>
      </div>
    ),
  },

  // 7. Kilo CLI (Official square box with KI on top, LO below)
  {
    name: "Kilo CLI",
    customIcon: (
      <div className="flex size-6 flex-col items-center justify-center rounded border-2 border-white bg-black px-0.5 leading-none shadow-[0_0_8px_rgba(255,255,255,0.2)]">
        <div className="font-mono text-[7px] font-black text-white tracking-widest">KI</div>
        <div className="font-mono text-[7px] font-black text-white tracking-widest">LO</div>
      </div>
    ),
  },

  // 8. OpenClaw (Official red crab icon)
  {
    name: "OpenClaw",
    customIcon: (
      <svg viewBox="0 0 24 24" fill="#DC2626" className="size-6 text-[#DC2626] drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">
        <circle cx="12" cy="13" r="6" />
        <path d="M6 13c-2-1-3-3-3-5 2 0 4 1 5 3M18 13c2-1 3-3 3-5-2 0-4 1-5 3" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="11" r="1.2" fill="#FFFFFF" />
        <circle cx="14" cy="11" r="1.2" fill="#FFFFFF" />
        <path d="M8 18l-2 3M16 18l2 3M12 19v3" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },

  // 9. Aider CLI (Official Aider emerald terminal pair-programming chevron)
  {
    name: "Aider CLI",
    customIcon: (
      <div className="flex size-6 items-center justify-center rounded-lg bg-[#059669] shadow-[0_0_10px_rgba(16,185,129,0.4)]">
        <span className="font-mono text-[10px] font-black text-white tracking-tight">&gt;aider</span>
      </div>
    ),
  },

  // 10. Goose CLI (Official Block Goose orange geometric icon)
  {
    name: "Goose CLI",
    customIcon: (
      <div className="flex size-6 items-center justify-center rounded-lg bg-[#EA580C] shadow-[0_0_10px_rgba(234,88,12,0.4)]">
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className="size-4">
          <path d="M12 3c-2.5 0-4.5 2-4.5 4.5 0 1.5.8 2.8 2 3.5v4l-3 3v2h11v-2l-3-3v-4c1.2-.7 2-2 2-3.5C16.5 5 14.5 3 12 3zm0 2c1.4 0 2.5 1.1 2.5 2.5S13.4 10 12 10s-2.5-1.1-2.5-2.5S10.6 5 12 5z" />
        </svg>
      </div>
    ),
  },

  // 11. Roo Code (Official Roo Code cyan mascot icon)
  {
    name: "Roo Code",
    customIcon: (
      <div className="flex size-6 items-center justify-center rounded-lg bg-[#0891B2] shadow-[0_0_10px_rgba(6,182,212,0.4)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" className="size-4">
          <path d="M4 17l6-6-6-6M12 19h8" />
        </svg>
      </div>
    ),
  },

  // 12. OpenHands (Official OpenHands / OpenDevin purple palm)
  {
    name: "OpenHands",
    customIcon: (
      <div className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-tr from-[#9333EA] to-[#C026D3] shadow-[0_0_10px_rgba(192,38,211,0.4)]">
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className="size-4">
          <path d="M18 11.2V5a2 2 0 0 0-4 0v4.2A2 2 0 0 0 12 8a2 2 0 0 0-2 2v2.2A2 2 0 0 0 8 11a2 2 0 0 0-2 2v4a7 7 0 0 0 14 0v-4a2 2 0 0 0-2-1.8z" />
        </svg>
      </div>
    ),
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
            Learn More <ArrowUpRight size={14} className="inline transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
            {/* Top Gloss Highlight (iOS Glass Specular) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent transition-opacity duration-300 group-hover:via-white/60" />

            {/* Official Brand Logo Icon Container */}
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.12] bg-black/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.4)] backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
              {tool.customIcon}
            </div>

            {/* Tool Name */}
            <div className="flex flex-1 items-center min-w-0">
              <span className="truncate text-[14.5px] font-semibold tracking-[-0.01em] text-[#F1F5F9] transition-colors group-hover:text-white">
                {tool.name}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
