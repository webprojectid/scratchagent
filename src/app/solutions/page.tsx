"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { PageHero } from "@/components/page-hero";
import { useLang } from "@/lib/lang";
import { solutionsCopy } from "@/lib/copy-solutions";

function Eyebrow({ children }: { children: string }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-primary">{children}</p>;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-foreground">
      <span className="relative grid size-6 place-items-center overflow-hidden text-primary" aria-hidden="true"><span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" /><span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" /><span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-primary" /></span>
      Scratch Agent
    </Link>
  );
}

export default function SolutionsPage() {
  const lang = useLang();
  const c = solutionsCopy(lang);

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_srgb,_var(--theme-bg)_85%,_transparent)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between gap-3 px-5 max-lg:h-auto max-lg:min-h-[54px] max-lg:flex-wrap max-lg:py-2.5">
          <Logo />
          <HeaderNav links={["pricing", "docs"]} ctaHref="/new" ctaKey="createPlan" />
        </div>
      </header>

      {/* Hero seragam — satu spesifikasi via PageHero (sama dengan /pricing dan /docs) */}
      <PageHero eyebrow={c.heroEyebrow} title={c.heroTitle} sub={c.heroSub}>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {c.personas.map((persona, i) => (
            <a key={persona.id} href={`#${persona.id}`} className="rounded-full border border-border px-4 py-2 font-mono text-[11px] text-foreground transition-colors hover:border-primary/50 hover:text-primary"><span className="mr-2 text-primary/60">0{i + 1}</span>{persona.label}</a>
          ))}
        </div>
      </PageHero>

      {/* SOLO DEV: teks kiri, mock progress di kanan */}
      <section id="solo-dev" className="scroll-mt-24 border-b border-border">
        <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-5 py-16 md:grid-cols-[1fr_1.05fr] md:py-20">
          <div>
            <Eyebrow>{c.soloEyebrow}</Eyebrow>
            <h2 className="mt-3 text-balance text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-[-.045em] text-foreground">{c.soloTitle}</h2>
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">{c.problemLabel}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-[1.7] text-muted-foreground">{c.soloProblem}</p>
              </div>
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">{c.helpLabel}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-[1.7] text-muted-foreground">{c.soloHelp}</p>
              </div>
            </div>
            <Link href="/new" className="mt-8 inline-flex rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition hover:bg-primary">{c.soloCta}</Link>
          </div>
          <BriefToPlanMock />
        </div>
      </section>

      {/* FREELANCER: artefak PRD jadi pusat, teks kanan */}
      <section id="freelancer" className="scroll-mt-24 border-b border-border">
        <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:py-20">
          <PrdArtifactMock />
          <div>
            <Eyebrow>{c.freeEyebrow}</Eyebrow>
            <h2 className="mt-3 text-balance text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-[-.045em] text-foreground">{c.freeTitle}</h2>
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">{c.problemLabel}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-[1.7] text-muted-foreground">{c.freeProblem}</p>
              </div>
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">{c.helpLabel}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-[1.7] text-muted-foreground">{c.freeHelp}</p>
              </div>
            </div>
            <Link href="/pricing" className="mt-8 inline-flex rounded-full border border-border px-5 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary">{c.freeCta}</Link>
          </div>
        </div>
      </section>

      {/* OPERATOR: teks singkat di atas, terminal misi selebar konten */}
      <section id="operator" className="scroll-mt-24">
        <div className="mx-auto max-w-[1100px] px-5 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <Eyebrow>{c.opEyebrow}</Eyebrow>
              <h2 className="mt-3 text-balance text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-[-.045em] text-foreground">{c.opTitle}</h2>
              <p className="mt-5 max-w-[54ch] text-[14px] leading-[1.7] text-muted-foreground">{c.opProblem}</p>
            </div>
            <div className="md:pt-9">
              <p className="max-w-[54ch] text-[14px] leading-[1.7] text-muted-foreground">{c.opHelp}</p>
              <Link href="/docs" className="mt-7 inline-flex rounded-full border border-border px-5 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary">{c.opCta}</Link>
            </div>
          </div>
          <MissionTerminalMock />
        </div>
      </section>

      {/* CTA penutup */}
      <section className="mx-auto max-w-[1100px] px-5 pb-24 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-primary/20 bg-primary/[.05] px-6 py-5">
          <p className="max-w-[52ch] text-sm leading-6 text-muted-foreground">{c.closingText}</p>
          <Link href="/new" className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition hover:bg-primary">{c.closingCta}</Link>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-muted-foreground">
          <span>{c.footer}</span>
          <span className="flex gap-5">
            <Link href="/" className="transition-colors hover:text-primary">home</Link>
            <Link href="/pricing" className="transition-colors hover:text-primary">pricing</Link>
            <Link href="/docs" className="transition-colors hover:text-primary">docs</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}

