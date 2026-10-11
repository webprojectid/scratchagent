"use client";
import { uiText as ui, useUiLanguage, uiLocale } from "@/lib/ui-text";

import Link from "next/link";
import { animate, AnimatePresence, motion, useMotionValue, useSpring, useScroll } from "motion/react";
import { ArrowUpDown, ArrowUpRight, Bike, BookOpen, ChevronLeft, Clock, CreditCard, Delete, Footprints, KeyRound, Lock, MoreHorizontal, PenLine, Play, QrCode, Rocket, Sparkles, Star, User, Users, Wind, X, Zap } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import DottedDemo from "@/components/ui/dotted-demo";
import { IPhone17ShopDemo } from "@/components/ui/iphone17-shop-demo";
import { getCurrentUser, refreshCurrentUser } from "@/lib/current-user";
import { UserNav } from "@/components/user-nav";
import { SupportedAiTools } from "@/components/supported-ai-tools";
import { BorderBeamPanel } from "@/components/ui/border-beam-panel";
import { TestimonialsSection } from "@/components/testimonials-section";
import { CreatorSection } from "@/components/creator-section";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { homeCopy } from "@/lib/copy-home";
import { LandingWorkspace } from "@/components/landing-workspace";
import featureArt from "./feature-art.module.css";

function Magnetic({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  useUiLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 20 });
  const sy = useSpring(y, { stiffness: 220, damping: 20 });
  return <motion.div ref={ref} className={className} style={{ x: sx, y: sy }} onMouseMove={(e) => { const r = ref.current?.getBoundingClientRect(); if (!r) return; x.set((e.clientX - (r.left + r.width / 2)) * 0.18); y.set((e.clientY - (r.top + r.height / 2)) * 0.18); }} onMouseLeave={() => { x.set(0); y.set(0); }}>{children}</motion.div>;
}

function Eyebrow({ children }: { children: string }) {
  useUiLanguage();
  return <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">{children}</p>;
}

function DoubleBezel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  useUiLanguage();
  return <div className={`rounded-[24px] border border-border bg-background p-1.5 shadow-[0_18px_60px_color-mix(in_srgb,_var(--theme-shadow)_66.7%,_transparent)] ${className}`}><div className="rounded-[calc(24px-6px)] border border-border bg-card shadow-[inset_0_1px_0_color-mix(in_srgb,_var(--theme-text)_6%,_transparent)]">{children}</div></div>;
}


const stackRows = [
  [{ name: "Next.js", slug: "nextdotjs" }, { name: "React", slug: "react" }, { name: "TypeScript", slug: "typescript" }, { name: "Tailwind CSS", slug: "tailwindcss" }, { name: "Supabase", slug: "supabase" }, { name: "Motion", slug: "framer" }],
  [{ name: "Node.js", slug: "nodedotjs" }, { name: "PostgreSQL", slug: "postgresql" }, { name: "Drizzle", slug: "drizzle" }, { name: "Redis", slug: "redis" }, { name: "Docker", slug: "docker" }, { name: "Vercel", slug: "vercel" }, { name: "GitHub", slug: "github" }],
];

function StackMarquee() {
  useUiLanguage();
  const repeated = (row: typeof stackRows[number]) => [...row, ...row, ...row];

  return <section className="relative top-12 mx-auto mt-24 w-full overflow-hidden py-5 md:top-20 md:mt-32 md:py-8" aria-label="Scratch Agent stack">
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent md:w-48" />
    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent md:w-48" />
    <div className="stack-row"><div className="stack-track stack-track-right">{[0, 1].map((copy) => <div key={copy} className="stack-group">{repeated(stackRows[0]).map((item, i) => <span key={`${item.name}-${i}`} className="stack-brand"><img src={`https://cdn.simpleicons.org/${item.slug}/B7C8B9`} alt="" />{item.name}</span>)}</div>)}</div></div>
    <div className="stack-row mt-5"><div className="stack-track stack-track-left">{[0, 1].map((copy) => <div key={copy} className="stack-group">{repeated(stackRows[1]).map((item, i) => <span key={`${item.name}-${i}`} className="stack-brand"><img src={`https://cdn.simpleicons.org/${item.slug}/B7C8B9`} alt="" />{item.name}</span>)}</div>)}</div></div>
  </section>;
}

