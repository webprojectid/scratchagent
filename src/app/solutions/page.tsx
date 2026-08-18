"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { PageHero } from "@/components/page-hero";
import { useLang } from "@/lib/lang";
import { solutionsCopy } from "@/lib/copy-solutions";

function Eyebrow({ children }: { children: string }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[#8FDB90]">{children}</p>;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-[#E8F0E8]">
      <span className="relative grid size-6 place-items-center overflow-hidden text-[#74FA6A]" aria-hidden="true"><span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" /><span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" /><span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" /></span>
      Scratch Agent
    </Link>
  );
}

export default function SolutionsPage() {
  const lang = useLang();
  const c = solutionsCopy(lang);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E8EDEC] selection:bg-[#74FA6A]/30 selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[rgba(10,10,10,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-5">
          <Logo />
          <HeaderNav links={["pricing", "docs"]} ctaHref="/new" ctaKey="createPlan" />
        </div>
      </header>

      {/* Hero seragam — satu spesifikasi via PageHero (sama dengan /pricing dan /docs) */}
      <PageHero eyebrow={c.heroEyebrow} title={c.heroTitle} sub={c.heroSub}>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {c.personas.map((persona, i) => (
            <a key={persona.id} href={`#${persona.id}`} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[11px] text-white/70 transition-colors hover:border-[#74FA6A]/50 hover:text-[#74FA6A]"><span className="mr-2 text-[#74FA6A]/60">0{i + 1}</span>{persona.label}</a>
          ))}
        </div>
      </PageHero>

      {/* SOLO DEV: teks kiri, mock progress di kanan */}
      <section id="solo-dev" className="scroll-mt-24 border-b border-white/[.05]">
        <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-5 py-16 md:grid-cols-[1fr_1.05fr] md:py-20">
          <div>
            <Eyebrow>{c.soloEyebrow}</Eyebrow>
            <h2 className="mt-3 text-balance text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-[-.045em] text-[#F0F3F5]">{c.soloTitle}</h2>
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-white/35">{c.problemLabel}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-[1.7] text-[#8C97A5]">{c.soloProblem}</p>
              </div>
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-white/35">{c.helpLabel}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-[1.7] text-[#8C97A5]">{c.soloHelp}</p>
              </div>
            </div>
            <Link href="/new" className="mt-8 inline-flex rounded-full bg-[#74FA6A] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#A8FF9B]">{c.soloCta}</Link>
          </div>
          <BriefToPlanMock />
        </div>
      </section>

      {/* FREELANCER: artefak PRD jadi pusat, teks kanan */}
      <section id="freelancer" className="scroll-mt-24 border-b border-white/[.05]">
        <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:py-20">
          <PrdArtifactMock />
          <div>
            <Eyebrow>{c.freeEyebrow}</Eyebrow>
            <h2 className="mt-3 text-balance text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-[-.045em] text-[#F0F3F5]">{c.freeTitle}</h2>
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-white/35">{c.problemLabel}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-[1.7] text-[#8C97A5]">{c.freeProblem}</p>
              </div>
              <div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-white/35">{c.helpLabel}</h3>
                <p className="mt-2 max-w-[54ch] text-[14px] leading-[1.7] text-[#8C97A5]">{c.freeHelp}</p>
              </div>
            </div>
            <Link href="/pricing" className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-[#74FA6A]/50 hover:text-[#74FA6A]">{c.freeCta}</Link>
          </div>
        </div>
      </section>

      {/* OPERATOR: teks singkat di atas, terminal misi selebar konten */}
      <section id="operator" className="scroll-mt-24">
        <div className="mx-auto max-w-[1100px] px-5 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <Eyebrow>{c.opEyebrow}</Eyebrow>
              <h2 className="mt-3 text-balance text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-[-.045em] text-[#F0F3F5]">{c.opTitle}</h2>
              <p className="mt-5 max-w-[54ch] text-[14px] leading-[1.7] text-[#8C97A5]">{c.opProblem}</p>
            </div>
            <div className="md:pt-9">
              <p className="max-w-[54ch] text-[14px] leading-[1.7] text-[#8C97A5]">{c.opHelp}</p>
              <Link href="/docs" className="mt-7 inline-flex rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:border-[#74FA6A]/50 hover:text-[#74FA6A]">{c.opCta}</Link>
            </div>
          </div>
          <MissionTerminalMock />
        </div>
      </section>

      {/* CTA penutup */}
      <section className="mx-auto max-w-[1100px] px-5 pb-24 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-[#74FA6A]/20 bg-[#74FA6A]/[.05] px-6 py-5">
          <p className="max-w-[52ch] text-sm leading-6 text-[#A9C5A7]">{c.closingText}</p>
          <Link href="/new" className="rounded-full bg-[#74FA6A] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#A8FF9B]">{c.closingCta}</Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-[#5B6676]">
          <span>{c.footer}</span>
          <span className="flex gap-5">
            <Link href="/" className="transition-colors hover:text-[#74FA6A]">home</Link>
            <Link href="/pricing" className="transition-colors hover:text-[#74FA6A]">pricing</Link>
            <Link href="/docs" className="transition-colors hover:text-[#74FA6A]">docs</Link>
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
    <div className="overflow-hidden rounded-[16px] border border-white/10 bg-[#111413]">
      <div className="border-b border-white/[.07] px-5 py-3.5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-white/30">{c.briefLabel}</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-[13px] leading-[1.7] text-[#C5CDD7]">{c.briefSample}</p>
      </div>
      <div className="flex items-center gap-3 px-5 pb-3 font-mono text-[10px] uppercase tracking-[.16em] text-[#74FA6A]/70">
        <span className="h-px w-6 bg-[#74FA6A]/30" />generate plan
      </div>
      <div className="border-t border-white/[.07] px-5 py-4">
        <ul className="space-y-3">
          {c.briefRows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold ${row.state === "live" ? "border border-[#74FA6A]/50 bg-[#74FA6A]/[.08] text-[#74FA6A]" : "bg-[#74FA6A]/15 text-[#74FA6A]"}`}>{row.state === "live" ? "▸" : "✓"}</span>
                <div>
                  <p className="text-[13px] font-medium text-[#E8EDEC]">{row.label}</p>
                  <p className="font-mono text-[11px] text-[#5B6676]">{row.detail}</p>
                </div>
              </div>
              <span className={`font-mono text-[10px] font-bold uppercase tracking-[.14em] ${row.state === "live" ? "text-[#74FA6A]" : "text-white/25"}`}>{row.state === "live" ? "live" : c.briefReady}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[.07]">
          <div className="h-full w-[39%] rounded-full bg-[#74FA6A]" />
        </div>
        <p className="mt-2 font-mono text-[10px] text-[#5B6676]">{c.briefProgress}</p>
      </div>
    </div>
  );
}

/* PRD sebagai artefak yang bisa dipresentasikan ke klien. */
function PrdArtifactMock() {
  const c = solutionsCopy(useLang());
  return (
    <div className="overflow-hidden rounded-[16px] border border-white/10 bg-[#111413]">
      <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-3.5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-white/30">{c.prdLabel}</p>
        <span className="rounded-full bg-[#74FA6A]/10 px-2.5 py-1 font-mono text-[10px] font-bold text-[#74FA6A]">v1</span>
      </div>
      <div className="px-5 py-5">
        <p className="text-[15px] font-semibold tracking-[-.02em] text-[#F0F3F5]">{c.prdTitle}</p>
        <p className="mt-1 font-mono text-[11px] text-[#5B6676]">{c.prdMeta}</p>
        <div className="mt-5 space-y-4">
          <div className="rounded-[10px] border border-white/[.07] bg-[#0D0F0E] p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#74FA6A]">{c.prdFeatureLabel}</p>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-[1.6] text-[#A9B4C0]">
              {c.prdFeatureItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-[10px] border border-white/[.07] bg-[#0D0F0E] p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#74FA6A]">{c.prdCriteriaLabel}</p>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-[1.6] text-[#A9B4C0]">
              {c.prdCriteriaItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-white/[.07] pt-4 font-mono text-[11px] text-[#5B6676]">
          <span>{c.prdScope}</span>
          <span className="text-[#74FA6A]">{c.prdAgreed}</span>
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
    <div className="mt-10 overflow-hidden rounded-[16px] border border-white/10 bg-[#0D0F0E]">
      <div className="flex items-center gap-1.5 border-b border-white/[.07] px-5 py-3">
        <i className="size-2.5 rounded-full bg-[#FF5F56]" /><i className="size-2.5 rounded-full bg-[#FFBD2E]" /><i className="size-2.5 rounded-full bg-[#74FA6A]" />
        <span className="ml-3 font-mono text-[11px] text-[#5B6676]">{c.missionLabel}</span>
      </div>
      <div className="px-5 py-5 font-mono text-[12.5px] leading-[2.1] text-[#C5CDD7]">
        <p><span className="text-[#74FA6A]">$</span> {l1}</p>
        <p><span className="text-white/35">&gt;</span> {l2}</p>
        <p><span className="text-white/35">&gt;</span> {l3} <span className="text-[#74FA6A]">OK</span></p>
        <p><span className="text-white/35">&gt;</span> {l4} <span className="text-[#74FA6A]">OK</span></p>
        <p><span className="text-white/35">&gt;</span> {l5} <span className="text-[#FFBD2E]">{c.missionPause}</span></p>
        <p><span className="text-white/35">&gt;</span> {l6} <span className="text-[#74FA6A]">{c.missionSafe}</span></p>
      </div>
    </div>
  );
}
