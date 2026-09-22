"use client";

import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import styles from "./setup.module.css";

export function SetupFrame({ stage, children }: { stage: "prefs" | "questions"; children: ReactNode }) {
  const steps = [
    { name: "Ide", href: "/new" },
    { name: "Teknologi", href: "/new/prefs" },
    { name: "Detail", href: "/new/questions" },
  ];
  const current = stage === "prefs" ? 1 : 2;

  return (
    <MotionConfig reducedMotion="user">
      <main className={styles.page}>
        <a href="#setup-content" className={styles.skipLink}>Ke isi halaman</a>
        <header className={styles.header}>
          <Link href="/" className={styles.brand}>Scratch Agent<span className={styles.brandPeriod}>.</span></Link>
          <span className={styles.headerLabel}>Ruang perencanaan</span>
          <Link href={stage === "prefs" ? "/new" : "/new/prefs"} className={styles.headerBack}>
            <ArrowLeft size={15} aria-hidden="true" /> <span>Kembali</span>
          </Link>
        </header>
        <div className={styles.workspace}>
          <nav aria-label="Tahap pembuatan rencana" className={styles.progressNav}>
            <ol>
              {steps.map((item, index) => (
                <li key={item.name} className={index === current ? styles.currentStage : index < current ? styles.completeStage : undefined}>
                  {index < current ? (
                    <Link href={item.href}><span className={styles.stageNumber}><Check size={12} /></span>{item.name}</Link>
                  ) : (
                    <span aria-current={index === current ? "step" : undefined}><span className={styles.stageNumber}>0{index + 1}</span>{item.name}</span>
                  )}
                </li>
              ))}
            </ol>
            <span className={styles.progressCaption}>Dari ide ke rencana kerja</span>
          </nav>
          <div id="setup-content">{children}</div>
          <footer className={styles.footer}><span>Scratch Agent / New project</span><span>Mulai dari yang kamu tahu.</span></footer>
        </div>
      </main>
    </MotionConfig>
  );
}