/* Brief singkat jadi plan lengkap: mock state progression, bukan card generik. */
function BriefToPlanMock() {
  const c = solutionsCopy(useLang());
  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-background transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-[var(--theme-accent)]/5">
      <div className="border-b border-border px-5 py-3.5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{c.briefLabel}</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-[13px] leading-[1.7] text-foreground">{c.briefSample}</p>
      </div>
      <div className="flex items-center gap-3 px-5 pb-3 font-mono text-[10px] uppercase tracking-[.16em] text-primary/70">
        <span className="h-px w-6 bg-primary/30" />generate plan
      </div>
      <div className="border-t border-border px-5 py-4">
        <ul className="space-y-3">
          {c.briefRows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold ${row.state === "live" ? "border border-primary/50 bg-primary/[.08] text-primary" : "bg-primary/15 text-primary"}`}>{row.state === "live" ? "▸" : "✓"}</span>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{row.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{row.detail}</p>
                </div>
              </div>
              <span className={`font-mono text-[10px] font-bold uppercase tracking-[.14em] ${row.state === "live" ? "text-primary" : "text-muted-foreground"}`}>{row.state === "live" ? "live" : c.briefReady}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-foreground/[.07]">
          <div className="h-full w-[39%] rounded-full bg-primary" />
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">{c.briefProgress}</p>
      </div>
    </div>
  );
}

/* PRD sebagai artefak yang bisa dipresentasikan ke klien. */
function PrdArtifactMock() {
  const c = solutionsCopy(useLang());
  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-background transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-[var(--theme-accent)]/5">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{c.prdLabel}</p>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold text-primary">v1</span>
      </div>
      <div className="px-5 py-5">
        <p className="text-[15px] font-semibold tracking-[-.02em] text-foreground">{c.prdTitle}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{c.prdMeta}</p>
        <div className="mt-5 space-y-4">
          <div className="rounded-[10px] border border-border bg-background p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-primary">{c.prdFeatureLabel}</p>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-[1.6] text-muted-foreground">
              {c.prdFeatureItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-[10px] border border-border bg-background p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-primary">{c.prdCriteriaLabel}</p>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-[1.6] text-muted-foreground">
              {c.prdCriteriaItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
          <span>{c.prdScope}</span>
          <span className="text-primary">{c.prdAgreed}</span>
        </div>
      </div>
    </div>
  );
}

/* Terminal misi agent: satu prompt, agent loop ambil, kerjakan, lapor. */
function MissionTerminalMock() {
  const c = solutionsCopy(useLang());
  const [l1, l2, l3, l4, l5, l6] = c.missionLines;
  return (
    <div className="mt-10 overflow-hidden rounded-[16px] border border-border bg-background transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-[var(--theme-accent)]/5">
      <div className="flex items-center gap-1.5 border-b border-border px-5 py-3">
        <i className="size-2.5 rounded-full bg-destructive" /><i className="size-2.5 rounded-full bg-primary" /><i className="size-2.5 rounded-full bg-primary" />
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">{c.missionLabel}</span>
      </div>
      <div className="px-5 py-5 font-mono text-[12.5px] leading-[2.1] text-foreground">
        <p><span className="text-primary">$</span> {l1}</p>
        <p><span className="text-muted-foreground">&gt;</span> {l2}</p>
        <p><span className="text-muted-foreground">&gt;</span> {l3} <span className="text-primary">OK</span></p>
        <p><span className="text-muted-foreground">&gt;</span> {l4} <span className="text-primary">OK</span></p>
        <p><span className="text-muted-foreground">&gt;</span> {l5} <span className="text-primary">{c.missionPause}</span></p>
        <p><span className="text-muted-foreground">&gt;</span> {l6} <span className="text-primary">{c.missionSafe}</span></p>
      </div>
    </div>
  );
}