function Navbar() {
  useUiLanguage();
  const lang = useLang();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => { const unsub = scrollY.on("change", (y) => setScrolled(y > 16)); return () => unsub(); }, [scrollY]);
  useEffect(() => { if (mobileNav) document.body.style.overflow = "hidden"; else document.body.style.overflow = ""; return () => { document.body.style.overflow = ""; }; }, [mobileNav]);
  useEffect(() => {
    let active = true;
    const resolve = () => getCurrentUser().then((u) => { if (active) setLoggedIn(!!u); });
    resolve();
    const onFocus = () => { refreshCurrentUser(); resolve(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onFocus);
    };
  }, []);
  return (
    <>
      <motion.nav className={`sticky top-3 z-40 mx-auto flex h-[54px] w-[calc(100%-28px)] max-w-[1300px] items-center justify-between rounded-full px-4 transition-all duration-300 md:top-4 md:px-5 ${scrolled ? "border border-border bg-[color-mix(in_srgb,_var(--theme-bg)_80%,_transparent)] shadow-[0_12px_40px_color-mix(in_srgb,_var(--theme-shadow)_30%,_transparent)] backdrop-blur-[12px]" : "border border-border bg-card"}`} initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .5, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-[18px] font-semibold tracking-[-.04em] text-foreground"><span className="relative grid size-7 place-items-center overflow-hidden text-primary" aria-hidden="true"><span className="absolute left-0 top-[7px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-primary" /><span className="absolute left-[8px] top-[3px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-primary" /><span className="absolute left-[16px] top-[7px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-primary" /></span>Scratch Agent</Link>
          <div className="hidden items-center gap-9 md:flex"><Link href="/pricing" className="font-mono text-[12px] tracking-[0.02em] text-foreground transition-colors duration-200 hover:text-primary">{t("nav", "pricing", lang)}</Link><Link href="/solutions" className="font-mono text-[12px] tracking-[0.02em] text-foreground transition-colors duration-200 hover:text-primary">{t("nav", "solutions", lang)}</Link><Link href="/docs" className="font-mono text-[12px] tracking-[0.02em] text-foreground transition-colors duration-200 hover:text-primary">{t("nav", "docs", lang)}</Link><a href="https://scratchagent.store/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-mono text-[12px] tracking-[0.02em] text-primary transition-colors duration-200 hover:text-primary"><KeyRound size={13} strokeWidth={2.2} aria-hidden="true" />Api Key</a></div>
        </div>
        <div className="hidden items-center gap-6 md:flex">

          <UserNav />
          <Link href={loggedIn ? "/new" : "/login"} className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-105 hover:bg-primary" aria-label={ui("Mulai sekarang")}><ArrowUpRight size={16} /></Link>
        </div>
        <button className="grid size-8 place-items-center text-foreground md:hidden" onClick={() => setMobileNav((v) => !v)} aria-label="Navigasi"><span className="relative block h-3.5 w-5"><span className={`absolute left-0 top-0 block h-px w-full bg-card transition-all duration-300 ${mobileNav ? "translate-y-[7px] rotate-45" : ""}`} /><span className={`absolute left-0 top-[7px] block h-px w-full bg-card transition-opacity duration-200 ${mobileNav ? "opacity-0" : "opacity-100"}`} /><span className={`absolute left-0 top-[14px] block h-px w-full bg-card transition-all duration-300 ${mobileNav ? "translate-y-[-7px] -rotate-45" : ""}`} /></span></button>
      </motion.nav>
      <motion.div className="fixed inset-0 z-[60] flex flex-col bg-background md:hidden" initial={false} animate={mobileNav ? { opacity: 1, pointerEvents: "auto" } : { opacity: 0, pointerEvents: "none" }} transition={{ duration: .35, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex h-[64px] items-center justify-between px-5"><span className="flex items-center gap-2 text-[18px] font-semibold tracking-[-.04em] text-foreground"><span className="size-6 skew-x-[-28deg] bg-primary" />Scratch Agent</span><div className="flex items-center gap-3"><button className="grid size-8 place-items-center text-foreground" onClick={() => setMobileNav(false)} aria-label={ui("Tutup")}><X size={18} /></button></div></div>
        <div className="flex flex-1 flex-col justify-between px-5 py-12"><div className="space-y-1">{[{ href: "/pricing", label: t("nav", "pricing", lang) }, { href: "/solutions", label: t("nav", "solutions", lang) }, { href: "/docs", label: t("nav", "docs", lang) }, { href: "https://scratchagent.store/", label: "Api Key", external: true }, { href: "/project/demo", label: t("cta", "examplePlan", lang) }].map((link, i) => (<motion.a key={link.href} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noopener noreferrer" : undefined} onClick={() => setMobileNav(false)} className={`block py-4 font-mono text-[14px] tracking-[0.08em] transition-colors hover:text-primary ${link.external ? "text-primary" : "text-foreground"}`} initial={{ opacity: 0, y: 16 }} animate={mobileNav ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ delay: 0.08 + i * 0.05, duration: .4, ease: [0.16, 1, 0.3, 1] }}>{link.label}</motion.a>))}</div><motion.div initial={{ opacity: 0, y: 16 }} animate={mobileNav ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ delay: 0.32, duration: .4, ease: [0.16, 1, 0.3, 1] }}><Link href={loggedIn ? "/new" : "/login"} onClick={() => setMobileNav(false)} className="flex w-full items-center justify-center rounded-full border border-primary px-6 py-3.5 font-mono text-[13px] tracking-[0.06em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground">{t("cta", "startFree", lang)}</Link><p className="mt-6 font-mono text-[11px] tracking-[.08em] text-muted-foreground">{loggedIn ? <Link href="/profile" className="hover:text-primary">{t("nav", "profile", lang)}</Link> : t("cta", "login", lang)}</p></motion.div></div>
      </motion.div>
    </>
  );
}

export default function Home() {
  useUiLanguage();
  const lang = useLang();
  const hc = homeCopy(lang);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => { if (active) setLoggedIn(!!u); });
    return () => { active = false; };
  }, []);
  useEffect(() => { import("@splinetool/react-spline").catch(() => {}); }, []);
  return (
    <main className="rv2-page relative isolate w-full max-w-full overflow-x-hidden bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      <link rel="preload" href="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" as="fetch" crossOrigin="anonymous" />
      <DottedDemo />
      <div className="pointer-events-none fixed inset-0 z-[70] opacity-[.055] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")` }} />
      <a href="#agents" className="relative z-30 mb-3 flex min-h-8 items-center justify-center gap-2 bg-primary px-4 py-1.5 text-center text-[11px] font-medium leading-4 text-primary-foreground transition-colors hover:bg-primary md:mb-4 md:text-[12px]">{hc.banner}<span aria-hidden="true">→</span></a>
      <Navbar />

       <section className="relative mx-auto max-w-[980px] px-5 pb-14 pt-10 md:px-10 md:pb-18 md:pt-12">
         <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center text-center">
           <h1 className="max-w-[16ch] text-balance text-[clamp(2.8rem,5.8vw,5rem)] font-medium leading-[.96] tracking-[-.065em] text-foreground"><span className="text-primary">{hc.heroA}</span><br />{hc.heroB}</h1>
           <p className="mt-5 max-w-[54ch] text-balance text-[15px] leading-[1.6] text-muted-foreground">{hc.heroSub}</p>
           <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
               <Magnetic><Link href={loggedIn ? "/new" : "/login"} className="rv2-button min-w-[146px] bg-primary text-primary-foreground hover:bg-primary group">{hc.heroStart} <span className="grid size-6 place-items-center rounded-full bg-black/10 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"><ArrowUpRight size={12} /></span></Link></Magnetic>
             <Link href="/project/demo" prefetch={true} className="rv2-button light min-w-[146px]"><Play size={13} fill="currentColor" /> {hc.heroDemo}</Link>
           </div>
        </motion.div>
      </section>

       <StackMarquee />
       <LandingWorkspace lang={lang} />

      <section id="product" className="mx-auto max-w-[1360px] px-5 pb-24 pt-24 md:px-10 md:pb-32 md:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-6"><div><Eyebrow>{hc.productEyebrow}</Eyebrow><h2 className="mt-5 max-w-[18ch] text-balance text-[clamp(2.35rem,4.2vw,3.75rem)] font-medium leading-[.98] tracking-[-.055em] text-foreground">{hc.productTitle}</h2></div></div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <FeatureCard artwork={0} label={hc.features[0].label} title={hc.features[0].title} copy={hc.features[0].copy} terminal={<AnimatedTerminalPRD />} />
          <FeatureCard artwork={1} label={hc.features[1].label} title={hc.features[1].title} copy={hc.features[1].copy} terminal={<AnimatedTerminalRuntime />} />
          <FeatureCard artwork={2} label={hc.features[2].label} title={hc.features[2].title} copy={hc.features[2].copy} terminal={<AnimatedTerminalQueue />} />
          <FeatureCard artwork={3} label={hc.features[3].label} title={hc.features[3].title} copy={hc.features[3].copy} terminal={<><div className="flex items-center justify-between"><span>LIVE TELEMETRY</span><span className="text-primary">5s poll</span></div><div className="relative mt-6 h-[96px] overflow-hidden rounded border border-border bg-background p-3"><motion.svg viewBox="0 0 330 100" preserveAspectRatio="none" className="h-full w-full"><motion.polyline points="0,70 28,35 55,72 88,65 118,82 148,45 175,58 208,29 235,66 260,51 290,76 315,42 330,48" fill="none" stroke="var(--theme-accent)" strokeWidth="2" strokeLinecap="round" animate={{ pathLength: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }} /></motion.svg></div><p className="mt-3 text-[10px] text-muted-foreground">{hc.termActiveLine}</p></>} />
        </div>
      </section>

      <section id="showcase" className="mx-auto max-w-[1360px] px-5 pb-14 md:px-10 md:pb-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div><Eyebrow>case studies</Eyebrow><h2 className="mt-5 max-w-[20ch] text-balance text-[clamp(2.35rem,4.2vw,3.75rem)] font-medium leading-[.98] tracking-[-.055em] text-foreground">{ui("Dari brief jadi plan siap eksekusi.")}</h2></div>
          <p className="max-w-[42ch] text-sm leading-6 text-muted-foreground">{ui("Project simulasi nyata: dihasilkan otomatis dari brief singkat, lalu dijalankan task demi task oleh agent, dari aplikasi mobile sampai website.")}</p>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-[480px] w-full max-w-[240px]"><PhoneFrame variant="android"><FlappyPreview /></PhoneFrame></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-foreground">Flappy Bird</p><p className="mt-1 flex items-center justify-center"><img src="https://cdn.simpleicons.org/android/3DDC84" alt={ui("Android")} className="h-4 w-4" /></p></div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-[480px] w-full max-w-[240px]"><PhoneFrame variant="android"><KriptoPreview /></PhoneFrame></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-foreground">{ui("Kripto Wallet")}</p><p className="mt-1 flex items-center justify-center"><img src="https://cdn.simpleicons.org/android/3DDC84" alt={ui("Android")} className="h-4 w-4" /></p></div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-[480px] w-full max-w-[240px]"><PhoneFrame variant="ios"><IosFitnessPreview /></PhoneFrame></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-foreground">Habit Tracker</p><p className="mt-1 flex items-center justify-center"><img src="https://cdn.simpleicons.org/apple/E8F0E8" alt={ui("iOS")} className="h-4 w-4" /></p></div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-[480px] w-full max-w-[240px] aspect-[9/19.5]"><IPhone17ShopDemo /></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-foreground">Sneakers Shop</p><p className="mt-1 flex items-center justify-center"><img src="https://cdn.simpleicons.org/apple/E8F0E8" alt={ui("iOS")} className="h-4 w-4" /></p></div>
          </div>
        </div>
        {/* Single CTA button mengarah ke halaman carousel web samples */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/sample/web-projects"
            className="group flex items-center gap-2.5 rounded-full border border-border bg-foreground/[.05] px-6 py-3 text-[13px] font-medium text-foreground transition-all duration-200 hover:border-border hover:bg-foreground/[.09] hover:text-foreground"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {lang === "en" ? "View web samples" : ui("Lihat web samples")}
            <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-muted-foreground group-hover:text-foreground" />
          </Link>
        </div>
      </section>

      <SupportedAiTools />

      {/* Sage panel lanjutan: permukaan #9EC5AB yang sama dengan Supported AI Tools.
          Solutions section berada di permukaan sage yang sama, edge to edge. */}
      <div className="relative w-full overflow-hidden bg-secondary px-6 pb-20 pt-16 md:px-12 md:pb-28 md:pt-20">
      <section id="solutions" className="relative mx-auto max-w-[1360px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div><h2 className="max-w-[22ch] text-balance text-[clamp(2.35rem,4.2vw,3.75rem)] font-medium leading-[.98] tracking-[-.055em] text-primary-foreground">{hc.solutionsTitle}</h2></div>
          {/* Stats row with dashed dividers, dark text on sage, lime numbers */}
          <div className="flex items-stretch gap-8 md:gap-10">
            <div className="flex flex-col justify-end bp-stat-v pl-8 md:pl-10">
              <p className="text-[28px] font-semibold leading-none tracking-[-.03em] text-primary-foreground md:text-[32px]"><span className="text-primary">3</span><span className="text-primary">/24h</span></p>
              <p className="mt-2 max-w-[18ch] font-mono text-[10.5px] leading-4 text-muted-foreground">{lang === "en" ? "Free plan generates per day" : ui("Generate paket Free per hari")}</p>
            </div>
            <div className="flex flex-col justify-end bp-stat-v pl-8 md:pl-10">
              <p className="text-[28px] font-semibold leading-none tracking-[-.03em] text-primary-foreground md:text-[32px]"><span className="text-primary">18</span></p>
              <p className="mt-2 max-w-[18ch] font-mono text-[10.5px] leading-4 text-muted-foreground">{lang === "en" ? "AI tools supported via one API" : "Tool AI didukung lewat satu API"}</p>
            </div>
          </div>
        </div>

        {/* Blueprint container: animated marching dashes + plus markers centered
            exactly on the 4 corners and 4 junction points (where dividers meet the
            top/bottom border). Masks carve a 26px gap so dashes never touch the +.
            Reason: engineering-drawing motif fits a dev tool. */}
        <div className="bp-dark relative mt-12">
          {/* Corner plus markers (outer 4) — centered on the corner point */}
          <span aria-hidden="true" className="absolute -left-[7px] -top-[8px] z-10 font-mono text-[15px] leading-none text-primary-foreground/60 select-none">+</span>
          <span aria-hidden="true" className="absolute -right-[7px] -top-[8px] z-10 font-mono text-[15px] leading-none text-primary-foreground/60 select-none">+</span>
          <span aria-hidden="true" className="absolute -bottom-[8px] -left-[7px] z-10 font-mono text-[15px] leading-none text-primary-foreground/60 select-none">+</span>
          <span aria-hidden="true" className="absolute -bottom-[8px] -right-[7px] z-10 font-mono text-[15px] leading-none text-primary-foreground/60 select-none">+</span>
          {/* Junction plus markers: internal dividers meeting top/bottom border (4) */}
          <span aria-hidden="true" className="absolute -top-[8px] left-1/3 z-10 hidden -translate-x-1/2 font-mono text-[15px] leading-none text-primary-foreground/60 select-none md:block">+</span>
          <span aria-hidden="true" className="absolute -top-[8px] left-2/3 z-10 hidden -translate-x-1/2 font-mono text-[15px] leading-none text-primary-foreground/60 select-none md:block">+</span>
          <span aria-hidden="true" className="absolute -bottom-[8px] left-1/3 z-10 hidden -translate-x-1/2 font-mono text-[15px] leading-none text-primary-foreground/60 select-none md:block">+</span>
          <span aria-hidden="true" className="absolute -bottom-[8px] left-2/3 z-10 hidden -translate-x-1/2 font-mono text-[15px] leading-none text-primary-foreground/60 select-none md:block">+</span>

          <div className="grid gap-0 md:grid-cols-3">
            {hc.solutions.map((sol, i) => (
              <motion.article
                key={sol.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex flex-col p-7 md:p-9 ${i > 0 ? "blueprint-divider-v md:bg-left" : ""} ${i > 0 ? "border-t-[1.5px] border-t-dashed border-border/30 md:border-t-0" : ""}`}
              >
                {/* Small outline icon, no background */}
                <span className="text-primary-foreground/60" aria-hidden="true">
                  {i === 0 && <Rocket size={20} strokeWidth={1.5} />}
                  {i === 1 && <BookOpen size={20} strokeWidth={1.5} />}
                  {i === 2 && <PenLine size={20} strokeWidth={1.5} />}
                </span>
                <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-primary">{sol.label}</p>
                <h3 className="mt-3 text-[19px] font-medium tracking-[-.03em] text-primary-foreground">{sol.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-muted-foreground">{sol.copy}</p>
                <ul className="bp-h-list mt-5 space-y-2.5 border-t-0 pt-5">
                  {sol.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-[12px] leading-5 text-muted-foreground">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--theme-tint)]/80" />{point}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
          {/* Animated marching border: horizontal edges + vertical edges as separate
              masked layers, drawn last so they wrap all columns */}
          <div className="bp-h pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="bp-v pointer-events-none absolute inset-0" aria-hidden="true" />
        </div>
      </section>
      </div>

      <CreatorSection />
      <TestimonialsSection lang={lang} />

      <section id="agents" className="mx-auto w-[calc(100%-32px)] max-w-[1280px] mb-8 mt-8 overflow-hidden rounded-[24px] border border-border bg-background px-5 py-16 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-2"><div><Eyebrow>{hc.agentsEyebrow}</Eyebrow><h2 className="mt-4 text-[clamp(2.1rem,4.8vw,3.8rem)] font-semibold leading-[.95] tracking-[-.06em] text-foreground">{hc.agentsTitleA}<br />{hc.agentsTitleB}</h2><p className="mt-5 max-w-[44ch] text-sm leading-6 text-muted-foreground">{hc.agentsSub}</p><Magnetic className="mt-8 inline-block"><a href="https://scratchagent.store/" target="_blank" rel="noopener noreferrer" className="btn-donate inline-flex items-center gap-2.5"><KeyRound size={18} strokeWidth={2.2} aria-hidden="true" /> {lang === "en" ? "Get your Api Key" : "Ambil Api Key kamu"}</a></Magnetic></div><BorderBeamPanel beams={2} thickness={2} radius={24} glow colors={["var(--primary)", "var(--theme-chart-2)"]} reducedMotion={false} className="!bg-transparent !border-transparent !p-0 overflow-hidden"><DoubleBezel className="!shadow-none"><div className="rounded-[calc(24px-10px)] bg-background p-5 font-mono text-[12px] leading-7 text-foreground"><div className="mb-3 flex gap-1.5"><i className="size-2.5 rounded-full bg-destructive" /><i className="size-2.5 rounded-full bg-primary" /><i className="size-2.5 rounded-full bg-primary" /></div><PromptShowcase /></div></DoubleBezel></BorderBeamPanel></div>
      </section>


      <footer className="px-5 py-10 md:px-10"><div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-8 border-t border-border pt-8 md:flex-row"><div><div className="font-semibold text-[13px] tracking-[-.02em] text-foreground">Scratch Agent</div><p className="mt-2 font-mono text-[11px] text-muted-foreground">{hc.footerTagline}</p></div><div className="flex flex-wrap gap-6 font-mono text-[11px] text-muted-foreground"><Link href="/new">{hc.footerCreate}</Link><Link href="/project/demo">demo</Link><Link href="/docs">docs</Link><span>© 2026 Scratch Agent</span></div></div></footer>
    </main>
  );
}

function TypingText({ text, speed = 32, loop = true, className = "" }: { text: string; speed?: number; loop?: boolean; className?: string }) {
  useUiLanguage();
  const [out, setOut] = useState("");
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (idx >= text.length) {
      if (!loop) return;
      const t = setTimeout(() => { setOut(""); setIdx(0); }, 1600);
      return () => clearTimeout(t);
    }
    const dt = text[idx] === "\n" ? 120 : speed + Math.random() * 28;
    const t = setTimeout(() => { setOut((p) => p + text[idx]); setIdx((i) => i + 1); }, dt);
    return () => clearTimeout(t);
  }, [idx, text, speed, loop]);
  return <span className={className}>{out}<motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: .6 }} className="ml-px inline-block h-[1em] w-[7px] translate-y-[2px] bg-foreground/80" /></span>;
}

function AnimatedTerminalPRD() {
  useUiLanguage();
  const hc = homeCopy(useLang());
  return (
    <div className="space-y-1">
      <p><span className="text-primary">$</span> <TypingText text="scratch plan parse" speed={38} loop /></p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9 }} className="space-y-[4px] pt-3">
        <p className="text-muted-foreground">{hc.termBrief}</p>
        <p className="text-primary">{hc.termPhases}</p>
        <p className="text-foreground">graph.edges: 28 · deps acyclic</p>
      </motion.div>
    </div>
  );
}

