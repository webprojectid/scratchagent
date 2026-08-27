"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useLang } from "@/lib/lang";
import { docsCopy } from "@/lib/copy-docs";

/* ============================================================
   Visual docs, gaya Mintlify (dark mode): kalem, border tipis
   8% opacity, radius 16px, tanpa shadow berat. Mockup produk
   tetap ada biar pembaca "lihat" setiap langkah, tapi dibungkus
   container yang tenang dan konsisten.
   ============================================================ */

function TerminalChrome({ title }: { title: string }) {
  // Traffic lights terminal: merah, kuning, hijau
  return (
    <div className="flex h-10 items-center justify-between border-b border-white/[.08] px-4">
      <span className="flex items-center gap-1.5">
        <i className="size-2.5 rounded-full bg-[#FF5F57]" />
        <i className="size-2.5 rounded-full bg-[#FEBC2E]" />
        <i className="size-2.5 rounded-full bg-[#28C840]" />
      </span>
      <span className="font-mono text-[11px] tracking-[.04em] text-[#737373]">{title}</span>
    </div>
  );
}

const frame = "overflow-hidden rounded-2xl border border-white/[.08] bg-[#141414]";

/** Step 1: mockup mini halaman /new, brief sedang diketik. */
function MockBrief() {
  const c = docsCopy(useLang());
  return (
    <div className={frame}>
      <TerminalChrome title="scratch / new project" />
      <div className="p-5">
        <p className="text-[13px] font-medium uppercase tracking-[.06em] text-[#A0A0A0]">{c.mockNewMission}</p>
        <p className="mt-2.5 text-[16px] font-semibold tracking-[-.02em] text-[#EDEDED]">{c.mockQuestion}</p>
        <div className="mt-4 rounded-xl border border-white/[.08] bg-[#0d0d0d] p-4">
          <p className="text-[14px] leading-6 text-[#EDEDED]">
            {c.mockBriefText}
            <span className="ml-1 inline-block h-[14px] w-[2px] animate-pulse bg-[#74FA6A] align-middle" />
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <span className="rounded-full bg-[#74FA6A] px-4 py-2 text-[13px] font-medium text-[#0d0d0d]">{c.mockContinue}</span>
        </div>
      </div>
    </div>
  );
}

