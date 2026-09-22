"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/header-nav";
import { useLang } from "@/lib/lang";
import { pricingCopy } from "@/lib/copy-pricing";
import { PricingCards } from "./pricing-cards";
import styles from "./pricing.module.css";

export default function PricingPage() {
  const lang = useLang();
  const c = pricingCopy(lang);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="ScratchAgent home">
            <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>
            ScratchAgent
          </Link>
          <HeaderNav links={["solutions", "docs"]} />
        </div>
      </header>

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

      <section className={styles.plansSection} aria-labelledby="plans-heading">
        <div className={styles.sectionHeading}>
          <h2 id="plans-heading">{c.plansTitle}</h2>
          <p>{c.currencyNote}</p>
        </div>
        <PricingCards />
        <p className={styles.footnote}>{c.footnote}</p>
      </section>

      <section className={styles.compare} aria-labelledby="compare-heading">
        <div className={styles.compareIntro}>
          <h2 id="compare-heading">{c.compareTitle}</h2>
          <p>{c.compareSub}</p>
        </div>
        <div className={styles.tableWrap} tabIndex={0} aria-label={lang === "en" ? "Scrollable plan comparison" : "Perbandingan paket yang bisa digeser"}>
          <table>
            <thead><tr><th>{c.featureLabel}</th><th>Free</th><th>Pro</th></tr></thead>
            <tbody>
              {c.comparison.map((row) => (
                <tr key={row.label}><th scope="row">{row.label}</th><td>{row.free}</td><td>{row.pro}</td></tr>
              ))}
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
                <summary><span>{item.q}</span><span className={styles.faqIcon} aria-hidden="true">↗</span></summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