function AnimatedTerminalRuntime() {
  useUiLanguage();
  const hc = homeCopy(useLang());
  const items = [{ label: hc.termReadingPrd }, { label: hc.termBuildingGraph }, { label: hc.termWaitingAgent }];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (items.length + 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <div className="flex items-center justify-between border-b border-border pb-3"><span>SCRATCH / RUNTIME</span><span className="text-primary">● live</span></div>
      <div className="mt-4 flex flex-col justify-center space-y-3">
        {items.map((it, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <div key={it.label} className="flex items-center gap-3">
              <span className={`relative grid size-4 place-items-center rounded-full border leading-none transition-colors duration-300 ${done ? "border-primary bg-primary/10 text-primary" : active ? "border-primary/50 text-muted-foreground" : "border-border text-transparent"}`}><span className="text-[10px] leading-none">{done ? "✓" : ""}</span></span>
              <span className={`${active ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground"} transition-colors`}>{it.label}</span>
              <span className="ml-auto text-[9px] text-muted-foreground">{done ? hc.termDone : active ? "…" : hc.termNext}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AnimatedTerminalQueue() {
  useUiLanguage();
  const rows = [{ k: "frontend", v: 42 }, { k: "backend", v: 72 }, { k: "qa", v: 58 }];
  return (
    <>
      <div className="flex items-center justify-between"><span>DEPENDENCY QUEUE</span><span className="text-primary">READY</span></div>
      <div className="mt-6 space-y-4">
        {rows.map((r, i) => (
          <div key={r.k}>
            <div className="mb-1 flex justify-between"><span>{r.k}</span><span>08 tasks</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
              <motion.div animate={{ width: [`0%`, `${r.v}%`, `${r.v * .6}%`, `${r.v}%`] }} transition={{ duration: 4.2, delay: i * .35, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} className="h-full rounded-full bg-primary" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PromptShowcase() {
  useUiLanguage();
  const hc = homeCopy(useLang());
  const steps = hc.promptSteps;
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((s) => (s + 1) % (steps.length + 1)), 1300);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-[252px] space-y-4 leading-5">
      <div className="flex items-center justify-between border-b border-border pb-3 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
        <span>mission prompt</span>
        <span className="inline-flex items-center gap-1.5 text-primary"><span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--theme-accent)]" />{hc.promptReadyBadge}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
        <span className="rounded border border-border bg-background px-2 py-1 text-muted-foreground">token: rv_••••••••</span>
        <span className="rounded border border-border bg-background px-2 py-1 text-muted-foreground">plan: futsalgo</span>
        <span className="rounded border border-primary/25 bg-primary/[.07] px-2 py-1 text-primary">{hc.promptAgentAny}</span>
      </div>
      <div className="space-y-2.5 pt-1">
        {steps.map((step, i) => {
          const done = active > i;
          const current = active === i;
          return (
            <div key={step.label} className="flex items-center gap-2.5">
              <span className={`grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[9px] leading-none transition-colors duration-300 ${done ? "border-primary bg-primary/10 text-primary" : current ? "border-primary/50 text-muted-foreground" : "border-border text-muted-foreground"}`}>{done ? "✓" : i + 1}</span>
              <span className={`text-[11.5px] leading-4 transition-colors duration-300 ${current ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
      <p className="border-t border-border pt-3 font-mono text-[9.5px] leading-5 text-muted-foreground">{hc.promptFoot}</p>
    </div>
  );
}

function FeatureArtwork({ variant }: { variant: 0 | 1 | 2 | 3 }) {
  useUiLanguage();
  return <div className={`${featureArt.art} ${featureArt[`variant${variant}`]}`} aria-hidden="true">
    <i className={featureArt.shapeA} /><i className={featureArt.shapeB} /><i className={featureArt.shapeC} />
    <b className={featureArt.nodeA} /><b className={featureArt.nodeB} /><b className={featureArt.nodeC} />
  </div>;
}

function FeatureCard({ artwork, label, title, copy, terminal }: { artwork: 0 | 1 | 2 | 3; label: string; title: string; copy: string; terminal: React.ReactNode }) {
  useUiLanguage();
  return (
    <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .65, ease: [0.16, 1, 0.3, 1] }} className="group flex w-full flex-col overflow-hidden rounded-[16px] border border-border bg-background transition-colors duration-300 hover:border-primary/45">
      <div className="relative flex min-h-[272px] items-center justify-center overflow-hidden border-b border-border bg-primary p-5">
        <FeatureArtwork variant={artwork} />
        <div className="relative z-10 mx-auto flex min-h-[168px] w-full max-w-[408px] flex-col rounded-[14px] border-[6px] border-border bg-card p-4 font-mono text-[12px] leading-5 text-muted-foreground shadow-[0_14px_36px_color-mix(in_srgb,_var(--theme-shadow)_53.3%,_transparent)]">
          <div className="mb-2.5 flex gap-1.5"><i className="size-2 rounded-full bg-destructive" /><i className="size-2 rounded-full bg-primary" /><i className="size-2 rounded-full bg-primary" /></div>
          <div className="flex flex-1 flex-col justify-center">{terminal}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5"><p className="font-mono text-[10px] tracking-[.18em] text-primary">{label}</p><h3 className="mt-2 text-[20px] font-medium tracking-[-.04em] text-foreground">{title}</h3><p className="mt-1.5 max-w-[44ch] text-[13px] leading-[1.5] text-muted-foreground">{copy}</p></div>
    </motion.article>
  );
}



// ===== RESTORED: preview device (Flappy Bird, iOS Fitness, Kripto Wallet) =====
function PhoneFrame({ variant, children }: { variant: "android" | "ios"; children: React.ReactNode }) {
  useUiLanguage();
  return (
    <div className="flex h-full w-full items-center justify-center">
      {variant === "ios" ? (
        /* iOS — identik dengan iPhone 17 frame: side buttons, home indicator, top sheen */
        <div className="relative flex h-full flex-col overflow-visible" style={{ width: "calc(100% - 4px)" }}>
          {/* Action button kiri */}
          <div className="absolute -left-[4px] top-[14%] h-[32px] w-[3px] rounded-l-full bg-secondary" />
          {/* Volume buttons kiri */}
          <div className="absolute -left-[4px] top-[24%] h-[44px] w-[3px] rounded-l-full bg-secondary" />
          <div className="absolute -left-[4px] top-[33%] h-[44px] w-[3px] rounded-l-full bg-secondary" />
          {/* Power button kanan */}
          <div className="absolute -right-[4px] top-[26%] h-[64px] w-[3px] rounded-r-full bg-secondary" />

          <div
            className="relative flex h-full w-full flex-col overflow-hidden"
            style={{
              borderRadius: "36px",
              border: "2.5px solid var(--theme-border)",
              background: "var(--theme-border)",
              boxShadow: "0 20px 60px color-mix(in srgb, var(--theme-shadow) 70%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--theme-text) 8%, transparent)",
            }}
          >
            {/* Top highlight sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] rounded-t-[36px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
            {/* Dynamic Island */}
            <span className="absolute left-1/2 top-2 z-20 h-[18px] w-[88px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/[.06]" />
            {/* Content */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {children}
            </div>
            {/* Home indicator */}
            <div className="flex shrink-0 justify-center py-2">
              <div className="h-[4px] w-[100px] rounded-full bg-foreground/30" />
            </div>
          </div>
        </div>
      ) : (
        /* Android — original simpel */
        <div className="relative aspect-[9/19] h-full overflow-hidden rounded-[24px] bg-black shadow-[0_14px_34px_color-mix(in_srgb,_var(--theme-shadow)_50%,_transparent),inset_0_0_0_1px_color-mix(in_srgb,_var(--theme-text)_4%,_transparent)]" style={{ border: "2.5px solid var(--theme-border)" }}>
          <span className="absolute left-1/2 top-1.5 z-20 size-[8px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/15" />
          {children}
        </div>
      )}
    </div>
  );
}

// Preview browser mini untuk sample web project — CSS murni, tanpa WebGL/Spline,
// jadi homepage tetap ringan. Klik preview -> halaman sample masing-masing.
// Chrome ditiru dari SafariFrame asli: traffic lights, URL pill, viewport gelap.
function BrowserPreviewFrame({ url, children }: { url: string; children: React.ReactNode }) {
  useUiLanguage();
  return (
    <div className="relative aspect-[16/11] h-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_14px_34px_color-mix(in_srgb,_var(--theme-shadow)_50%,_transparent)] transition group-hover:border-border group-hover:shadow-[0_18px_44px_color-mix(in_srgb,_var(--theme-shadow)_60%,_transparent)]">
      <div className="flex h-6 items-center gap-1.5 border-b border-border bg-card px-2">
        <span className="size-[7px] rounded-full bg-destructive" />
        <span className="size-[7px] rounded-full bg-primary" />
        <span className="size-[7px] rounded-full bg-primary" />
        <span className="mx-auto flex min-w-0 max-w-[130px] flex-1 items-center justify-center gap-1 rounded-[4px] border border-border bg-foreground/[.06] px-1.5 py-[2px]">
          <Lock size={6} className="shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-[6.5px] text-foreground">{url}</span>
        </span>
      </div>
      <div className="relative h-[calc(100%-24px)] overflow-hidden bg-background">{children}</div>
    </div>
  );
}

const GalaxyHeroPreview = memo(function GalaxyHeroPreview() {
  useUiLanguage();
  return (
    <BrowserPreviewFrame url="scratchagent.app">
      {/* Nebula statis tiruan scene Spline (radial gradient, tanpa animasi berat) */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(90% 70% at 30% 40%, color-mix(in srgb, var(--theme-accent) 35%, transparent), transparent 60%), radial-gradient(70% 60% at 75% 60%, color-mix(in srgb, var(--theme-accent) 22%, transparent), transparent 60%), radial-gradient(50% 45% at 60% 25%, color-mix(in srgb, var(--theme-accent) 14%, transparent), transparent 55%)" }} />
      {/* Bintang kecil statis */}
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(1px 1px at 18% 22%, color-mix(in srgb, var(--theme-text) 80%, transparent), transparent), radial-gradient(1px 1px at 64% 18%, color-mix(in srgb, var(--theme-text) 60%, transparent), transparent), radial-gradient(1.5px 1.5px at 82% 48%, color-mix(in srgb, var(--theme-text) 70%, transparent), transparent), radial-gradient(1px 1px at 38% 68%, color-mix(in srgb, var(--theme-text) 50%, transparent), transparent), radial-gradient(1px 1px at 52% 42%, color-mix(in srgb, var(--theme-text) 65%, transparent), transparent)" }} />
      {/* Hero card tiruan */}
      <div className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-foreground/[.03] px-3 py-2.5 text-center backdrop-blur-[2px]">
        <div className="mx-auto h-1.5 w-[70%] rounded-full bg-foreground/70" />
        <div className="mx-auto mt-1 h-1.5 w-[45%] rounded-full bg-foreground/40" />
        <div className="mx-auto mt-2 h-3 w-12 rounded-[4px] border border-primary/50 bg-primary/10" />
      </div>
    </BrowserPreviewFrame>
  );
});

const VortexPreview = memo(function VortexPreview() {
  useUiLanguage();
  return (
    <BrowserPreviewFrame url="immersiavr.app">
      {/* Vortex tiruan: ring konsentris ungu-cyan, CSS animasi ringan (rotate pelan) */}
      <div className="nv-spin-slow absolute left-1/2 top-1/2 size-[240%] -translate-x-1/2 -translate-y-1/2" style={{ background: "conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--theme-accent) 50%, transparent) 80deg, transparent 160deg, color-mix(in srgb, var(--theme-accent) 35%, transparent) 240deg, transparent 320deg)", maskImage: "radial-gradient(circle, black 8%, transparent 62%)", WebkitMaskImage: "radial-gradient(circle, black 8%, transparent 62%)" }} />
      <div className="nv-spin-slower absolute left-1/2 top-1/2 size-[180%] -translate-x-1/2 -translate-y-1/2" style={{ background: "conic-gradient(from 120deg, transparent 0deg, color-mix(in srgb, var(--theme-accent) 40%, transparent) 100deg, transparent 200deg, color-mix(in srgb, var(--theme-accent) 28%, transparent) 290deg, transparent 360deg)", maskImage: "radial-gradient(circle, black 5%, transparent 55%)", WebkitMaskImage: "radial-gradient(circle, black 5%, transparent 55%)" }} />
      {/* Hero card tiruan */}
      <div className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-foreground/[.03] px-3 py-2.5 text-center backdrop-blur-[2px]">
        <div className="mx-auto h-1.5 w-[65%] rounded-full bg-foreground/70" />
        <div className="mx-auto mt-1 h-1.5 w-[40%] rounded-full bg-foreground/40" />
        <div className="mx-auto mt-2 h-3 w-12 rounded-[4px] border border-border" />
      </div>
    </BrowserPreviewFrame>
  );
});

const SaasPreview = memo(function SaasPreview() {
  useUiLanguage();
  return (
    <BrowserPreviewFrame url="template.app">
      {/* Glow lembut di belakang, tiruan glows.png */}
      <div className="absolute left-1/2 top-1/2 h-[120%] w-[80%] -translate-x-1/2 -translate-y-[38%] rounded-full opacity-40 blur-xl" style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--theme-accent) 35%, transparent), color-mix(in srgb, var(--theme-text) 6%, transparent) 60%, transparent)" }} />
      {/* Heading gradient tiruan */}
      <div className="absolute left-1/2 top-[18%] w-[70%] -translate-x-1/2 text-center">
        <div className="mx-auto h-1.5 w-[85%] rounded-full bg-gradient-to-b from-foreground to-foreground/60" />
        <div className="mx-auto mt-1 h-1.5 w-[60%] rounded-full bg-gradient-to-b from-foreground/80 to-foreground/40" />
        <div className="mx-auto mt-1.5 h-1 w-[55%] rounded-full bg-foreground/25" />
        {/* CTA putih tiruan variant gradient */}
        <div className="mx-auto mt-2.5 h-3.5 w-16 rounded-[5px] bg-gradient-to-b from-foreground to-foreground/60 shadow-[0_2px_10px_color-mix(in_srgb,_var(--theme-text)_25%,_transparent)]" />
      </div>
      {/* Dashboard preview tiruan: bar chart mini */}
      <div className="absolute bottom-[8%] left-1/2 h-[38%] w-[72%] -translate-x-1/2 overflow-hidden rounded-[6px] border border-border bg-background shadow-lg">
        <div className="flex h-full items-end justify-around gap-1 px-2 pb-1.5 pt-2">
          <div className="w-[9%] rounded-t-[2px] bg-foreground/25" style={{ height: "45%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-foreground/40" style={{ height: "62%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-foreground/25" style={{ height: "38%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-foreground/60" style={{ height: "78%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-foreground/30" style={{ height: "52%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-foreground/45" style={{ height: "68%" }} />
        </div>
      </div>
    </BrowserPreviewFrame>
  );
});

const DashboardPreview = memo(function DashboardPreview() {
  useUiLanguage();
  return (
    <BrowserPreviewFrame url="efferd.app/dashboard">
      {/* Sidebar mini */}
      <div className="absolute inset-y-0 left-0 w-[18%] border-r border-border bg-background p-1.5">
        <div className="size-2.5 rounded-[3px] bg-primary" />
        <div className="mt-2 space-y-1">
          <div className="h-1 w-full rounded-full bg-foreground/25" />
          <div className="h-1 w-[80%] rounded-full bg-foreground/12" />
          <div className="h-1 w-[90%] rounded-full bg-foreground/12" />
          <div className="h-1 w-[70%] rounded-full bg-foreground/12" />
        </div>
      </div>
      {/* Konten: stat cards + chart tiruan */}
      <div className="absolute inset-y-0 left-[18%] right-0 p-2">
        <div className="flex gap-1.5">
          <div className="flex-1 rounded-[4px] border border-border bg-foreground/[.03] p-1">
            <div className="h-0.5 w-[70%] rounded-full bg-foreground/25" />
            <div className="mt-1 h-1 w-[50%] rounded-full bg-foreground/60" />
          </div>
          <div className="flex-1 rounded-[4px] border border-border bg-foreground/[.03] p-1">
            <div className="h-0.5 w-[70%] rounded-full bg-foreground/25" />
            <div className="mt-1 h-1 w-[50%] rounded-full bg-foreground/60" />
          </div>
          <div className="flex-1 rounded-[4px] border border-border bg-foreground/[.03] p-1">
            <div className="h-0.5 w-[70%] rounded-full bg-foreground/25" />
            <div className="mt-1 h-1 w-[50%] rounded-full bg-foreground/60" />
          </div>
        </div>
        <div className="mt-1.5 flex h-[calc(100%-38px)] gap-1.5">
          <div className="flex flex-1 items-end justify-around rounded-[4px] border border-border bg-foreground/[.03] px-1 pb-1">
            <div className="w-[10%] rounded-t-[2px] bg-primary/50" style={{ height: "40%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-primary/65" style={{ height: "58%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-primary/45" style={{ height: "36%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-primary/80" style={{ height: "74%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-primary/55" style={{ height: "50%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-primary" style={{ height: "88%" }} />
          </div>
          <div className="grid w-[30%] place-items-center rounded-[4px] border border-border bg-foreground/[.03]">
            <div className="size-7 rounded-full" style={{ background: "conic-gradient(var(--theme-accent) 0 42%, var(--theme-accent) 42% 70%, var(--theme-accent) 70% 88%, var(--theme-raised) 88% 100%)", maskImage: "radial-gradient(circle, transparent 42%, black 44%)", WebkitMaskImage: "radial-gradient(circle, transparent 42%, black 44%)" }} />
          </div>
        </div>
      </div>
    </BrowserPreviewFrame>
  );
});

// Preview game Flappy Bird (Android) ΓÇö game loop beneran: fisika gravitasi + burung
// otomatis lompat menghindari tiap pipa. Jalan lewat requestAnimationFrame yang nulis
// transform langsung ke DOM (tanpa re-render React) => mulus 60fps, gak lemot.
// Cuma mount saat hover; di-memo biar terisolasi.
const FlappyPreview = memo(function FlappyPreview() {
  useUiLanguage();
  const areaRef = useRef<HTMLDivElement>(null);
  const birdRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const pipeRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const area = areaRef.current;
    const bird = birdRef.current;
    if (!area || !bird) return;

    let W = area.clientWidth;
    let H = area.clientHeight;
    if (W === 0 || H === 0) return;

    const birdX = W * 0.26;
    const birdR = 9;
    const pipeW = W * 0.16;
    const gapH = H * 0.44;
    const speed = W * 0.3;
    const gravity = H * 2.0;
    const flapV = -H * 0.82;
    const NUM = 3;
    const spacing = W * 0.62;
    const randomGap = () => H * (0.25 + Math.random() * 0.37);

    let birdY = H * 0.4;
    let vel = 0;
    let score = 0;

    const pipes = Array.from({ length: NUM }, (_, i) => ({ x: W * 0.55 + i * spacing, gap: randomGap(), passed: false }));

    const setGap = (i: number) => {
      const el = pipeRefs.current[i];
      if (!el || el.children.length < 2) return;
      (el.children[0] as HTMLElement).style.height = `${pipes[i].gap - gapH / 2}px`;
      (el.children[1] as HTMLElement).style.top = `${pipes[i].gap + gapH / 2}px`;
    };
    for (let i = 0; i < NUM; i++) setGap(i);

    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      for (let i = 0; i < NUM; i++) {
        const p = pipes[i];
        p.x -= speed * dt;
        if (p.x < -pipeW - 4) {
          p.x += NUM * spacing;
          p.gap = randomGap();
          p.passed = false;
          setGap(i);
        }
        if (!p.passed && p.x + pipeW < birdX) {
          p.passed = true;
          score += 1;
          if (scoreRef.current) scoreRef.current.textContent = String(score);
        }
      }

      let nearest: (typeof pipes)[number] | null = null;
      for (const p of pipes) if (p.x + pipeW > birdX && (!nearest || p.x < nearest.x)) nearest = p;

      const target = nearest ? nearest.gap : H * 0.45;
      if (birdY > target && vel > -H * 0.12) vel = flapV;

      vel += gravity * dt;
      birdY += vel * dt;
      const minY = birdR;
      const maxY = H - H * 0.13 - birdR;
      if (birdY < minY) { birdY = minY; vel = 0; }
      if (birdY > maxY) { birdY = maxY; vel = 0; }

      const rot = Math.max(-26, Math.min(64, vel * 0.055));
      bird.style.transform = `translate(${birdX - birdR}px, ${birdY - birdR}px) rotate(${rot}deg)`;
      for (let i = 0; i < NUM; i++) {
        const el = pipeRefs.current[i];
        if (el) el.style.transform = `translateX(${pipes[i].x}px)`;
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={areaRef} className="relative h-full w-full overflow-hidden bg-primary">
      {/* awan */}
      <motion.div className="absolute left-0 top-[16%] h-3 w-10 rounded-full bg-foreground/70 blur-[1px]" animate={{ x: ["110%", "-30%"] }} transition={{ repeat: Infinity, duration: 9, ease: "linear" }} />
      <motion.div className="absolute left-0 top-[34%] h-2.5 w-8 rounded-full bg-foreground/50 blur-[1px]" animate={{ x: ["120%", "-25%"] }} transition={{ repeat: Infinity, duration: 13, delay: 2, ease: "linear" }} />

      {/* pipa ΓÇö posisi digerakin game loop */}
      {[0, 1, 2].map((i) => (
        <div key={i} ref={(el) => { pipeRefs.current[i] = el; }} className="absolute inset-y-0 left-0 w-[16%] will-change-transform">
          <div className="absolute inset-x-0 top-0 rounded-b-[3px] border border-border/50 bg-primary">
            <span className="absolute inset-x-0 bottom-0 h-2 rounded-[2px] border border-border/50 bg-primary" />
          </div>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] border border-border/50 bg-primary">
            <span className="absolute inset-x-0 top-0 h-2 rounded-[2px] border border-border/50 bg-primary" />
          </div>
        </div>
      ))}

      {/* burung ΓÇö posisi & rotasi digerakin game loop */}
      <div ref={birdRef} className="absolute left-0 top-0 z-10 will-change-transform">
        <div className="relative size-[18px] rounded-full bg-primary shadow-[0_2px_4px_color-mix(in_srgb,_var(--theme-shadow)_25%,_transparent)]">
          <motion.span className="absolute left-[2px] top-[6px] size-[8px] rounded-full bg-primary" animate={{ scaleY: [1, 0.55, 1] }} transition={{ repeat: Infinity, duration: 0.32, ease: "easeInOut" }} style={{ transformOrigin: "right center" }} />
          <span className="absolute right-[3px] top-[3px] size-[6px] rounded-full bg-card"><span className="absolute right-[1px] top-[1.5px] size-[3px] rounded-full bg-card" /></span>
          <span className="absolute -right-[5px] top-[7px] h-[6px] w-[8px] rounded-[2px] bg-destructive" />
        </div>
      </div>

      {/* skor */}
      <span ref={scoreRef} className="absolute inset-x-0 top-[7%] z-10 text-center font-mono text-[22px] font-bold text-foreground drop-shadow-[0_2px_2px_color-mix(in_srgb,_var(--theme-shadow)_35%,_transparent)]">0</span>

      {/* tanah scroll */}
      <motion.div className="absolute bottom-0 left-0 z-[5] h-[13%] w-[200%]" animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}>
        <div className="h-[35%] w-full bg-primary" />
        <div className="h-[65%] w-full bg-primary" />
      </motion.div>
    </div>
  );
});

// ===== iOS Fitness (Apple-style glass) ΓÇö multi-screen preview =====
// Design tokens ala Apple Fitness+: ring Move/Exercise/Stand + aksen lime.
const AF = {
  move: "var(--theme-chart-1)",
  moveTrack: "var(--theme-tint)",
  ex: "var(--theme-chart-2)",
  exTrack: "var(--theme-tint)",
  stand: "var(--theme-chart-3)",
  standTrack: "var(--theme-tint)",
  muted: "var(--theme-muted)",
  card: "var(--theme-surface)",
};

// 3 activity ring konsentris (Move/Exercise/Stand), ngisi dari 0 tiap layar muncul.
function AppleRings({ size = 58, delay = 0.3 }: { size?: number; delay?: number }) {
  useUiLanguage();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 110 110" className="size-full -rotate-90">
        <circle cx="55" cy="55" r="48" fill="none" stroke={AF.moveTrack} strokeWidth="10" />
        <motion.circle cx="55" cy="55" r="48" fill="none" stroke={AF.move} strokeWidth="10" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 0.42 }} transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay }} style={{ filter: "drop-shadow(0 0 3px color-mix(in srgb, var(--theme-danger) 45%, transparent))" }} />
        <circle cx="55" cy="55" r="36" fill="none" stroke={AF.exTrack} strokeWidth="10" />
        <motion.circle cx="55" cy="55" r="36" fill="none" stroke={AF.ex} strokeWidth="10" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: delay + 0.1 }} style={{ filter: "drop-shadow(0 0 3px color-mix(in srgb, var(--theme-accent) 40%, transparent))" }} />
        <circle cx="55" cy="55" r="24" fill="none" stroke={AF.standTrack} strokeWidth="10" />
        <motion.circle cx="55" cy="55" r="24" fill="none" stroke={AF.stand} strokeWidth="10" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 0.25 }} transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: delay + 0.2 }} style={{ filter: "drop-shadow(0 0 3px color-mix(in srgb, var(--theme-accent) 40%, transparent))" }} />
      </svg>
    </div>
  );
}

// Ikon workout sesuai jenis (hike/walk & cycle = lime, breathe = cyan).
function WorkoutIcon({ kind }: { kind: "hike" | "cycle" | "breathe" }) {
  useUiLanguage();
  if (kind === "cycle") return <Bike size={13} style={{ color: AF.ex }} />;
  if (kind === "breathe") return <Wind size={13} style={{ color: AF.stand }} />;
  return <Footprints size={13} style={{ color: AF.ex }} />;
}

// Satu baris item workout (ikon dalem lingkaran hitam + nama + value + tanggal).
function WorkoutRow({ kind, name, val, date, delay = 0 }: { kind: "hike" | "cycle" | "breathe"; name: string; val: string; date: string; delay?: number }) {
  useUiLanguage();
  const cyan = kind === "breathe";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay }} className="mx-3 mt-1.5 flex items-center gap-2 rounded-xl bg-card px-2.5 py-1.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-black"><WorkoutIcon kind={kind} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[7px] font-medium text-foreground">{name}</p>
        <p className="text-[9.5px] font-bold tracking-tight" style={{ color: cyan ? AF.stand : AF.ex }}>{val}</p>
      </div>
      <p className="shrink-0 text-[6px] text-muted-foreground">{date}</p>
    </motion.div>
  );
}

function AppleSummary() {
  useUiLanguage();
  const stats = [
    { l: "Move", v: "209", g: "/500 CAL", c: AF.move },
    { l: "Exercise", v: "32", g: "/30 MIN", c: AF.ex },
    { l: "Stand", v: "3", g: "/12 HRS", c: AF.stand },
  ];
  return (
    <div className="flex h-full flex-col">
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }} className="px-3 pt-1.5 text-[13px] font-bold text-foreground">Summary</motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }} className="mx-3 mt-1.5 flex items-center justify-between rounded-xl bg-card px-2.5 py-2">
        <div className="flex-1 space-y-[3px]">
          {stats.map((s) => (
            <div key={s.l} className="flex items-baseline gap-1">
              <span className="w-[34px] text-[6.5px] font-semibold text-foreground">{s.l}</span>
              <span className="text-[6.5px] font-semibold text-muted-foreground"><span style={{ color: s.c }}>{s.v}</span>{s.g}</span>
            </div>
          ))}
          <div className="flex gap-2.5 pt-[3px]">
            <div><p className="text-[6px] text-foreground">Steps</p><p className="text-[7px] font-semibold text-muted-foreground">4,355</p></div>
            <div><p className="text-[6px] text-foreground">Distance</p><p className="text-[7px] font-semibold text-muted-foreground">2.26 MI</p></div>
          </div>
        </div>
        <AppleRings size={56} delay={0.35} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="mt-2 flex items-center justify-between px-3">
        <p className="text-[9.5px] font-bold text-foreground">History</p>
        <p className="text-[7px] text-primary">Show More</p>
      </motion.div>
      <WorkoutRow kind="hike" name="Hiking" val="1.70 MI" date="Today" delay={0.2} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="mt-2 px-3"><p className="text-[9.5px] font-bold text-foreground">Trainer Tips</p></motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }} className="mx-3 mt-1.5 flex items-center gap-2 rounded-xl bg-card px-2.5 py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary"><User size={13} className="text-muted-foreground" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[6.5px] font-semibold leading-tight text-foreground">Set up your feet for warrior 1 in yoga</p>
          <p className="text-[5.5px] text-muted-foreground">with Fitness+ Trainer Jonelle</p>
          <p className="text-[6px] font-medium text-primary">Watch this Week's Tip</p>
        </div>
      </motion.div>
    </div>
  );
}

function AppleHistory({ month, items, showFilter = false }: { month: string; items: { kind: "hike" | "cycle" | "breathe"; name: string; val: string; date: string }[]; showFilter?: boolean }) {
  useUiLanguage();
  return (
    <div className="flex h-full flex-col">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex items-center gap-0.5 px-3 pt-1.5 text-primary">
        <ChevronLeft size={10} strokeWidth={2.5} />
        <span className="text-[7.5px]">Summary</span>
      </motion.div>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="px-3 pt-0.5 text-[15px] font-bold tracking-tight text-foreground">History</motion.p>
      {showFilter && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-1 flex gap-1 px-3">
          <span className="rounded-full bg-primary px-2 py-[2px] text-[6px] font-semibold text-primary-foreground">{ui("All")}</span>
          <span className="rounded-full bg-secondary px-2 py-[2px] text-[6px] font-semibold text-muted-foreground">Workouts</span>
          <span className="rounded-full bg-secondary px-2 py-[2px] text-[6px] font-semibold text-muted-foreground">Mindfulness</span>
        </motion.div>
      )}
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="px-3 pt-1.5 text-[9.5px] font-bold text-foreground">{month}</motion.p>
      {items.map((it, i) => <WorkoutRow key={`${it.name}-${i}`} kind={it.kind} name={it.name} val={it.val} date={it.date} delay={0.2 + i * 0.06} />)}
    </div>
  );
}

const APPLE_HIST_AUG = [
  { kind: "hike" as const, name: "Hiking", val: "1.70 MI", date: "Today" },
  { kind: "hike" as const, name: "Outdoor Walk", val: "5.61 MI", date: "Sunday" },
  { kind: "cycle" as const, name: "Outdoor Cycle", val: "7.72 MI", date: "Saturday" },
  { kind: "cycle" as const, name: "Outdoor Cycle", val: "3.63 MI", date: "Wednesday" },
];
const APPLE_HIST_JUL = [
  { kind: "hike" as const, name: "Outdoor Walk", val: "6.07 MI", date: "7/30/23" },
  { kind: "cycle" as const, name: "Indoor Cycle", val: "171 CAL", date: "7/25/23" },
  { kind: "hike" as const, name: "Outdoor Walk", val: "0.91 MI", date: "7/25/23" },
  { kind: "breathe" as const, name: "Breathe", val: "5 MIN", date: "7/24/23" },
  { kind: "breathe" as const, name: "Breathe", val: "2 MIN", date: "7/24/23" },
];

// Status bar tipis (jam + sinyal + baterai), dampingi Dynamic Island dari PhoneFrame.
function AppleStatusBar() {
  useUiLanguage();
  return (
    <div className="flex items-center justify-between px-3.5 pt-2">
      <span className="text-[7.5px] font-semibold text-foreground">2:34</span>
      <span className="flex items-center gap-1 text-foreground">
        <svg width="10" height="7" viewBox="0 0 17 12" fill="currentColor"><rect x="0" y="4" width="3" height="8" rx="1" /><rect x="4.5" y="2.5" width="3" height="9.5" rx="1" /><rect x="9" y="0.5" width="3" height="11.5" rx="1" /><rect x="13.5" y="0" width="3.5" height="12" rx="1" opacity=".35" /></svg>
        <svg width="14" height="7" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="1" width="21" height="10" rx="3" stroke="currentColor" strokeWidth="1" /><rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" /><rect x="2" y="2.5" width="13" height="7" rx="1.5" fill="currentColor" /></svg>
      </span>
    </div>
  );
}

// Tab bar iOS glass (Summary aktif), persist di bawah, gak ikut transisi layar.
function AppleTabBar() {
  useUiLanguage();
  return (
    <div className="relative border-t border-border bg-black/50 px-5 pt-1.5 backdrop-blur-xl">
      <div className="flex items-start justify-around">
        <div className="flex flex-col items-center gap-[2px]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--theme-accent)" strokeWidth="2.2" /><circle cx="12" cy="12" r="6" stroke="var(--theme-accent)" strokeWidth="2.2" /><circle cx="12" cy="12" r="2.2" fill="var(--theme-accent)" /></svg>
          <span className="text-[5px] font-medium text-primary">Summary</span>
        </div>
        <div className="flex flex-col items-center gap-[2px] opacity-45">
          <User size={13} className="text-foreground" />
          <span className="text-[5px] font-medium text-foreground">Fitness+</span>
        </div>
        <div className="flex flex-col items-center gap-[2px] opacity-45">
          <Users size={13} className="text-foreground" />
          <span className="text-[5px] font-medium text-foreground">Sharing</span>
        </div>
      </div>
      <div className="mx-auto mb-1 mt-1 h-[3px] w-14 rounded-full bg-foreground/30" />
    </div>
  );
}

// Preview fitness iOS (Apple-style glass) ΓÇö 3 layar cycle dgn transisi slide, ring
// aktivitas ngisi, item stagger. Cuma mount saat hover; di-memo biar terisolasi.
const IosFitnessPreview = memo(function IosFitnessPreview() {
  useUiLanguage();
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setScreen((s) => (s + 1) % 3), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-black">
      <AppleStatusBar />
      <div className="relative min-h-0 flex-1">
        <AnimatePresence>
          <motion.div key={screen} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }} className="absolute inset-0 overflow-hidden">
            {screen === 0 && <AppleSummary />}
            {screen === 1 && <AppleHistory month="August 2023" items={APPLE_HIST_AUG} showFilter />}
            {screen === 2 && <AppleHistory month="July 2023" items={APPLE_HIST_JUL} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <AppleTabBar />
    </div>
  );
});

// ===== Kripto Wallet (Android) ΓÇö light-theme multi-screen preview =====
const KRIPTO = {
  green: "var(--theme-chart-1)",
  eth: "var(--theme-chart-2)",
  ethDeep: "var(--theme-chart-3)",
  red: "var(--theme-danger)",
  ink: "var(--theme-text)",
  muted: "var(--theme-muted)",
  faint: "var(--theme-muted)",
  surface: "var(--theme-raised)",
};

// Ikon ETH kecil (gradient biru-benar, huruf Xi sebagai glyph).
function EthCoin({ size = 18, fontSize = 10 }: { size?: number; fontSize?: number }) {
  useUiLanguage();
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-bold text-foreground" style={{ width: size, height: size, fontSize, background: `linear-gradient(135deg, ${KRIPTO.eth}, ${KRIPTO.ethDeep})` }}>Ξ</span>
  );
}

// Chart harga: garis hijau ke-draw + fill gradient fade-in + dot pulse.
function KriptoChart({ delay = 0.3 }: { delay?: number }) {
  useUiLanguage();
  return (
    <div className="relative mt-1 h-[62px] w-full">
      <svg viewBox="0 0 360 120" preserveAspectRatio="none" className="size-full">
        <defs>
          <linearGradient id="kriptoChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={KRIPTO.green} stopOpacity="0.25" />
            <stop offset="100%" stopColor={KRIPTO.green} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d="M0,80 C20,75 40,65 60,70 C80,75 100,60 120,50 C140,40 155,55 170,45 C185,35 200,55 220,60 C240,65 255,50 270,45 C285,40 300,55 320,48 C335,42 348,50 360,45 L360,120 L0,120 Z" fill="url(#kriptoChartGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: delay + 0.5 }} />
        <motion.path d="M0,80 C20,75 40,65 60,70 C80,75 100,60 120,50 C140,40 155,55 170,45 C185,35 200,55 220,60 C240,65 255,50 270,45 C285,40 300,55 320,48 C335,42 348,50 360,45" stroke={KRIPTO.green} strokeWidth="2.5" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: "easeOut", delay }} />
        <motion.circle cx="170" cy="45" r="5" fill={KRIPTO.green} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.5, 1] }} transition={{ duration: 1.2, delay: delay + 1.1, repeat: Infinity, repeatDelay: 1.5 }} />
      </svg>
    </div>
  );
}

function KriptoDashboard() {
  useUiLanguage();
  const lang = useLang();
  return (
    <div className="flex h-full flex-col bg-card px-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }} className="flex items-center justify-between pt-1.5">
        <ChevronLeft size={15} className="text-muted-foreground" />
        <div className="flex items-center gap-1"><EthCoin size={18} fontSize={10} /><span className="text-[10px] font-semibold text-muted-foreground">Ethereum</span></div>
        <div className="flex items-center gap-1.5"><Star size={12} className="text-muted-foreground" /><MoreHorizontal size={13} className="text-muted-foreground" /></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }} className="pt-1">
        <p className="text-[17px] font-extrabold tracking-tight text-muted-foreground">{new Intl.NumberFormat(uiLocale(), {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(41285600)}</p>
        <div className="flex items-center gap-1.5"><span className="text-[7px] text-muted-foreground">{ui("pada 21 Jan, 11:42")}</span><span className="text-[7px] font-semibold text-destructive">▼ {(3.04).toLocaleString(uiLocale())}%</span></div>
      </motion.div>

      <KriptoChart delay={0.3} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }} className="flex justify-around pt-1">
        {(lang === "en" ? ["1H", "1D", "1W", "1M", "1Y"] : ["1J", "1H", "1M", "1B", "1T"]).map((t, index) => (
          <span key={t} className={`rounded-full px-2 py-[2px] text-[7px] font-medium ${index === 2 ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"}`}>{t}</span>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45, ease: [0.2, 0.8, 0.2, 1] }} className="flex gap-1.5 pt-1.5">
        <div className="flex-1 rounded-lg bg-card px-2 py-1.5">
          <p className="text-[7px] font-medium text-muted-foreground">{ui("Saldo")}</p>
          <div className="mt-0.5 flex items-center gap-1"><EthCoin size={13} fontSize={7} /><span className="text-[8px] font-bold text-muted-foreground">{(0.006714).toLocaleString(uiLocale(), {maximumFractionDigits:6})}</span></div>
        </div>
        <div className="flex-1 rounded-lg bg-card px-2 py-1.5">
          <p className="text-[7px] font-medium text-muted-foreground">{ui("Nilai")}</p>
          <span className="mt-0.5 block text-[8px] font-bold text-muted-foreground">{new Intl.NumberFormat(uiLocale(), {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(277800)}</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5, ease: [0.2, 0.8, 0.2, 1] }} className="pt-1.5">
        <p className="text-[9px] font-bold text-muted-foreground">{ui("Deskripsi")}</p>
        <p className="mt-0.5 text-[7px] leading-snug text-muted-foreground">{ui("Ethereum adalah platform global untuk aplikasi terdesentralisasi, bertujuan menghilangkan kebutuhan akan otoritas pusat.")}<span className="font-medium text-primary">{ui("Baca Selengkapnya")}</span></p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.55, ease: [0.2, 0.8, 0.2, 1] }} className="mt-auto flex gap-1.5 pb-2 pt-2">
        <span className="flex-1 rounded-full bg-background py-1.5 text-center text-[9px] font-semibold text-foreground">{ui("Tukar")}</span>
        <span className="flex-1 rounded-full bg-primary py-1.5 text-center text-[9px] font-semibold text-primary-foreground">{ui("Kirim")}</span>
      </motion.div>
    </div>
  );
}

function KriptoContact({ icon, name, sub, bg, delay = 0 }: { icon: React.ReactNode; name: string; sub: string; bg: string; delay?: number }) {
  useUiLanguage();
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: [0.2, 0.8, 0.2, 1] }} className="mt-1 flex items-center gap-1.5 rounded-lg bg-card px-2 py-1.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ background: bg }}>{icon}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-[8.5px] font-semibold text-muted-foreground">{name}</p><p className="text-[7px] text-muted-foreground">{sub}</p></div>
    </motion.div>
  );
}

function KriptoSendSelect() {
  useUiLanguage();
  return (
    <div className="flex h-full flex-col bg-card px-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between border-b border-border pb-1.5 pt-1.5">
        <p className="text-[12px] font-bold text-muted-foreground">{ui("Kirim")}</p>
        <X size={13} className="text-muted-foreground" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="mt-1.5 flex items-center rounded-lg bg-card px-2 py-1.5">
        <span className="text-[8px] font-medium text-muted-foreground">{ui("Ke")}</span>
        <span className="ml-1 flex-1 text-[8px] text-muted-foreground">{ui("ENS atau Alamat")}</span>
        <span className="rounded-md bg-background px-1.5 py-[2px] text-[7px] font-semibold text-foreground">Paste</span>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-card px-2 py-1.5">
        <QrCode size={14} className="text-muted-foreground" />
        <div><p className="text-[8.5px] font-semibold text-muted-foreground">Scan QR Code</p><p className="text-[7px] text-muted-foreground">{ui("Ketuk untuk scan alamat")}</p></div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.15 }} className="flex items-center gap-1 pt-1.5"><Clock size={9} className="text-muted-foreground" /><span className="text-[8px] font-semibold text-muted-foreground">{ui("Terbaru")}</span></motion.div>
      <KriptoContact icon={<Star size={13} className="text-primary" />} name="Stash" sub={ui("1 Transaksi Sebelumnya")} bg="var(--theme-raised)" delay={0.2} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.25 }} className="flex items-center gap-1 pt-1.5"><Sparkles size={9} className="text-muted-foreground" /><span className="text-[8px] font-semibold text-muted-foreground">{ui("Disarankan")}</span></motion.div>
      <KriptoContact icon={<CreditCard size={13} className="text-primary" />} name="0xb249....9768" sub={ui("1 Transaksi Sebelumnya")} bg="var(--theme-tint)" delay={0.3} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.35 }} className="flex items-center gap-1 pt-1.5"><User size={9} className="text-muted-foreground" /><span className="text-[8px] font-semibold text-muted-foreground">{ui("Buku Alamat")}</span></motion.div>
      <KriptoContact icon={<CreditCard size={13} className="text-muted-foreground" />} name="vitalik.eth" sub={ui("Tidak Ada Transaksi Sebelumnya")} bg="var(--theme-raised)" delay={0.4} />
    </div>
  );
}

function KriptoSendAmount() {
  useUiLanguage();
  return (
    <div className="flex h-full flex-col bg-card px-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between border-b border-border pb-1.5 pt-1.5">
        <p className="text-[12px] font-bold text-muted-foreground">{ui("Kirim")}</p>
        <X size={13} className="text-muted-foreground" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="mt-1.5 flex items-center rounded-lg bg-card px-2 py-1.5">
        <span className="text-[8px] font-medium text-muted-foreground">{ui("Ke")}</span>
        <span className="ml-1 text-[8px] font-medium text-muted-foreground">0xb249....9768</span>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: 0.1 }} className="pt-2 text-center">
        <p className="text-[18px] font-extrabold tracking-tight text-muted-foreground">{new Intl.NumberFormat(uiLocale(), {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(41285600)}</p>
        <div className="mt-0.5 flex items-center justify-center gap-1"><EthCoin size={14} fontSize={8} /><span className="text-[8px] font-medium text-muted-foreground">{(0.00001902).toLocaleString(uiLocale(), {maximumFractionDigits:8})}</span><ArrowUpDown size={9} className="text-muted-foreground" /></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-card px-2 py-1.5">
        <EthCoin size={24} fontSize={13} />
        <div className="flex-1"><p className="text-[8.5px] font-semibold text-muted-foreground">Ethereum</p><p className="text-[7px] text-muted-foreground">{(0.006714).toLocaleString(uiLocale(), {maximumFractionDigits:6})}</p></div>
        <span className="rounded-md border border-border px-1.5 py-[2px] text-[7px] font-semibold text-muted-foreground">{ui("Maks")}</span>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="grid grid-cols-3 gap-1 pt-1.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((k) => (
          <span key={k} className={`rounded-md py-1 text-center text-[10px] font-semibold ${k === "." ? "bg-card text-muted-foreground" : "bg-card text-muted-foreground"}`}>{k}</span>
        ))}
        <span className="grid place-items-center rounded-md bg-card py-1"><Delete size={11} className="text-muted-foreground" /></span>
      </motion.div>
      <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="mt-1.5 rounded-full bg-primary py-1.5 text-center text-[9px] font-bold text-primary-foreground">{ui("Lanjutkan")}</motion.span>
    </div>
  );
}