/** Step 2: tombol "Mulai implementasi" dan prompt yang tersalin. */
function MockPrompt() {
  const c = docsCopy(useLang());
  return (
    <div className={frame}>
      <TerminalChrome title="plan · ready" />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium uppercase tracking-[.06em] text-[#A0A0A0]">{c.mockMissionPrompt}</p>
          <span className="flex items-center gap-1.5 rounded-full bg-[#74FA6A] px-4 py-1.5 text-[12px] font-medium text-[#0d0d0d]">
            <Copy size={12} /> {c.mockStartImpl}
          </span>
        </div>
        <div className="mt-4 space-y-2 font-mono text-[13px] leading-6 text-[#A0A0A0]">
          <p><span className="text-[#74FA6A]">$</span> scratch-agent plan get rv_8f3a</p>
          <p className="text-[#737373]">{c.mockPlanReady}</p>
          <p className="text-[#737373]">{c.mockTokenNote}</p>
        </div>
        <p className="mt-4 rounded-xl border border-white/[.08] bg-[#0d0d0d] px-4 py-3 text-[13px] leading-6 text-[#A0A0A0]">
          {c.mockPasteNote}
        </p>
      </div>
    </div>
  );
}

/** Step 3: progress live, task berjalan lewat polling. */
function MockProgress() {
  const lang = useLang();
  const c = docsCopy(lang);
  const [t1, t2, t3] = c.mockTasks;
  return (
    <div className={frame}>
      <TerminalChrome title={lang === "en" ? "phase 01 · ordering" : "fase 01 · pemesanan"} />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium uppercase tracking-[.06em] text-[#A0A0A0]">{c.mockProgressTitle}</p>
          <span className="flex items-center gap-2 text-[12px] text-[#A0A0A0]">
            <span className="size-1.5 rounded-full bg-[#74FA6A]" /> {c.mockPolling}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.08]">
          <div className="h-full w-[64%] rounded-full bg-[#74FA6A]" />
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-2.5 text-[13px] text-[#737373]">
            <Check size={14} className="shrink-0 text-[#74FA6A]" />
            <span className="font-mono text-[12px]">F01-S01-T01</span>
            <span className="line-through decoration-white/30">{t1}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px] text-[#EDEDED]">
            <Loader2 size={14} className="shrink-0 animate-spin text-[#74FA6A]" />
            <span className="font-mono text-[12px]">F01-S01-T02</span>
            <span>{t2}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px] text-[#737373]/60">
            <span className="size-[14px] shrink-0 rounded-full border border-white/[.15]" />
            <span className="font-mono text-[12px]">F01-S01-T03</span>
            <span>{t3}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Quickstart: tiga langkah dalam satu alur vertikal yang tenang. */
export function QuickstartVisual() {
  const c = docsCopy(useLang());
  return (
    <div className="space-y-12">
      {c.quickstartSteps.map((step) => (
        <div key={step.num} className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/[.15] text-[13px] font-medium text-[#EDEDED]">
                {step.num}
              </span>
              <span className="text-[12px] font-medium uppercase tracking-[.08em] text-[#737373]">{c.stepOf} {step.num} / 3</span>
            </div>
            <h3 className="mt-4 text-[24px] font-semibold leading-[1.3] tracking-[-.01em] text-[#EDEDED]">{step.title}</h3>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-[1.7] text-[#A0A0A0]">{step.copy}</p>
          </div>
          {step.num === "1" ? <MockBrief /> : step.num === "2" ? <MockPrompt /> : <MockProgress />}
        </div>
      ))}
    </div>
  );
}

/** Pipeline struktur plan: Plan → Feature → Sub-feature → Task. */
export function ConceptPipeline() {
  const c = docsCopy(useLang());
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[.08] bg-[#141414] p-6 max-lg:p-4">
      <div className="flex min-w-[560px] items-center gap-3 max-lg:min-w-0 max-lg:flex-col max-lg:items-stretch max-lg:gap-2">
        {c.pipelineNodes.map((node, i) => (
          <div key={node.label} className="flex flex-1 items-center gap-3">
            <div className="flex-1 rounded-xl border border-white/[.08] bg-[#0d0d0d] px-4 py-4 text-center">
              <p className="text-[15px] font-semibold tracking-[-.01em] text-[#EDEDED]">{node.label}</p>
              <p className="mt-1 font-mono text-[11px] text-[#737373]">{node.sub}</p>
            </div>
            {i < c.pipelineNodes.length - 1 && <span className="text-[14px] text-[#737373]">→</span>}
          </div>
        ))}
      </div>
      <p className="mt-5 text-[14px] leading-6 text-[#A0A0A0]">
        {c.pipelineNote.split("F01-S02-T03")[0]}<code className="rounded bg-white/[.06] px-1.5 py-0.5 font-mono text-[12px] text-[#EDEDED]">F01-S02-T03</code>{c.pipelineNote.split("F01-S02-T03")[1]}
      </p>
    </div>
  );
}

/** Terminal prompt misi untuk section Prompt Agent. */
export function PromptVisual() {
  const c = docsCopy(useLang());
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#0d0d0d]">
      <TerminalChrome title="mission loop" />
      <div className="space-y-2.5 p-5 font-mono text-[13px] leading-7 text-[#EDEDED]">
        <p className="text-[#737373]">{c.promptComment}</p>
        <p><span className="text-[#74FA6A]">$</span> scratch-agent task next --plan futsalgo</p>
        <p className="text-[#A0A0A0]">{`{ "ref": "F01-S01-T02", "blocked": false, "checkpoint": false }`}</p>
        <p><span className="text-[#74FA6A]">$</span> scratch-agent task start F01-S01-T02</p>
        <p className="text-[#737373]">{c.promptWorking}</p>
        <p><span className="text-[#74FA6A]">$</span> scratch-agent task complete F01-S01-T02</p>
        <p className="text-[#A0A0A0]">{`{ "done": false, "next": "F01-S01-T03" }`}</p>
        <div className="border-t border-white/[.08] pt-3 text-[12px] leading-6 text-[#737373]">
          <p>{c.promptFailNote}</p>
          <p>{c.promptCheckpointNote}</p>
        </div>
      </div>
    </div>
  );
}
