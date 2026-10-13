import type { ReactNode } from "react";
import styles from "./page-hero.module.css";
export function PageHero({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <section className={styles.hero}>
        {eyebrow && (
          <p className={styles.eyebrow}>
            {eyebrow}
          </p>
        )}
        <h1
          className={styles.title}
        >
          {title}
        </h1>
        {sub && (
          <p
            className={styles.copy}
          >
            {sub}
          </p>
        )}
        {children}
    </section>
  );
}
