"use client";

import Link from "next/link";
import { DocsToc } from "@/components/docs-toc";
import { ConceptPipeline, PromptVisual, QuickstartVisual } from "@/components/docs-visuals";
import { LandingNavbar } from "@/components/landing-navbar";
import { PageHero } from "@/components/page-hero";
import { useLang } from "@/lib/lang";
import { docsCopy } from "@/lib/copy-docs";

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
    <main className="min-h-screen bg-[#0A0A0A] pt-4 text-[#EDEDED] selection:bg-[#74FA6A]/30 selection:text-[#0d0d0d]">
      <LandingNavbar />

      {/* Hero seragam — satu spesifikasi via PageHero (sama dengan /solutions dan /pricing) */}
      <PageHero eyebrow={c.badge} title={c.heroTitle} sub={c.heroSub}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#quickstart" className="rounded-full bg-[#74FA6A] px-6 py-2.5 text-[13.5px] font-bold text-black transition hover:bg-[#A8FF9B]">{c.heroQuickstart}</a>
          <a href="#konsep" className="rounded-full bg-transparent px-6 py-2.5 text-[13.5px] font-medium text-white/70 transition-colors hover:text-white">{c.heroConcepts}</a>
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
                  <div key={item.t} className="rounded-2xl bg-[#151918] p-6 transition-colors ">
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
                  <div key={item.t} className="rounded-2xl bg-[#151918] p-6 transition-colors ">
                    <h3 className="text-[16px] font-semibold tracking-[-.01em] text-[#EDEDED]">{item.t}</h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#A0A0A0]">{item.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-20 rounded-2xl bg-[#151918] p-8 text-center">
              <p className="text-[18px] font-medium tracking-[-.01em] text-[#EDEDED]">{c.ctaTitle}</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-6 text-[#A0A0A0]">{c.ctaSub}</p>
              <Link href="/new" className="mt-6 inline-flex rounded-full bg-[#74FA6A] px-6 py-2.5 text-[15px] font-medium text-[#0d0d0d] transition-opacity hover:opacity-90">{c.ctaButton}</Link>
            </div>
          </div>
        </article>

        <DocsToc />
      </div>

      <footer className="px-6 py-10">
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
