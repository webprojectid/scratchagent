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
  return <p className="text-[12px] font-medium uppercase tracking-[.08em] text-primary">{children}</p>;
}

function SectionHead({ id, label, title, lead }: { id: string; label: string; title: string; lead?: string }) {
  return (
    <div id={id} className="scroll-mt-24 pt-20 md:pt-24">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="mt-3 text-balance text-[32px] font-semibold leading-[1.1] tracking-[-.02em] text-foreground">{title}</h2>
      {lead && <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-muted-foreground">{lead}</p>}
    </div>
  );
}

export default function DocsPage() {
  const lang = useLang();
  const c = docsCopy(lang);

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-muted-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_srgb,_var(--theme-bg)_85%,_transparent)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between gap-3 px-5 max-lg:h-auto max-lg:min-h-[54px] max-lg:flex-wrap max-lg:py-2.5">
          <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-foreground">
            <span className="relative grid size-6 place-items-center overflow-hidden text-primary" aria-hidden="true">
              <span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" />
              <span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" />
              <span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" />
            </span>
            Scratch Agent
          </Link>
          <HeaderNav links={["solutions", "pricing"]} ctaHref="/new" ctaKey="createPlan" />
        </div>
      </header>

      {/* Hero seragam — satu spesifikasi via PageHero (sama dengan /solutions dan /pricing) */}
      <PageHero eyebrow={c.badge} title={c.heroTitle} sub={c.heroSub}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#quickstart" className="rounded-full bg-primary px-6 py-2.5 text-[13.5px] font-bold text-primary-foreground transition hover:bg-primary">{c.heroQuickstart}</a>
          <a href="#konsep" className="rounded-full border border-border bg-transparent px-6 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:border-border hover:text-foreground">{c.heroConcepts}</a>
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
                  <div key={item.t} className="rounded-2xl border border-border bg-background p-6 transition-colors hover:border-border">
                    <h3 className="text-[16px] font-semibold tracking-[-.01em] text-foreground">{item.t}</h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">{item.d}</p>
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
                  <div key={item.t} className="rounded-2xl border border-border bg-background p-6 transition-colors hover:border-border">
                    <h3 className="text-[16px] font-semibold tracking-[-.01em] text-foreground">{item.t}</h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">{item.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-20 rounded-2xl border border-border bg-background p-8 text-center">
              <p className="text-[18px] font-medium tracking-[-.01em] text-foreground">{c.ctaTitle}</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-6 text-muted-foreground">{c.ctaSub}</p>
              <Link href="/new" className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-[15px] font-medium text-muted-foreground transition-opacity hover:opacity-90">{c.ctaButton}</Link>
            </div>
          </div>
        </article>

        <DocsToc />
      </div>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 text-[13px] text-muted-foreground">
          <span>{c.footer}</span>
          <span className="flex gap-6">
            <Link href="/" className="transition-colors hover:text-primary">home</Link>
            <Link href="/pricing" className="transition-colors hover:text-primary">pricing</Link>
            <Link href="/project/demo" className="transition-colors hover:text-primary">demo</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
