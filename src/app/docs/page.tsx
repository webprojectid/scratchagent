"use client";

import Link from "next/link";
import { DocsToc } from "@/components/docs-toc";
import { ConceptPipeline, PromptVisual, QuickstartVisual } from "@/components/docs-visuals";
import { HeaderNav } from "@/components/header-nav";
import { PageHero } from "@/components/page-hero";
import { useLang } from "@/lib/lang";
import { docsCopy } from "@/lib/copy-docs";

/* Gaya docs: Mintlify dark mode. Konten kolom tengah ~720px supaya
   baris bacaan nyaman, border tipis 8% tanpa shadow berat, accent
   lime dipakai hemat, heading tracking ketat dengan tiga weight saja. */

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[12px] font-medium uppercase tracking-[.08em] text-[#74FA6A]">{children}</p>;
}

function SectionHead({ id, label, title, lead }: { id: string; label: string; title: string; lead?: string }) {
  return (
    <div id={id} className="scroll-mt-24 pt-20 md:pt-24">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="mt-3 text-balance text-[32px] font-semibold leading-[1.1] tracking-[-.02em] text-[#EDEDED]">{title}</h2>
      {lead && <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-[#A0A0A0]">{lead}</p>}
    </div>
  );
}

export default function DocsPage() {
  const lang = useLang();
  const c = docsCopy(lang);

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-[#EDEDED] selection:bg-[#74FA6A]/30 selection:text-[#0d0d0d]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[rgba(10,10,10,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-[#E8F0E8]">
            <span className="relative grid size-6 place-items-center overflow-hidden text-[#74FA6A]" aria-hidden="true">
              <span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" />
              <span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" />
              <span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" />
            </span>
            Scratch Agent
          </Link>
          <HeaderNav links={["solutions", "pricing"]} ctaHref="/new" ctaKey="createPlan" />
        </div>
      </header>

      {/* Hero seragam — satu spesifikasi via PageHero (sama dengan /solutions dan /pricing) */}
      <PageHero eyebrow={c.badge} title={c.heroTitle} sub={c.heroSub}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#quickstart" className="rounded-full bg-[#74FA6A] px-6 py-2.5 text-[13.5px] font-bold text-black transition hover:bg-[#A8FF9B]">{c.heroQuickstart}</a>
          <a href="#konsep" className="rounded-full border border-white/[.12] bg-transparent px-6 py-2.5 text-[13.5px] font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white">{c.heroConcepts}</a>
        </div>
      </PageHero>

      {/* Body: konten tengah + TOC kanan */}
      <div className="mx-auto flex max-w-[1200px] gap-16 px-6 pb-28">
        <article className="min-w-0 flex-1">
          <div className="mx-auto max-w-[720px]">
            {/* 01 · QUICKSTART */}
            <SectionHead id="quickstart" label={c.quickstartLabel} title={c.quickstartTitle} lead={c.quickstartLead} />
            <div className="mt-12">
              <QuickstartVisual />
            </div>

            {/* 02 · KONSEP */}
            <SectionHead id="konsep" label={c.conceptsLabel} title={c.conceptsTitle} lead={c.conceptsLead} />
            <div className="mt-12 space-y-8">
              <ConceptPipeline />
              <div className="grid gap-4 sm:grid-cols-2">
                {c.concepts.map((item) => (
                  <div key={item.t} className="rounded-2xl border border-white/[.08] bg-[#141414] p-6 transition-colors hover:border-white/[.14]">
                    <h3 className="text-[16px] font-semibold tracking-[-.01em] text-[#EDEDED]">{item.t}</h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#A0A0A0]">{item.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 03 · PROMPT AGENT */}
            <SectionHead id="prompt" label={c.promptLabel} title={c.promptTitle} lead={c.promptLead} />
            <div className="mt-12 space-y-8">
              <PromptVisual />
              <div className="grid gap-4 sm:grid-cols-2">
                {c.promptCards.map((item) => (
                  <div key={item.t} className="rounded-2xl border border-white/[.08] bg-[#141414] p-6 transition-colors hover:border-white/[.14]">
                    <h3 className="text-[16px] font-semibold tracking-[-.01em] text-[#EDEDED]">{item.t}</h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#A0A0A0]">{item.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 04 · FAQ */}
            <SectionHead id="faq" label={c.faqLabel} title={c.faqTitle} />
            <div className="mt-12 space-y-3">
              {c.faqs.map((item, i) => (
                <details key={item.q} className="group rounded-2xl border border-[#74FA6A]/20 bg-gradient-to-r from-[#EDFBEA]/[0.06] to-[#D4F5CF]/[0.04] px-6 py-5 shadow-[inset_0_1px_1px_rgba(116,250,106,0.08)] backdrop-blur-sm transition-all duration-200 open:border-[#74FA6A]/40 open:bg-gradient-to-r open:from-[#EDFBEA]/[0.09] open:to-[#D4F5CF]/[0.06] hover:border-[#74FA6A]/35 hover:from-[#EDFBEA]/[0.08]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-[#E4F5E1] [&::-webkit-details-marker]:hidden">
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-[11px] tabular-nums text-[#74FA6A]/50">{String(i + 1).padStart(2, "0")}</span>
                      {item.q}
                    </span>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#74FA6A] text-[16px] font-bold text-black shadow-[0_0_10px_rgba(116,250,106,0.35)] transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-[68ch] text-[14px] leading-[1.7] text-[#A9C5A7]">{item.a}</p>
                </details>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-20 rounded-2xl border border-white/[.08] bg-[#141414] p-8 text-center">
              <p className="text-[18px] font-medium tracking-[-.01em] text-[#EDEDED]">{c.ctaTitle}</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-6 text-[#A0A0A0]">{c.ctaSub}</p>
              <Link href="/new" className="mt-6 inline-flex rounded-full bg-[#74FA6A] px-6 py-2.5 text-[15px] font-medium text-[#0d0d0d] transition-opacity hover:opacity-90">{c.ctaButton}</Link>
            </div>
          </div>
        </article>

        <DocsToc />
      </div>

      <footer className="border-t border-white/[.08] px-6 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 text-[13px] text-[#737373]">
          <span>{c.footer}</span>
          <span className="flex gap-6">
            <Link href="/" className="transition-colors hover:text-[#74FA6A]">home</Link>
            <Link href="/pricing" className="transition-colors hover:text-[#74FA6A]">pricing</Link>
            <Link href="/project/demo" className="transition-colors hover:text-[#74FA6A]">demo</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
