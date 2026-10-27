"use client";

import { LandingNavbar } from "@/components/landing-navbar";
import { useLang } from "@/lib/lang";
import { MAX_PLAN } from "@/lib/max-plan";
import { pricingCopy } from "@/lib/copy-pricing";
import { PricingCards } from "./pricing-cards";
import styles from "./pricing.module.css";

export default function PricingPage() {
  const lang = useLang();
  const c = pricingCopy(lang);

  return (
    <main className={styles.page}>
      <LandingNavbar />

      <section className={styles.hero}>
        <p className={styles.eyebrow}>{c.eyebrow}</p>
        <h1>{c.heroTitle}</h1>
        <p className={styles.heroCopy}>{c.heroSub}</p>
        <div className={styles.pipeline} aria-label={lang === "en" ? "ScratchAgent planning flow" : "Alur planning ScratchAgent"}>
          {c.pipeline.map((item, index) => (
            <span key={item}>{item}{index < c.pipeline.length - 1 && <b aria-hidden="true">›</b>}</span>
          ))}
        </div>
      </section>

      <section id="plans" className={styles.plansSection} aria-labelledby="plans-heading">
        <div className={styles.sectionHeading}>
          <h2 id="plans-heading">{c.plansTitle}</h2>
          <p>{c.currencyNote}</p>
        </div>
        <PricingCards />
        <p id="max-plan" className={styles.footnote}>{lang === "en" ? `Max pricing is a local preview. Its hardware allowance is ${MAX_PLAN.hardwarePlans} successful plans per rolling ${MAX_PLAN.hardwareWindowDays} days; failed generations return their slot. Unused slots do not accumulate.` : `Harga Max masih preview lokal. Kuota hardware ${MAX_PLAN.hardwarePlans} plan berhasil dalam rolling ${MAX_PLAN.hardwareWindowDays} hari; generate gagal mengembalikan slot. Sisa kuota tidak diakumulasi.`}</p>
        <p className={styles.footnote}>{c.footnote}</p>
      </section>

      <section className={styles.compare} aria-labelledby="compare-heading">
        <div className={styles.compareIntro}>
          <h2 id="compare-heading">{c.compareTitle}</h2>
          <p>{c.compareSub}</p>
        </div>
        <div className={styles.tableWrap} tabIndex={0} aria-label={lang === "en" ? "Scrollable plan comparison" : "Perbandingan paket yang bisa digeser"}>
          <table>
            <thead><tr><th>{c.featureLabel}</th><th>Free</th><th>Pro</th><th>Max</th></tr></thead>
            <tbody>
              {c.comparison.map((row) => (
                <tr key={row.label}><th scope="row">{row.label}</th><td>{row.free}</td><td>{row.pro}</td><td>{row.max ?? row.pro}</td></tr>
              ))}
              <tr><th scope="row">{lang === "en" ? "Hardware PRDs per rolling 31 days" : "PRD hardware per rolling 31 hari"}</th><td>—</td><td>—</td><td>{MAX_PLAN.hardwarePlans}</td></tr>
              <tr><th scope="row">Hardware &amp; Robotics PRD</th><td>—</td><td>—</td><td>{lang === "en" ? "Included" : "Termasuk"}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.faq} id="faq" aria-labelledby="faq-heading">
        <div className={styles.faqInner}>
          <div className={styles.faqIntro}><h2 id="faq-heading">{c.faqTitle}</h2></div>
          <div className={styles.faqList}>
            {c.faqs.map((item, index) => (
              <details key={item.q} open={index === 0}>
                <summary><span>{item.q}</span><span className={styles.faqIcon} aria-hidden="true" /></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
