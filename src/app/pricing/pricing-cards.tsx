"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Sparkles, Users, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as PricingCard from "@/components/ui/pricing-card";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/lang";
import { pricingCopy } from "@/lib/copy-pricing";
import { getCurrentUser } from "@/lib/current-user";

type Billing = "monthly" | "quarterly";

const PRO_MONTHLY_PRICE = 39_000;
const QUARTER_MONTHS = 3;
const QUARTER_DISCOUNT = 0.2;
const QUARTER_FULL = PRO_MONTHLY_PRICE * QUARTER_MONTHS;
const QUARTER_PRICE = Math.round(QUARTER_FULL * (1 - QUARTER_DISCOUNT));

function formatRb(value: number): string {
  const rb = value / 1000;
  return Number.isInteger(rb) ? `${rb}rb` : `${String(rb).replace(".", ",")}rb`;
}

export function PricingCards() {
  const router = useRouter();
  const lang = useLang();
  const c = pricingCopy(lang);
  const en = lang === "en";
  const [billing, setBilling] = useState<Billing>("monthly");

  const proPrice = billing === "monthly" ? `Rp ${formatRb(PRO_MONTHLY_PRICE)}` : `Rp ${formatRb(QUARTER_PRICE)}`;
  const proPeriod = billing === "monthly" ? c.periodMonth : c.periodQuarter;
  const proStruck = billing === "quarterly" ? `Rp ${formatRb(QUARTER_FULL)}` : undefined;

  /** Check auth and redirect to /new or /login */
  const handleFreePlan = async () => {
    const user = await getCurrentUser();
    if (user) {
      router.push("/new");
    } else {
      router.push("/login");
    }
  };

  /** Fitur Free yang "di-lock" dan baru terbuka di Pro — ditampilkan redup di kartu Free. */
  const freeLocked = en
    ? ["Unlimited plan generates", "Deeper PRD research", "Edit plan structure: add ideas, delete phases, sub-features, tasks", "Projects stored forever"]
    : ["Unlimited generate plan", "PRD riset lebih dalam", "Tambah ide, delete fase, sub-fitur, dan task", "Project disimpan selamanya"];

  return (
    <>
      {/* Billing toggle: 1 bulan atau 3 bulan (hemat 20%) */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full border border-white/12 bg-[#0E110F] p-1" role="group" aria-label={c.billingLabel}>
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            aria-pressed={billing === "monthly"}
            className={`rounded-full px-4 py-2 font-mono text-[12px] font-semibold transition ${
              billing === "monthly" ? "bg-[#74FA6A] text-black" : "text-white/55 hover:text-white"
            }`}
          >
            {c.month1}
          </button>
          <button
            type="button"
            onClick={() => setBilling("quarterly")}
            aria-pressed={billing === "quarterly"}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-mono text-[12px] font-semibold transition ${
              billing === "quarterly" ? "bg-[#74FA6A] text-black" : "text-white/55 hover:text-white"
            }`}
          >
            {c.month3}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] ${
                billing === "quarterly" ? "bg-black/15 text-black" : "bg-[#74FA6A]/[.12] text-[#74FA6A]"
              }`}
            >
              {c.saveBadge}
            </span>
          </button>
        </div>
      </div>

      <div className="relative mx-auto mt-8 flex flex-wrap items-stretch justify-center gap-6">
        {/* Ambient glow di belakang kartu: bahan untuk backdrop-blur kaca,
            sekaligus focal point ke kartu Pro. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-[420px] -translate-y-1/2"
          style={{
            background:
              "radial-gradient(ellipse 38% 60% at 72% 50%, rgba(116,250,106,.14), transparent 70%), radial-gradient(ellipse 30% 50% at 28% 50%, rgba(255,255,255,.04), transparent 70%)",
          }}
        />
        {/* Kartu Free — glass card standar, CTA outline */}
        <PricingCard.Card className="price-rise transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-2xl hover:shadow-[#74FA6A]/5">
          <PricingCard.Header>
            <PricingCard.Plan>
              <PricingCard.PlanName>
                <Users aria-hidden="true" />
                <span className="text-muted-foreground">Free</span>
              </PricingCard.PlanName>
              <PricingCard.Badge>{c.freeTagline}</PricingCard.Badge>
            </PricingCard.Plan>
            <PricingCard.Price>
              <PricingCard.MainPrice>Rp 0</PricingCard.MainPrice>
              <PricingCard.Period>{c.periodForever}</PricingCard.Period>
            </PricingCard.Price>
            <Button
              variant="outline"
              // hover:bg-accent dari variant outline ter-compile ke var(--accent)=lime
              // (token brand menimpa token shadcn); timpa dengan lift putih halus biar
              // teks hover lime tetap kebaca.
              className="w-full rounded-full border-white/15 font-semibold text-white transition-colors hover:border-[#74FA6A]/50 hover:bg-white/[.06] hover:text-[#74FA6A] active:scale-[.985]"
              asChild
            >
              <Link href="/login" onClick={(e) => { e.preventDefault(); handleFreePlan(); }}>{c.freeCta}</Link>
            </Button>
          </PricingCard.Header>
          <PricingCard.Body>
            <PricingCard.List>
              {c.freeFeatures.map((feature) => (
                <PricingCard.ListItem key={feature.text}>
                  <span className="mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-[#74FA6A]" aria-hidden="true" />
                  </span>
                  <span>{feature.text}</span>
                </PricingCard.ListItem>
              ))}
            </PricingCard.List>
            <PricingCard.Separator>{en ? "Pro features" : "Fitur Pro"}</PricingCard.Separator>
            <PricingCard.List>
              {freeLocked.map((item) => (
                <PricingCard.ListItem key={item} className="opacity-75">
                  <span className="mt-0.5">
                    <XCircleIcon className="text-destructive h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>{item}</span>
                </PricingCard.ListItem>
              ))}
            </PricingCard.List>
          </PricingCard.Body>
        </PricingCard.Card>

        {/* Kartu Pro — border lime, CTA lime solid, semua fitur tampil sebagai aktif.
            Override dark: eksplisit biar emphasis lime gak ditimpa dark:border-border/80
            dari komponen dasar. */}
        <PricingCard.Card className="price-rise border-[#74FA6A]/35 dark:border-[#74FA6A]/35 shadow-[0_20px_60px_-30px_rgba(116,250,106,.3)] transition-all duration-300 hover:-translate-y-2 hover:border-[#74FA6A]/60 hover:shadow-[0_25px_70px_-20px_rgba(116,250,106,.45)]" style={{ animationDelay: ".06s" }}>
          <PricingCard.Header className="border-[#74FA6A]/25 bg-[#11170F] dark:bg-[#11170F]">
            <PricingCard.Plan>
              <PricingCard.PlanName>
                <Sparkles aria-hidden="true" className="text-[#74FA6A]" />
                <span className="text-[#74FA6A]">Pro</span>
              </PricingCard.PlanName>
              <PricingCard.Badge className="border-[#74FA6A]/30 text-[#74FA6A]">{c.popularBadge}</PricingCard.Badge>
            </PricingCard.Plan>
            <PricingCard.Price>
              <PricingCard.MainPrice className="text-[#EDF8EA]">{proPrice}</PricingCard.MainPrice>
              <PricingCard.Period className="text-white/50">{proPeriod}</PricingCard.Period>
              {proStruck && (
                <PricingCard.OriginalPrice className="text-white/35">{proStruck}</PricingCard.OriginalPrice>
              )}
            </PricingCard.Price>
            <Button
              className={cn(
                "w-full rounded-full font-bold text-black transition",
                "bg-gradient-to-b from-[#74FA6A] to-[#5BD94E] shadow-[0_10px_25px_rgba(116,250,106,.3)] hover:bg-[#A8FF9B] active:scale-[.985]",
              )}
              asChild
            >
              <Link href="/login">{c.proCta}</Link>
            </Button>
          </PricingCard.Header>
          <PricingCard.Body>
            <PricingCard.List>
              {c.proFeatures.map((feature) => (
                <PricingCard.ListItem key={feature.text}>
                  <span className="mt-0.5">
                    <CheckCircle2 className={cn("h-4 w-4 text-[#74FA6A]", feature.highlight && "drop-shadow-[0_0_6px_rgba(116,250,106,.5)]")} aria-hidden="true" />
                  </span>
                  <span className={cn(feature.highlight && "font-medium text-[#D7FFD2]")}>{feature.text}</span>
                </PricingCard.ListItem>
              ))}
            </PricingCard.List>
          </PricingCard.Body>
        </PricingCard.Card>
      </div>
    </>
  );
}
