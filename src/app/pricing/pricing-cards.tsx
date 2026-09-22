"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getCurrentUser } from "@/lib/current-user";
import { useLang } from "@/lib/lang";
import { pricingCopy } from "@/lib/copy-pricing";
import styles from "./pricing.module.css";

type Billing = "monthly" | "quarterly";

export function PricingCards() {
  const router = useRouter();
  const lang = useLang();
  const c = pricingCopy(lang);
  const [billing, setBilling] = useState<Billing>("monthly");

  async function chooseFree() {
    const user = await getCurrentUser();
    router.push(user ? "/new" : "/login");
  }

  return (
    <div className={styles.planGrid}>
      <article className={styles.plan}>
        <div className={styles.planPurchase}>
          <h3>Free</h3>
          <div className={styles.priceLine}>
            <strong>{c.freePrice}</strong>
          </div>
          <p>{c.freeDescription}</p>
          <Link href="/login" onClick={(event) => { event.preventDefault(); void chooseFree(); }} className={styles.secondaryButton}>
            {c.chooseFree}
          </Link>
        </div>
        <div className={styles.planDetails}>
          <h4>{c.freeWhy}</h4>
          <p>{c.included}</p>
          <ul>{c.freeReasons.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </article>

      <article className={styles.plan}>
        <div className={styles.planPurchase}>
          <div className={styles.planHeading}>
            <h3>Pro</h3>
            <div className={styles.billingToggle} aria-label={c.monthly} role="group">
              <button type="button" onClick={() => setBilling("monthly")} aria-pressed={billing === "monthly"}>{c.monthly}</button>
              <button type="button" onClick={() => setBilling("quarterly")} aria-pressed={billing === "quarterly"}>{c.quarterly}</button>
            </div>
          </div>
          <div className={styles.priceLine}>
            <strong>{billing === "monthly" ? c.monthlyPrice : c.quarterlyPrice}</strong>
            <span>{billing === "monthly" ? c.perMonth : c.perQuarter}</span>
          </div>
          {billing === "quarterly" && <p className={styles.saving}><s>{c.quarterlyOriginal}</s> {c.save}</p>}
          <p>{c.proDescription}</p>
          <Link href="/login" className={styles.primaryButton}>{c.choosePro}</Link>
        </div>
        <div className={styles.planDetails}>
          <h4>{c.proWhy}</h4>
          <p>{c.included}</p>
          <ul>{c.proReasons.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </article>
    </div>
  );
}
