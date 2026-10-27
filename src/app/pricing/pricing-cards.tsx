"use client";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { useLang } from "@/lib/lang";
import { pricingCopy } from "@/lib/copy-pricing";
import Pricing from "@/components/ui/pricing-01";
import styles from "./pricing.module.css";

export function PricingCards() {
  const router = useRouter();
  const lang = useLang();
  const c = pricingCopy(lang);
  const [billing, setBilling] = useState<"monthly" | "quarterly">("monthly");
  const [pending, setPending] = useState(false);
  async function chooseFree(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try { const user = await getCurrentUser(); router.push(user ? "/new" : "/login"); }
    catch { router.push("/login"); }
    finally { setPending(false); }
  }
  return <Pricing plans={[
    { name: "Free", description: c.freeDescription, price: lang === "en" ? "IDR 0" : c.freePrice,
      features: c.freeReasons, featuresLabel: lang === "en" ? "What's included" : "Yang termasuk",
      actionLabel: c.chooseFree, href: "/login", onChoose: chooseFree, pending },
    { name: "Pro", description: c.proDescription,
      price: billing === "monthly" ? c.monthlyPrice : c.quarterlyPrice,
      period: billing === "monthly" ? c.perMonth : c.perQuarter,
      features: c.proReasons, featuresLabel: lang === "en" ? "What's included" : "Yang termasuk",
      actionLabel: c.choosePro, href: "/login", highlighted: true,
      priceNote: billing === "quarterly" ? <><s>{c.quarterlyOriginal}</s>{c.save}</> : null,
      controls: <div className={styles.billingToggle} aria-label={lang === "en" ? "Pro billing period" : "Periode paket Pro"} role="group">
        <button type="button" onClick={() => setBilling("monthly")} aria-pressed={billing === "monthly"}>{c.monthly}</button>
        <button type="button" onClick={() => setBilling("quarterly")} aria-pressed={billing === "quarterly"}>{c.quarterly}</button>
      </div> },
  ]} />;
}
