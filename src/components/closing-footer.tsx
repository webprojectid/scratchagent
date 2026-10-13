"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { SplineSceneBasic } from "@/components/ui/demo";
import { useLang } from "@/lib/lang";
import s from "./closing-footer.module.css";

export function ClosingFooter({ createHref }: { createHref: string }) {
  const lang = useLang();
  const en = lang === "en";
  const root = useRef<HTMLElement>(null);
  const [showFooter, setShowFooter] = useState(false);
  const [loadMascot, setLoadMascot] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!root.current) return;
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => setShowFooter(entry.isIntersecting),
        { rootMargin: `0px 0px -${window.innerHeight * 0.52}px 0px` },
      );
      if (root.current) observer.observe(root.current);
    };
    observe();
    window.addEventListener("resize", observe);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", observe);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 768px) and (min-height: 600px)",
    );
    const sync = () => setEnhanced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadMascot(true);
          observer.disconnect();
        }
      },
      { rootMargin: "280px 0px" },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={s.sequence}>
      <div id="agents" className={s.anchor} aria-hidden="true" />
      <section
        ref={root}
        data-footer-track
        className={s.section}
        aria-labelledby="closing-title"
      >
        <div className={s.stage}>
          <div className={s.panel}>
            <div className={s.copy}>
              <h2 id="closing-title">
                {en ? "Your next build starts" : "Project berikutnya dimulai"}
                <br />
                {en ? "with a clear plan." : "dengan plan yang jelas."}
              </h2>
              <p>
                {en
                  ? "Bring the idea. Review the plan. Build with your agent."
                  : "Bawa idenya. Review plan-nya. Bangun bersama agent."}
              </p>
              <div className={s.actions}>
                <Link href={createHref} className={s.primary}>
                  {en ? "Create a plan" : "Buat plan"}
                </Link>
                <Link href="/project/demo" className={s.secondary}>
                  {en ? "Open sample plan" : "Buka contoh plan"}
                </Link>
                <Link href="/docs#quickstart" className={s.secondary}>
                  {en ? "CLI setup" : "Panduan CLI"}
                </Link>
              </div>
            </div>
            <div
              className={s.mascot}
              aria-hidden="true"
            >
              {loadMascot && <SplineSceneBasic active={!reduced} decorative />}
            </div>
          </div>
        </div>
      </section>
      <footer
        className={`${s.footer} ${showFooter ? s.revealed : ""}`}
        onFocusCapture={(event) => {
          if (!enhanced || reduced || !root.current) return;
          if (
            !(event.target instanceof HTMLElement) ||
            !event.target.matches(":focus-visible")
          )
            return;
          const bounds = root.current.getBoundingClientRect();
          if (bounds.bottom > 0)
            window.scrollTo({
              top: window.scrollY + bounds.bottom,
              behavior: "instant",
            });
        }}
      >
        <div className={s.footerMain}>
          <div className={s.identity}>
            <Link href="/" className={s.brand}>
              <span className={s.mark} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              Scratch Agent
            </Link>
            <p>
              {en
                ? "A clear plan for your next build."
                : "Plan yang jelas untuk project berikutnya."}
            </p>
          </div>
          <nav aria-label={en ? "Product links" : "Link produk"}>
            <h3>{en ? "Product" : "Produk"}</h3>
            <Link href={createHref}>{en ? "Create a plan" : "Buat plan"}</Link>
            <Link href="/project/demo">
              {en ? "Sample plan" : "Contoh plan"}
            </Link>
            <Link href="/solutions">{en ? "Solutions" : "Solusi"}</Link>
            <Link href="/pricing">{en ? "Pricing" : "Harga"}</Link>
          </nav>
          <nav aria-label={en ? "Resource links" : "Link panduan"}>
            <h3>{en ? "Resources" : "Panduan"}</h3>
            <Link href="/docs">{en ? "Documentation" : "Dokumentasi"}</Link>
            <Link href="/docs#quickstart">
              {en ? "CLI setup" : "Panduan CLI"}
            </Link>
            <Link href="/sample/web-projects">
              {en ? "Website samples" : "Contoh website"}
            </Link>
            <a
              href="https://scratchagent.store/"
              target="_blank"
              rel="noopener noreferrer"
            >
              API keys <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </div>
        <div className={s.footerBottom}>
          <span>© 2026 Scratch Agent</span>
          <span>{en ? "Build with a plan." : "Bangun dengan plan."}</span>
        </div>
      </footer>
    </div>
  );
}
