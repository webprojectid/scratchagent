"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { PricingCards } from "./pricing-cards";
import { HeaderNav } from "@/components/header-nav";
import { useLang } from "@/lib/lang";
import { pricingCopy } from "@/lib/copy-pricing";
import { useCurrentUser } from "@/lib/current-user";

function CellValue({ value, yesLabel, noLabel }: { value: string | boolean; yesLabel: string; noLabel: string }) {
  if (value === true) return <Check size={14} className="text-[#74FA6A]" aria-label={yesLabel} />;
  if (value === false)
    return (
      <span className="text-white/20" aria-label={noLabel}>
        ·
      </span>
    );
  return <span className="text-[12.5px] text-[#C5CDD7]">{value}</span>;
}

export default function PricingPage() {
  const lang = useLang();
  const c = pricingCopy(lang);
  const { user } = useCurrentUser();
  const loggedIn = !!user;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E8EDEC] selection:bg-[#74FA6A]/30 selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[.06] bg-[rgba(10,10,10,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex h-[54px] max-w-[1100px] items-center justify-between gap-3 px-5 max-lg:h-auto max-lg:min-h-[54px] max-lg:flex-wrap max-lg:py-2.5">
          <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-.04em] text-[#E8F0E8]">
            <span className="relative grid size-6 place-items-center overflow-hidden text-[#74FA6A]" aria-hidden="true">
              <span className="absolute left-0 top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" />
              <span className="absolute left-[7px] top-[2.5px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" />
              <span className="absolute left-[14px] top-[6px] h-2.5 w-2 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" />
            </span>
            Scratch Agent
          </Link>
          <HeaderNav links={["solutions", "docs"]} />
        </div>
      </header>

      {/* Section 1: Hero seragam — satu spesifikasi via PageHero (sama dengan /solutions dan /docs). */}
      <PageHero title={c.heroTitle} sub={c.heroSub}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link
            href={loggedIn ? "/new" : "/login"}
            className="rounded-full bg-[#74FA6A] px-6 py-3 text-[13.5px] font-bold text-black transition hover:bg-[#A8FF9B] active:scale-[.985]"
          >
            {c.heroCta}
          </Link>
          <a
            href="#perbandingan"
            className="text-[13px] font-medium text-[#C5CDD7] underline decoration-white/20 underline-offset-[6px] transition-colors hover:text-[#74FA6A] hover:decoration-[#74FA6A]/50"
          >
            {c.compareLink}
          </a>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11px] text-white/40">
          {c.trust.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check size={12} className="text-[#74FA6A]" /> {t}
            </span>
          ))}
        </div>
      </PageHero>

      {/* Section 2: Tier cards. Dua kartu terpisah, Pro di-emphasis lewat warna, bukan ukuran. */}
      <section className="relative mx-auto max-w-[1100px] px-5 pt-4">
        <div className="price-rise flex flex-wrap items-end justify-between gap-3" style={{ animationDelay: ".06s" }}>
          <div>
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold tracking-[-.045em] text-[#F0F3F5]">
              {c.tiersTitle}
            </h2>
          </div>
          <p className="max-w-[38ch] pb-1 font-mono text-[11px] leading-4 text-white/35">{c.tiersNote}</p>
        </div>

        <div className="mx-auto mt-8">
          <PricingCards />
        </div>
      </section>

      {/* Section 3: Perbandingan. Caption sepertiga kiri, tabel dua pertiga kanan, latar dot grid halus. */}
      <section id="perbandingan" className="relative mt-24 border-y border-white/[.05] py-20 md:mt-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[.5]"
          style={{
            backgroundImage: "radial-gradient(rgba(232,237,236,.05) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse 80% 90% at 50% 50%, black, transparent)",
          }}
        />
        <div className="price-rise relative mx-auto grid max-w-[1100px] gap-10 px-5 lg:grid-cols-[.85fr_1.6fr]">
          <div className="lg:pt-2">
            <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold tracking-[-.045em] text-[#F0F3F5]">
              {c.compareTitle}
            </h2>
            <p className="mt-4 max-w-[36ch] text-[13.5px] leading-[1.7] text-[#8C97A5]">{c.compareSub}</p>
          </div>
          <div className="overflow-x-auto rounded-[14px] border border-white/10 bg-[#0C0F0D]/80 backdrop-blur-sm max-lg:[&>table]:min-w-0">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-[#111413]">
                  <th className="px-5 py-4 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/35">{c.colFeature}</th>
                  <th className="px-5 py-4 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white/35">Free</th>
                  <th className="bg-[#11170F] px-5 py-4 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#74FA6A]">Pro</th>
                </tr>
              </thead>
              <tbody>
                {c.comparison.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`${i < c.comparison.length - 1 ? "border-b border-white/[.06]" : ""} transition-colors hover:bg-white/[.025]`}
                  >
                    <td className="px-5 py-3.5 text-[13px] font-medium text-[#C5CDD7]">{row.label}</td>
                    <td className="px-5 py-3.5"><CellValue value={row.free} yesLabel={c.yesLabel} noLabel={c.noLabel} /></td>
                    <td className="bg-[#11170F]/60 px-5 py-3.5"><CellValue value={row.pro} yesLabel={c.yesLabel} noLabel={c.noLabel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 4: FAQ — full-bleed sage panel, mirrors the Supported AI Tools stage */}
      <section id="faq" className="relative w-full px-0 pt-20 md:pt-24">
        <div className="relative w-full overflow-hidden bg-[#9EC5AB] px-6 py-14 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] md:px-12 md:py-16">
          {/* Subtle grid texture, same recipe as Supported AI Tools */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(hsla(0,0%,100%,0.10) 1px, transparent 0), linear-gradient(90deg, hsla(0,0%,100%,0.10) 1px, transparent 0)",
              backgroundSize: "60px 60px",
              maskImage: "radial-gradient(ellipse 60% 80% at 50% 0%, #000 0%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 60% 80% at 50% 0%, #000 0%, transparent 100%)",
            }}
          />
          <div className="price-rise relative mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[1.5fr_.8fr]">
            {/* Left: accordion FAQ list */}
            <div className="space-y-3">
              {c.faqs.map((item, i) => (
                <details
                  key={item.q}
                  className="group rounded-[20px] border border-[#0F1A12]/10 bg-[#F6FAF7]/90 px-6 py-5 shadow-[0_2px_10px_-2px_rgba(15,26,18,0.12)] transition-all duration-300 hover:border-[#0F1A12]/25 hover:bg-white hover:shadow-[0_8px_24px_-6px_rgba(15,26,18,0.22)]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-[#1A2B1F] [&::-webkit-details-marker]:hidden">
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-[11px] tabular-nums text-[#33473A]/70">{String(i + 1).padStart(2, "0")}</span>
                      {item.q}
                    </span>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0F1A12] text-[16px] font-bold text-[#9EC5AB] transition-transform duration-300 group-open:rotate-45 leading-none select-none">+</span>
                  </summary>
                  <p className="mt-3 max-w-[62ch] text-[14px] leading-[1.75] text-[#33473A] animate-in fade-in-50 duration-200">{item.a}</p>
                </details>
              ))}
            </div>

            {/* Right: title + caption */}
            <div className="lg:pt-1">
              <h2 className="text-[clamp(1.5rem,2.8vw,2.1rem)] font-semibold tracking-[-.045em] text-[#0F1A12]">
                {c.faqTitle}
              </h2>
              <p className="mt-4 max-w-[34ch] text-[13.5px] leading-[1.7] text-[#33473A]">{c.faqSub}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Final CTA. Mini banner, satu aksi, satu trust cue. */}
      <section className="mx-auto max-w-[1100px] px-5 pb-24 pt-20 md:pt-24">
        <div className="price-rise flex flex-wrap items-center justify-between gap-6 rounded-[20px] border border-[#74FA6A]/25 bg-gradient-to-br from-[#74FA6A]/[.09] via-[#74FA6A]/[.04] to-transparent px-8 py-9">
          <div>
            <h2 className="text-[clamp(1.3rem,2.4vw,1.8rem)] font-semibold tracking-[-.04em] text-[#EDF8EA]">
              {c.finalTitle}
            </h2>
            <p className="mt-2 max-w-[52ch] text-[13.5px] leading-6 text-[#A9C5A7]">{c.finalSub}</p>
          </div>
          <Link
            href={loggedIn ? "/new" : "/login"}
            className="rounded-full bg-[#74FA6A] px-7 py-3.5 text-[14px] font-bold text-black transition hover:bg-[#A8FF9B] active:scale-[.985]"
          >
            {c.finalCta}
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-[#5B6676]">
          <span>{c.footer}</span>
          <span className="flex gap-5">
            <Link href="/" className="transition-colors hover:text-[#74FA6A]">home</Link>
            <Link href="/solutions" className="transition-colors hover:text-[#74FA6A]">solutions</Link>
            <Link href="/docs" className="transition-colors hover:text-[#74FA6A]">docs</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
