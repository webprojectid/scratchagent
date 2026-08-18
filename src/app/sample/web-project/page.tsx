"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { HeroSectionBasic } from "@/components/ui/hero-spline-basic-demo";
import { DemoOne } from "@/components/ui/neural-vortex-demo";
import { useLang } from "@/lib/lang";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-[#E8F0E8]">
      <span className="relative grid size-6 place-items-center overflow-hidden text-[#74FA6A]" aria-hidden="true">
        <span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" />
        <span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" />
        <span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" />
      </span>
      Scratch Agent
    </Link>
  );
}

export default function SampleWebProjectPage() {
  const lang = useLang();

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E8EDEC] selection:bg-[#74FA6A]/30 selection:text-black">
      {/* Header konsisten dengan /solutions, /pricing, /docs */}
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[rgba(10,10,10,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between px-5">
          <Logo />
          <HeaderNav links={["solutions", "docs"]} ctaHref="/login" ctaKey="login" />
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-5 pb-24 pt-14 md:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">web project</p>
            <h1 className="mt-4 max-w-[22ch] text-balance text-[clamp(2rem,3.6vw,3.1rem)] font-medium leading-[1.02] tracking-[-.05em] text-[#F0F3F5]">
              {lang === "en" ? "One brief, one full website." : "Satu brief, satu website utuh."}
            </h1>
          </div>
          <p className="max-w-[42ch] text-sm leading-6 text-[#8C97A5]">
            {lang === "en"
              ? "Websites generated from a short brief, running below as if you opened them directly in the browser."
              : "Website hasil generasi dari brief singkat, berjalan di bawah seolah kamu membukanya langsung di browser."}
          </p>
        </div>

        {/* Sample 1: hero Spline galaxy — berjalan di dalam frame Safari dark-mode */}
        <div className="mt-10">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">sample 01</span>
            <span className="h-px flex-1 bg-white/[.08]" aria-hidden="true" />
          </div>
          <HeroSectionBasic />
        </div>

        {/* Sample 2: neural-vortex WebGL — frame Safari dark-mode */}
        <div id="sample-2" className="mt-16 scroll-mt-20">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">sample 02</span>
            <span className="h-px flex-1 bg-white/[.08]" aria-hidden="true" />
          </div>
          <DemoOne />
        </div>
      </section>
    </main>
  );
}