const KriptoPreview = memo(function KriptoPreview() {
  useUiLanguage();
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setScreen((s) => (s + 1) % 3), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-card">
      <div className="flex items-center justify-between px-4 pt-2">
        <span className="text-[8px] font-semibold text-muted-foreground">9:41</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <svg width="10" height="7" viewBox="0 0 16 12" fill="currentColor"><rect x="0" y="6" width="3" height="6" rx="1" /><rect x="4.5" y="4" width="3" height="8" rx="1" /><rect x="9" y="2" width="3" height="10" rx="1" /><rect x="13.5" y="0" width="2.5" height="12" rx="1" /></svg>
          <svg width="14" height="7" viewBox="0 0 22 12" fill="none"><rect x="0.5" y="0.5" width="18" height="11" rx="3" stroke="currentColor" strokeWidth="1" /><rect x="2" y="2" width="13" height="8" rx="1.5" fill="currentColor" /><path d="M20 4v4a2 2 0 000-4z" fill="currentColor" /></svg>
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence>
          <motion.div key={screen} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }} className="absolute inset-0 overflow-hidden">
            {screen === 0 && <KriptoDashboard />}
            {screen === 1 && <KriptoSendSelect />}
            {screen === 2 && <KriptoSendAmount />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

// Semua device auto-animasi tanpa hover.
