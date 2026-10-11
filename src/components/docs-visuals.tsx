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
    <div className="flex h-10 items-center justify-between border-b border-border px-4">
      <span className="flex items-center gap-1.5">
        <i className="size-2.5 rounded-full bg-destructive" />
        <i className="size-2.5 rounded-full bg-primary" />
        <i className="size-2.5 rounded-full bg-primary" />
      </span>
      <span className="font-mono text-[11px] tracking-[.04em] text-muted-foreground">{title}</span>
    </div>
  );
}

const frame = "overflow-hidden rounded-2xl border border-border bg-background transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-[var(--theme-accent)]/5";

/** Step 1: mockup mini halaman /new, brief sedang diketik. */
function MockBrief() {
  const c = docsCopy(useLang());
  return (
    <div className={frame}>
      <TerminalChrome title="scratch / new project" />
      <div className="p-5">
        <p className="text-[13px] font-medium uppercase tracking-[.06em] text-muted-foreground">{c.mockNewMission}</p>
        <p className="mt-2.5 text-[16px] font-semibold tracking-[-.02em] text-foreground">{c.mockQuestion}</p>
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          <p className="text-[14px] leading-6 text-foreground">
            {c.mockBriefText}
            <span className="ml-1 inline-block h-[14px] w-[2px] animate-pulse bg-primary align-middle" />
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <span className="rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-muted-foreground">{c.mockContinue}</span>
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
          <p className="text-[13px] font-medium uppercase tracking-[.06em] text-muted-foreground">{c.mockMissionPrompt}</p>
          <span className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[12px] font-medium text-muted-foreground">
            <Copy size={12} /> {c.mockStartImpl}
          </span>
        </div>
        <div className="mt-4 space-y-2 font-mono text-[13px] leading-6 text-muted-foreground">
          <p><span className="text-primary">$</span> scratch-agent plan get rv_8f3a</p>
          <p className="text-muted-foreground">{c.mockPlanReady}</p>
          <p className="text-muted-foreground">{c.mockTokenNote}</p>
        </div>
        <p className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-[13px] leading-6 text-muted-foreground">
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
          <p className="text-[13px] font-medium uppercase tracking-[.06em] text-muted-foreground">{c.mockProgressTitle}</p>
          <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" /> {c.mockPolling}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/[.08]">
          <div className="h-full w-[64%] rounded-full bg-primary" />
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
            <Check size={14} className="shrink-0 text-primary" />
            <span className="font-mono text-[12px]">F01-S01-T01</span>
            <span className="line-through decoration-white/30">{t1}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px] text-foreground">
            <Loader2 size={14} className="shrink-0 animate-spin text-primary" />
            <span className="font-mono text-[12px]">F01-S01-T02</span>
            <span>{t2}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground/60">
            <span className="size-[14px] shrink-0 rounded-full border border-border" />
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
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-[13px] font-medium text-foreground">
                {step.num}
              </span>
              <span className="text-[12px] font-medium uppercase tracking-[.08em] text-muted-foreground">{c.stepOf} {step.num} / 3</span>
            </div>
            <h3 className="mt-4 text-[24px] font-semibold leading-[1.3] tracking-[-.01em] text-foreground">{step.title}</h3>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-[1.7] text-muted-foreground">{step.copy}</p>
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
    <div className="overflow-x-auto rounded-2xl border border-border bg-background p-6 max-lg:p-4">
      <div className="flex min-w-[560px] items-center gap-3 max-lg:min-w-0 max-lg:flex-col max-lg:items-stretch max-lg:gap-2">
        {c.pipelineNodes.map((node, i) => (
          <div key={node.label} className="flex flex-1 items-center gap-3">
            <div className="flex-1 rounded-xl border border-border bg-background px-4 py-4 text-center">
              <p className="text-[15px] font-semibold tracking-[-.01em] text-foreground">{node.label}</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{node.sub}</p>
            </div>
            {i < c.pipelineNodes.length - 1 && <span className="text-[14px] text-muted-foreground">→</span>}
          </div>
        ))}
      </div>
      <p className="mt-5 text-[14px] leading-6 text-muted-foreground">
        {c.pipelineNote.split("F01-S02-T03")[0]}<code className="rounded bg-foreground/[.06] px-1.5 py-0.5 font-mono text-[12px] text-foreground">F01-S02-T03</code>{c.pipelineNote.split("F01-S02-T03")[1]}
      </p>
    </div>
  );
}

/** Terminal prompt misi untuk section Prompt Agent. */
export function PromptVisual() {
  const c = docsCopy(useLang());
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <TerminalChrome title="mission loop" />
      <div className="space-y-2.5 p-5 font-mono text-[13px] leading-7 text-foreground">
        <p className="text-muted-foreground">{c.promptComment}</p>
        <p><span className="text-primary">$</span> scratch-agent task next --plan futsalgo</p>
        <p className="text-muted-foreground">{`{ "ref": "F01-S01-T02", "blocked": false, "checkpoint": false }`}</p>
        <p><span className="text-primary">$</span> scratch-agent task start F01-S01-T02</p>
        <p className="text-muted-foreground">{c.promptWorking}</p>
        <p><span className="text-primary">$</span> scratch-agent task complete F01-S01-T02</p>
        <p className="text-muted-foreground">{`{ "done": false, "next": "F01-S01-T03" }`}</p>
        <div className="border-t border-border pt-3 text-[12px] leading-6 text-muted-foreground">
          <p>{c.promptFailNote}</p>
          <p>{c.promptCheckpointNote}</p>
        </div>
      </div>
    </div>
  );
}
