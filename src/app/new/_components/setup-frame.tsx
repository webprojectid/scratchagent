"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ArrowLeft, Check } from "lucide-react";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import styles from "./planning.module.css";

export function SetupFrame({ stage, children }: { stage: "idea" | "prefs" | "questions"; children: ReactNode }) {
  useUiLanguage();
  const steps = [
    { name: ui("Ide"), href: "/new" },
    { name: ui("Teknologi"), href: "/new/prefs" },
    { name: ui("Detail"), href: "/new/questions" },
  ];
  const current = stage === "idea" ? 0 : stage === "prefs" ? 1 : 2;
  const backHref = stage === "idea" ? "/" : stage === "prefs" ? "/new" : "/new/prefs";

  return (
    <MotionConfig reducedMotion="user">
      <main className={styles.page}>
        <a href="#setup-content" className={styles.skipLink}>{ui("Ke isi halaman")}</a>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.brand}><BrandMark />Scratch Agent</Link>
            <span className={styles.headerLabel}>{ui("Ruang perencanaan")}</span>
            <Link href={backHref} className={styles.headerBack}>
              <ArrowLeft size={15} aria-hidden="true" /> <span>{ui("Kembali")}</span>
            </Link>
          </div>
        </header>
        <div className={styles.workspace}>
          {stage !== "idea" && (
            <nav aria-label={ui("Tahap pembuatan rencana")} className={styles.progressNav}>
              <ol>
                {steps.map((item, index) => (
                  <li key={item.name} className={index === current ? styles.currentStage : index < current ? styles.completeStage : undefined}>
                    {index < current ? (
                      <Link href={item.href}><span className={styles.stageNumber}><Check size={11} /></span>{item.name}</Link>
                    ) : (
                      <span aria-current={index === current ? "step" : undefined}><span className={styles.stageNumber}>{index + 1}</span>{item.name}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div id="setup-content">{children}</div>
        </div>
      </main>
    </MotionConfig>
  );
}
