"use client";

import React from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import { AntigravityIcon } from "./support-tools-icons/Antigravity";
import { AmpIcon } from "./support-tools-icons/Amp";
import { ClaudeCodeIcon } from "./support-tools-icons/ClaudeCode";
import { ClineIcon } from "./support-tools-icons/Cline";
import { CodeBuddyIcon } from "./support-tools-icons/CodeBuddy";
import { CodexIcon } from "./support-tools-icons/Codex";
import { CursorIcon } from "./support-tools-icons/Cursor";
import { HermesAgentIcon } from "./support-tools-icons/HermesAgent";
import { KiloCodeIcon } from "./support-tools-icons/KiloCode";
import { KiroIcon } from "./support-tools-icons/Kiro";
import { OpenClawIcon } from "./support-tools-icons/OpenClaw";
import { OpenCodeIcon } from "./support-tools-icons/OpenCode";
import { OpenHandsIcon } from "./support-tools-icons/OpenHands";
import { PlandexIcon } from "./support-tools-icons/Plandex";
import { QoderIcon } from "./support-tools-icons/Qoder";
import { QwenIcon } from "./support-tools-icons/Qwen";
import { RooCodeIcon } from "./support-tools-icons/RooCode";
import { VsCodeIcon } from "./support-tools-icons/VSCode";

interface AiTool {
  name: string;
  icon: React.ReactNode;
}

const AI_TOOLS: AiTool[] = [
  { name: "Claude Code", icon: <ClaudeCodeIcon /> },
  { name: "Amp", icon: <AmpIcon /> },
  { name: "Cline", icon: <ClineIcon /> },
  { name: "CodeBuddy", icon: <CodeBuddyIcon /> },
  { name: "Codex", icon: <CodexIcon /> },
  { name: "Cursor", icon: <CursorIcon /> },
  { name: "Hermes Agent", icon: <HermesAgentIcon /> },
  { name: "Kilo Code", icon: <KiloCodeIcon /> },
  { name: "Kiro", icon: <KiroIcon /> },
  { name: "Open Claw", icon: <OpenClawIcon /> },
  { name: "Qoder", icon: <QoderIcon /> },
  { name: "VS Code", icon: <VsCodeIcon /> },
  { name: "Open Code", icon: <OpenCodeIcon /> },
  { name: "Open Hands", icon: <OpenHandsIcon /> },
  { name: "Qwen", icon: <QwenIcon /> },
  { name: "Roo Code", icon: <RooCodeIcon /> },
  { name: "Plandex", icon: <PlandexIcon /> },
  { name: "Antigravity", icon: <AntigravityIcon /> },
];

export function SupportedAiTools() {
  return (
    <section
      className="relative w-full px-0 pt-20 md:pt-28"
      aria-label="Supported AI Tools"
    >
      {/* Full brand-color outer card: the whole stage surface is #9EC5AB.
          Reason: user wants this section to carry the site identity at full color, edge to edge.
          No bottom padding/shadow: the Solutions section continues on the same sage surface. */}
      <div className="relative w-full overflow-hidden bg-[#9EC5AB] px-6 py-14 md:px-12 md:py-20">
        <div className="relative mx-auto flex max-w-[840px] flex-col items-center text-center">
          <h2 className="text-balance text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.05] tracking-[-.05em] text-[#0F1A12]">
            Supported AI Tools
          </h2>
          <p className="mt-3.5 max-w-[62ch] text-[14px] leading-relaxed text-[#33473A] md:text-[15px]">
            Token Plan works with mainstream tools that support OpenAI and Anthropic protocols{" "}
            <a
              href="/docs"
              className="inline-flex items-center gap-1 font-medium text-[#0F1A12] underline-offset-4 transition-all hover:text-black hover:underline"
            >
              Learn More <ArrowUpRight size={14} className="inline" />
            </a>
          </p>
        </div>

        <div className="relative mt-14 grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {AI_TOOLS.map((tool, idx) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.45, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
              /* Tool card on sage surface: near-white card so logos + dark text stay readable,
                  tactile push on :active. */
              className="group relative flex items-center gap-3.5 overflow-hidden rounded-[20px] border border-[#0F1A12]/10 bg-[#F6FAF7]/90 px-4 py-3.5 shadow-[0_2px_10px_-2px_rgba(15,26,18,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0F1A12]/25 hover:bg-white hover:shadow-[0_8px_24px_-6px_rgba(15,26,18,0.22)] active:scale-[0.98]"
            >
              {/* Brand Icon Container - no background, logo keeps original colors */}
              <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden">
                {tool.icon}
              </div>

              {/* Tool Name */}
              <span className="flex-1 truncate text-[14.5px] font-semibold tracking-[-0.01em] text-[#1A2B1F] transition-colors group-hover:text-[#0F1A12]">
                {tool.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
