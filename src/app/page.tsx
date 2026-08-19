"use client";

import Link from "next/link";
import { animate, AnimatePresence, motion, useMotionValue, useSpring, useScroll } from "motion/react";
import { ArrowUpDown, ArrowUpRight, Bike, ChevronLeft, Clock, CreditCard, Delete, Footprints, KeyRound, Lock, MoreHorizontal, Play, QrCode, Sparkles, Star, User, Users, Wind, X, Zap } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import DottedDemo from "@/components/ui/dotted-demo";
import { IPhone17ShopDemo } from "@/components/ui/iphone17-shop-demo";
import { getCurrentUser, refreshCurrentUser } from "@/lib/current-user";
import { LanguageToggle } from "@/components/lang-toggle";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { homeCopy } from "@/lib/copy-home";

function Magnetic({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 20 });
  const sy = useSpring(y, { stiffness: 220, damping: 20 });
  return <motion.div ref={ref} className={className} style={{ x: sx, y: sy }} onMouseMove={(e) => { const r = ref.current?.getBoundingClientRect(); if (!r) return; x.set((e.clientX - (r.left + r.width / 2)) * 0.18); y.set((e.clientY - (r.top + r.height / 2)) * 0.18); }} onMouseLeave={() => { x.set(0); y.set(0); }}>{children}</motion.div>;
}

function Eyebrow({ children }: { children: string }) {
  return <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#9CA9B8]">{children}</p>;
}

function DoubleBezel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[24px] border border-[#1E252F] bg-[#0F1317] p-1.5 shadow-[0_18px_60px_#000A] ${className}`}><div className="rounded-[calc(24px-6px)] border border-[#1E252F] bg-[#141A22] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">{children}</div></div>;
}

function BentoMock({ eyebrow, title, name, meta, ok = false, list, pulse = false, typing = false }: { eyebrow?: string; title?: string; name?: string; meta?: string; ok?: boolean; list?: string[]; pulse?: boolean; typing?: boolean }) {
  return (
    <div className={`w-44 rounded-xl border p-3 shadow-xl ${ok ? "border-[#74FA6A]/30 bg-[#121A14]" : "border-white/10 bg-[#171D25]"} ${pulse ? "relative overflow-hidden" : ""}`}>
      {pulse && <motion.div animate={{ x: ["-40%", "120%"] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }} className="pointer-events-none absolute inset-y-0 w-[38%] bg-gradient-to-r from-transparent via-white/[.07] to-transparent" />}
      {eyebrow && <p className="font-mono text-[8px] font-bold uppercase tracking-[.16em] text-white/40">{eyebrow}</p>}
      {title && <p className="font-mono text-[8px] font-bold uppercase tracking-[.16em] text-white/30">{title}</p>}
      {name && <p className="mt-2 truncate text-[11px] font-semibold text-white">{name}</p>}
      {meta && <p className="mt-2 font-mono text-[8px] text-white/35">{meta}</p>}
      {list && <div className="mt-2 space-y-1.5">{list.map((item, i) => (<div key={item} className="flex items-center gap-1.5 truncate rounded border border-white/10 bg-[#11151B] px-2 py-1.5 font-mono text-[8px] text-white/60"><span className="size-1 rounded-full bg-current" /><span className="truncate">{item}</span>{typing && i === 0 && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="ml-auto h-2 w-1 bg-white/60" />}</div>))}</div>}
    </div>
  );
}

function Connector() {
  return <div className="relative h-px w-10 bg-white/15"><i className="absolute -right-1 -top-1 size-2 rounded-full border border-white/15 bg-[#151A21]" /></div>;
}

const stackRows = [
  [{ name: "Next.js", slug: "nextdotjs" }, { name: "React", slug: "react" }, { name: "TypeScript", slug: "typescript" }, { name: "Tailwind CSS", slug: "tailwindcss" }, { name: "Supabase", slug: "supabase" }, { name: "Motion", slug: "framer" }],
  [{ name: "Node.js", slug: "nodedotjs" }, { name: "PostgreSQL", slug: "postgresql" }, { name: "Drizzle", slug: "drizzle" }, { name: "Redis", slug: "redis" }, { name: "Docker", slug: "docker" }, { name: "Vercel", slug: "vercel" }, { name: "GitHub", slug: "github" }],
];

function StackMarquee() {
  const repeated = (row: typeof stackRows[number]) => [...row, ...row, ...row];

  return <section className="relative top-12 mx-auto mt-24 w-full overflow-hidden py-5 md:top-20 md:mt-32 md:py-8" aria-label="Scratch Agent stack">
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent md:w-48" />
    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent md:w-48" />
    <div className="stack-row"><div className="stack-track stack-track-right">{[0, 1].map((copy) => <div key={copy} className="stack-group">{repeated(stackRows[0]).map((item, i) => <span key={`${item.name}-${i}`} className="stack-brand"><img src={`https://cdn.simpleicons.org/${item.slug}/B7C8B9`} alt="" />{item.name}</span>)}</div>)}</div></div>
    <div className="stack-row mt-5"><div className="stack-track stack-track-left">{[0, 1].map((copy) => <div key={copy} className="stack-group">{repeated(stackRows[1]).map((item, i) => <span key={`${item.name}-${i}`} className="stack-brand"><img src={`https://cdn.simpleicons.org/${item.slug}/B7C8B9`} alt="" />{item.name}</span>)}</div>)}</div></div>
  </section>;
}

function Navbar() {
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
      <motion.nav className={`sticky top-3 z-40 mx-auto flex h-[54px] w-[calc(100%-28px)] max-w-[1300px] items-center justify-between rounded-full px-4 transition-all duration-300 md:top-4 md:px-5 ${scrolled ? "border border-white/[.08] bg-[rgba(10,10,10,0.8)] shadow-[0_12px_40px_rgba(0,0,0,.3)] backdrop-blur-[12px]" : "border border-white/[.06] bg-[#1D2223]"}`} initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .5, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-[18px] font-semibold tracking-[-.04em] text-[#E8F0E8]"><span className="relative grid size-7 place-items-center overflow-hidden text-[#74FA6A]" aria-hidden="true"><span className="absolute left-0 top-[7px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" /><span className="absolute left-[8px] top-[3px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" /><span className="absolute left-[16px] top-[7px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" /></span>Scratch Agent</Link>
          <div className="hidden items-center gap-9 md:flex"><Link href="/pricing" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">{t("nav", "pricing", lang)}</Link><Link href="/solutions" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">{t("nav", "solutions", lang)}</Link><Link href="/docs" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">{t("nav", "docs", lang)}</Link><a href="https://scratchagent.store/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-mono text-[12px] tracking-[0.02em] text-[#74FA6A] transition-colors duration-200 hover:text-[#A8FF9B]"><KeyRound size={13} strokeWidth={2.2} aria-hidden="true" />Api Key</a></div>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <LanguageToggle />
          {loggedIn ? (
            <Link href="/profile" className="font-mono text-[12px] tracking-[0.02em] text-white/80 transition-colors hover:text-[#74FA6A]">{t("nav", "profile", lang)}</Link>
          ) : (
            <Link href="/login" className="font-mono text-[12px] tracking-[0.02em] text-white/80 transition-colors hover:text-[#74FA6A]">{t("nav", "login", lang)}</Link>
          )}
          <Link href={loggedIn ? "/new" : "/login"} className="grid size-8 place-items-center rounded-full bg-[#74FA6A] text-black transition hover:scale-105 hover:bg-[#A8FF9B]" aria-label="Mulai sekarang"><ArrowUpRight size={16} /></Link>
        </div>
        <button className="grid size-8 place-items-center text-white md:hidden" onClick={() => setMobileNav((v) => !v)} aria-label="Navigasi"><span className="relative block h-3.5 w-5"><span className={`absolute left-0 top-0 block h-px w-full bg-white transition-all duration-300 ${mobileNav ? "translate-y-[7px] rotate-45" : ""}`} /><span className={`absolute left-0 top-[7px] block h-px w-full bg-white transition-opacity duration-200 ${mobileNav ? "opacity-0" : "opacity-100"}`} /><span className={`absolute left-0 top-[14px] block h-px w-full bg-white transition-all duration-300 ${mobileNav ? "translate-y-[-7px] -rotate-45" : ""}`} /></span></button>
      </motion.nav>
      <motion.div className="fixed inset-0 z-[60] flex flex-col bg-[#0A0A0A] md:hidden" initial={false} animate={mobileNav ? { opacity: 1, pointerEvents: "auto" } : { opacity: 0, pointerEvents: "none" }} transition={{ duration: .35, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex h-[64px] items-center justify-between px-5"><span className="flex items-center gap-2 text-[18px] font-semibold tracking-[-.04em] text-[#E8F0E8]"><span className="size-6 skew-x-[-28deg] bg-[#74FA6A]" />Scratch Agent</span><div className="flex items-center gap-3"><LanguageToggle /><button className="grid size-8 place-items-center text-white" onClick={() => setMobileNav(false)} aria-label="Tutup"><X size={18} /></button></div></div>
        <div className="flex flex-1 flex-col justify-between px-5 py-12"><div className="space-y-1">{[{ href: "/pricing", label: t("nav", "pricing", lang) }, { href: "/solutions", label: t("nav", "solutions", lang) }, { href: "/docs", label: t("nav", "docs", lang) }, { href: "https://scratchagent.store/", label: "Api Key", external: true }, { href: "/project/demo", label: t("cta", "examplePlan", lang) }].map((link, i) => (<motion.a key={link.href} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noopener noreferrer" : undefined} onClick={() => setMobileNav(false)} className={`block py-4 font-mono text-[14px] tracking-[0.08em] transition-colors hover:text-[#74FA6A] ${link.external ? "text-[#74FA6A]" : "text-white/70"}`} initial={{ opacity: 0, y: 16 }} animate={mobileNav ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ delay: 0.08 + i * 0.05, duration: .4, ease: [0.16, 1, 0.3, 1] }}>{link.label}</motion.a>))}</div><motion.div initial={{ opacity: 0, y: 16 }} animate={mobileNav ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ delay: 0.32, duration: .4, ease: [0.16, 1, 0.3, 1] }}><Link href={loggedIn ? "/new" : "/login"} onClick={() => setMobileNav(false)} className="flex w-full items-center justify-center rounded-full border border-[#74FA6A] px-6 py-3.5 font-mono text-[13px] tracking-[0.06em] text-[#74FA6A] transition-colors hover:bg-[#74FA6A] hover:text-black">{t("cta", "startFree", lang)}</Link><p className="mt-6 font-mono text-[11px] tracking-[.08em] text-white/30">{loggedIn ? <Link href="/profile" className="hover:text-[#74FA6A]">{t("nav", "profile", lang)}</Link> : t("cta", "login", lang)}</p></motion.div></div>
      </motion.div>
    </>
  );
}

export default function Home() {
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
    <main className="rv2-page relative isolate w-full max-w-full overflow-x-hidden bg-[#0A0A0A] text-[#E8EDEC] selection:bg-[#74FA6A]/30 selection:text-black">
      <link rel="preload" href="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" as="fetch" crossOrigin="anonymous" />
      <DottedDemo />
      <div className="pointer-events-none fixed inset-0 z-[70] opacity-[.055] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")` }} />
      <a href="#agents" className="relative z-30 mb-3 flex min-h-8 items-center justify-center gap-2 bg-[#74FA6A] px-4 py-1.5 text-center text-[11px] font-medium leading-4 text-black transition-colors hover:bg-[#9AFF82] md:mb-4 md:text-[12px]">{hc.banner}<span aria-hidden="true">→</span></a>
      <Navbar />

       <section className="relative mx-auto max-w-[980px] px-5 pb-14 pt-10 md:px-10 md:pb-18 md:pt-12">
         <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center text-center">
           <h1 className="max-w-[16ch] text-balance text-[clamp(2.8rem,5.8vw,5rem)] font-medium leading-[.96] tracking-[-.065em] text-[#E8F8E5]"><span className="text-[#74FA6A]">{hc.heroA}</span><br />{hc.heroB}</h1>
           <p className="mt-5 max-w-[54ch] text-balance text-[15px] leading-[1.6] text-[#A9C5A7]">{hc.heroSub}</p>
           <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
               <Magnetic><Link href={loggedIn ? "/new" : "/login"} className="rv2-button min-w-[146px] bg-[#74FA6A] text-black hover:bg-[#A8FF9B] group">{hc.heroStart} <span className="grid size-6 place-items-center rounded-full bg-black/10 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"><ArrowUpRight size={12} /></span></Link></Magnetic>
             <Link href="/project/demo" className="rv2-button light min-w-[146px]"><Play size={13} fill="currentColor" /> {hc.heroDemo}</Link>
           </div>
        </motion.div>
      </section>

       <StackMarquee />
       <motion.section initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .7, ease: [0.16, 1, 0.3, 1] }} className="relative mx-auto mt-24 w-[min(1220px,calc(100%-32px))] overflow-hidden rounded-[26px] border border-white/10 bg-[#0E0E0E] p-2 shadow-[0_28px_90px_#000C] md:mt-32 md:p-3">
         <div className="rounded-[18px] border border-white/10 bg-[#151A21]">
           <div className="flex h-11 items-center justify-between border-b border-white/10 px-4 font-mono text-[10px] text-white/40"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#FF5F56]" /><i className="size-2.5 rounded-full bg-[#FFBD2E]" /><i className="size-2.5 rounded-full bg-[#74FA6A]" /></span><span className="tracking-[.08em]">Scratch Agent · mission control</span><span className="inline-flex items-center gap-1.5 text-emerald-300/80"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> live • 5s</span></div>
           <div className="grid min-h-[420px] md:grid-cols-[176px_1fr_296px]">
             <aside className="hidden border-r border-white/10 p-4 md:block"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-white/30">{hc.mockPlanLabel}</p>{hc.mockPlanItems.map((item, index) => (<div key={item} className={`mt-2 flex items-center gap-2 rounded-[10px] px-2.5 py-2 font-mono text-[11px] ${index === 0 ? "bg-[#74FA6A]/10 text-[#74FA6A] border border-[#74FA6A]/20" : "text-white/44"}`}><span className="size-1.5 rounded-full bg-current" />{item}</div>))}</aside>
             <div className="relative overflow-x-auto p-5 md:p-6"><div className="absolute inset-0 opacity-[.14] [background-image:radial-gradient(#9AA5B366_1px,transparent_1px)] [background-size:18px_18px]" /><div className="relative flex min-w-[640px] items-center gap-10 py-16"><BentoMock ok title={hc.mockProjectTitle} name={hc.mockProjectName} meta="0 / 120 task" /><Connector /><div className="space-y-5"><BentoMock eyebrow={`${hc.mockPhase} 1`} name={hc.mockPhaseOrder[0]} meta="20 task" pulse /><BentoMock eyebrow={`${hc.mockPhase} 2`} name={hc.mockPhaseOrder[1]} meta="14 task" /><BentoMock eyebrow={`${hc.mockPhase} 3`} name={hc.mockPhaseOrder[2]} meta="16 task" /></div><Connector /><div className="space-y-5"><BentoMock title={hc.mockSubFeatureTitle} list={hc.mockSubFeatures} /><BentoMock title={hc.mockTaskTitle} list={hc.mockTasks} typing /></div></div></div>
             <aside className="hidden border-l border-white/10 bg-[#0E1115] p-5 lg:block"><Eyebrow>{hc.mockAgentLabel}</Eyebrow><h3 className="mt-3 text-[15px] font-semibold tracking-[-.02em] text-white">F01-S01-T02</h3><p className="mt-2 text-xs leading-5 text-white/48">{hc.mockAgentTask}</p><div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[10px] leading-6 text-white/50"><span className="text-white/70">{hc.mockNextTask}</span><br /><span className="text-emerald-300">✓</span> {hc.mockDepsReady}<br /><span className="text-white">›</span> checkpoint: false</div><div className="mt-5 flex items-center gap-2 font-mono text-[10px] text-white/30"><Zap size={11} className="text-white/40" /> polling 5s</div></aside>
           </div>
         </div>
       </motion.section>

      <section id="product" className="mx-auto max-w-[1360px] px-5 pb-24 pt-24 md:px-10 md:pb-32 md:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-6"><div><Eyebrow>{hc.productEyebrow}</Eyebrow><h2 className="mt-5 max-w-[18ch] text-balance text-[clamp(2.35rem,4.2vw,3.75rem)] font-medium leading-[.98] tracking-[-.055em] text-[#F0F3F5]">{hc.productTitle}</h2></div></div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <FeatureCard label={hc.features[0].label} title={hc.features[0].title} copy={hc.features[0].copy} terminal={<AnimatedTerminalPRD />} />
          <FeatureCard label={hc.features[1].label} title={hc.features[1].title} copy={hc.features[1].copy} terminal={<AnimatedTerminalRuntime />} />
          <FeatureCard label={hc.features[2].label} title={hc.features[2].title} copy={hc.features[2].copy} terminal={<AnimatedTerminalQueue />} />
          <FeatureCard label={hc.features[3].label} title={hc.features[3].title} copy={hc.features[3].copy} terminal={<><div className="flex items-center justify-between"><span>LIVE TELEMETRY</span><span className="text-[#74FA6A]">5s poll</span></div><div className="relative mt-6 h-[96px] overflow-hidden rounded border border-white/10 bg-[#111312] p-3"><motion.svg viewBox="0 0 330 100" preserveAspectRatio="none" className="h-full w-full"><motion.polyline points="0,70 28,35 55,72 88,65 118,82 148,45 175,58 208,29 235,66 260,51 290,76 315,42 330,48" fill="none" stroke="#74FA6A" strokeWidth="2" strokeLinecap="round" animate={{ pathLength: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }} /></motion.svg></div><p className="mt-3 text-[10px] text-white/35">{hc.termActiveLine}</p></>} />
        </div>
      </section>

      <section id="showcase" className="mx-auto max-w-[1360px] px-5 pb-24 md:px-10 md:pb-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div><Eyebrow>case studies</Eyebrow><h2 className="mt-5 max-w-[20ch] text-balance text-[clamp(2.35rem,4.2vw,3.75rem)] font-medium leading-[.98] tracking-[-.055em] text-[#F0F3F5]">Dari brief jadi plan siap eksekusi.</h2></div>
          <p className="max-w-[42ch] text-sm leading-6 text-[#8C97A5]">Project simulasi nyata: dihasilkan otomatis dari brief singkat, lalu dijalankan task demi task oleh agent — dari aplikasi mobile sampai website.</p>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-[480px] w-full max-w-[240px]"><PhoneFrame variant="android"><FlappyPreview /></PhoneFrame></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-[#E8F0E8]">Flappy Bird</p><p className="mt-1 flex items-center justify-center"><img src="https://cdn.simpleicons.org/android/3DDC84" alt="Android" className="h-4 w-4" /></p></div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-[480px] w-full max-w-[240px]"><PhoneFrame variant="android"><KriptoPreview /></PhoneFrame></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-[#E8F0E8]">Kripto Wallet</p><p className="mt-1 flex items-center justify-center"><img src="https://cdn.simpleicons.org/android/3DDC84" alt="Android" className="h-4 w-4" /></p></div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-[480px] w-full max-w-[240px]"><PhoneFrame variant="ios"><IosFitnessPreview /></PhoneFrame></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-[#E8F0E8]">Habit Tracker</p><p className="mt-1 flex items-center justify-center"><img src="https://cdn.simpleicons.org/apple/E8F0E8" alt="iOS" className="h-4 w-4" /></p></div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-[480px] w-full max-w-[240px] aspect-[9/19.5]"><IPhone17ShopDemo /></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-[#E8F0E8]">Sneakers Shop</p><p className="mt-1 flex items-center justify-center"><img src="https://cdn.simpleicons.org/apple/E8F0E8" alt="iOS" className="h-4 w-4" /></p></div>
          </div>
        </div>
        {/* Preview sample web project (CSS murni, tanpa WebGL/Spline) — klik langsung
            ke halaman sample masing-masing; tidak ada button terpisah */}
        <div className="mt-12 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/sample/web-project" className="group flex flex-col items-center gap-4" aria-label={lang === "en" ? "Open sample web project 1" : "Buka sample web project 1"}>
            <div className="h-[180px] w-full max-w-[300px]"><GalaxyHeroPreview /></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-[#E8F0E8]">Galaxy Hero</p><p className="mt-1 font-mono text-[10px] tracking-[.18em] text-[#8C97A5]">WEB · SPLINE</p></div>
          </Link>
          <Link href="/sample/web-project-2" className="group flex flex-col items-center gap-4" aria-label={lang === "en" ? "Open sample web project 2" : "Buka sample web project 2"}>
            <div className="h-[180px] w-full max-w-[300px]"><VortexPreview /></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-[#E8F0E8]">ImmersiaVR</p><p className="mt-1 font-mono text-[10px] tracking-[.18em] text-[#8C97A5]">WEB · WEBGL</p></div>
          </Link>
          <Link href="/sample/web-project-3" className="group flex flex-col items-center gap-4" aria-label={lang === "en" ? "Open sample web project 3" : "Buka sample web project 3"}>
            <div className="h-[180px] w-full max-w-[300px]"><SaasPreview /></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-[#E8F0E8]">Landing Kit</p><p className="mt-1 font-mono text-[10px] tracking-[.18em] text-[#8C97A5]">WEB · SAAS</p></div>
          </Link>
          <Link href="/sample/web-project-4" className="group flex flex-col items-center gap-4" aria-label={lang === "en" ? "Open sample web project 4" : "Buka sample web project 4"}>
            <div className="h-[180px] w-full max-w-[300px]"><DashboardPreview /></div>
            <div className="text-center"><p className="text-[15px] font-semibold text-[#E8F0E8]">Efferd Dashboard</p><p className="mt-1 font-mono text-[10px] tracking-[.18em] text-[#8C97A5]">WEB · ANALYTICS</p></div>
          </Link>
        </div>
      </section>

      <section id="solutions" className="mx-auto max-w-[1360px] px-5 pb-24 md:px-10 md:pb-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div><Eyebrow>{hc.solutionsEyebrow}</Eyebrow><h2 className="mt-5 max-w-[22ch] text-balance text-[clamp(2.35rem,4.2vw,3.75rem)] font-medium leading-[.98] tracking-[-.055em] text-[#F0F3F5]">{hc.solutionsTitle}</h2></div>
          <p className="max-w-[42ch] text-sm leading-6 text-[#8C97A5]">{hc.solutionsSub}</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {hc.solutions.map((sol) => (
            <SolutionCard key={sol.label} label={sol.label} title={sol.title} copy={sol.copy} points={sol.points} />
          ))}
        </div>
      </section>


      <section id="agents" className="mx-auto w-[calc(100%-32px)] max-w-[1280px] mb-8 mt-8 overflow-hidden rounded-[24px] border border-white/10 bg-[#111318] px-5 py-16 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-2"><div><Eyebrow>{hc.agentsEyebrow}</Eyebrow><h2 className="mt-4 text-[clamp(2.1rem,4.8vw,3.8rem)] font-semibold leading-[.95] tracking-[-.06em] text-white">{hc.agentsTitleA}<br />{hc.agentsTitleB}</h2><p className="mt-5 max-w-[44ch] text-sm leading-6 text-[#8C97A5]">{hc.agentsSub}</p><Magnetic className="mt-8 inline-block"><a href="https://scratchagent.store/" target="_blank" rel="noopener noreferrer" className="btn-donate inline-flex items-center gap-2.5"><KeyRound size={18} strokeWidth={2.2} aria-hidden="true" /> {lang === "en" ? "Get your Api Key" : "Ambil Api Key kamu"}</a></Magnetic></div><DoubleBezel className="overflow-hidden !p-1.5"><div className="rounded-[calc(24px-10px)] bg-[#0A0A0A] p-5 font-mono text-[12px] leading-7 text-[#C5CDD7]"><div className="mb-3 flex gap-1.5"><i className="size-2.5 rounded-full bg-[#FF5F56]" /><i className="size-2.5 rounded-full bg-[#FFBD2E]" /><i className="size-2.5 rounded-full bg-[#74FA6A]" /></div><PromptShowcase /></div></DoubleBezel></div>
      </section>


      <footer className="px-5 py-10 md:px-10"><div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-8 border-t border-white/10 pt-8 md:flex-row"><div><div className="font-semibold text-[13px] tracking-[-.02em] text-white">Scratch Agent</div><p className="mt-2 font-mono text-[11px] text-[#5B6676]">{hc.footerTagline}</p></div><div className="flex flex-wrap gap-6 font-mono text-[11px] text-[#6C7787]"><Link href="/new">{hc.footerCreate}</Link><Link href="/project/demo">demo</Link><Link href="/docs">docs</Link><span>© 2026 Scratch Agent</span></div></div></footer>
    </main>
  );
}

function TypingText({ text, speed = 32, loop = true, className = "" }: { text: string; speed?: number; loop?: boolean; className?: string }) {
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
  return <span className={className}>{out}<motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: .6 }} className="ml-px inline-block h-[1em] w-[7px] translate-y-[2px] bg-white/80" /></span>;
}

function AnimatedTerminalPRD() {
  const hc = homeCopy(useLang());
  return (
    <div className="space-y-1">
      <p><span className="text-[#74FA6A]">$</span> <TypingText text="scratch plan parse" speed={38} loop /></p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9 }} className="space-y-[4px] pt-3">
        <p className="text-white/50">{hc.termBrief}</p>
        <p className="text-[#74FA6A]">{hc.termPhases}</p>
        <p className="text-white/65">graph.edges: 28 · deps acyclic</p>
      </motion.div>
    </div>
  );
}

function AnimatedTerminalRuntime() {
  const hc = homeCopy(useLang());
  const items = [{ label: hc.termReadingPrd }, { label: hc.termBuildingGraph }, { label: hc.termWaitingAgent }];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (items.length + 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 pb-3"><span>SCRATCH / RUNTIME</span><span className="text-[#74FA6A]">● live</span></div>
      <div className="mt-4 flex flex-col justify-center space-y-3">
        {items.map((it, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <div key={it.label} className="flex items-center gap-3">
              <span className={`relative grid size-4 place-items-center rounded-full border leading-none transition-colors duration-300 ${done ? "border-[#74FA6A] bg-[#74FA6A]/10 text-[#74FA6A]" : active ? "border-[#74FA6A]/50 text-white/40" : "border-white/15 text-transparent"}`}><span className="text-[10px] leading-none">{done ? "✓" : ""}</span></span>
              <span className={`${active ? "text-white" : done ? "text-white/65" : "text-white/30"} transition-colors`}>{it.label}</span>
              <span className="ml-auto text-[9px] text-white/30">{done ? hc.termDone : active ? "…" : hc.termNext}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AnimatedTerminalQueue() {
  const rows = [{ k: "frontend", v: 42 }, { k: "backend", v: 72 }, { k: "qa", v: 58 }];
  return (
    <>
      <div className="flex items-center justify-between"><span>DEPENDENCY QUEUE</span><span className="text-[#74FA6A]">READY</span></div>
      <div className="mt-6 space-y-4">
        {rows.map((r, i) => (
          <div key={r.k}>
            <div className="mb-1 flex justify-between"><span>{r.k}</span><span>08 tasks</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div animate={{ width: [`0%`, `${r.v}%`, `${r.v * .6}%`, `${r.v}%`] }} transition={{ duration: 4.2, delay: i * .35, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} className="h-full rounded-full bg-[#74FA6A]" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PromptShowcase() {
  const hc = homeCopy(useLang());
  const steps = hc.promptSteps;
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((s) => (s + 1) % (steps.length + 1)), 1300);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-[252px] space-y-4 leading-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/40">
        <span>mission prompt</span>
        <span className="inline-flex items-center gap-1.5 text-[#74FA6A]"><span className="size-1.5 rounded-full bg-[#74FA6A] shadow-[0_0_8px_#74FA6A]" />{hc.promptReadyBadge}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
        <span className="rounded border border-white/10 bg-[#11151B] px-2 py-1 text-white/45">token: rv_••••••••</span>
        <span className="rounded border border-white/10 bg-[#11151B] px-2 py-1 text-white/45">plan: futsalgo</span>
        <span className="rounded border border-[#74FA6A]/25 bg-[#74FA6A]/[.07] px-2 py-1 text-[#74FA6A]">{hc.promptAgentAny}</span>
      </div>
      <div className="space-y-2.5 pt-1">
        {steps.map((step, i) => {
          const done = active > i;
          const current = active === i;
          return (
            <div key={step.label} className="flex items-center gap-2.5">
              <span className={`grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[9px] leading-none transition-colors duration-300 ${done ? "border-[#74FA6A] bg-[#74FA6A]/10 text-[#74FA6A]" : current ? "border-[#74FA6A]/50 text-white/50" : "border-white/15 text-white/25"}`}>{done ? "✓" : i + 1}</span>
              <span className={`text-[11.5px] leading-4 transition-colors duration-300 ${current ? "text-white" : done ? "text-white/60" : "text-white/30"}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
      <p className="border-t border-white/10 pt-3 font-mono text-[9.5px] leading-5 text-white/35">{hc.promptFoot}</p>
    </div>
  );
}

function FeatureCard({ label, title, copy, terminal }: { label: string; title: string; copy: string; terminal: React.ReactNode }) {
  return (
    <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .65, ease: [0.16, 1, 0.3, 1] }} className="group flex w-full flex-col overflow-hidden rounded-[16px] border border-white/15 bg-[#111413] transition-colors duration-300 hover:border-[#74FA6A]/45">
      <div className="relative flex min-h-[272px] items-center justify-center overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_30%_35%,rgba(116,250,106,.14),transparent_45%)] p-5">
        <div className="mx-auto flex min-h-[168px] w-full max-w-[408px] flex-col rounded-[14px] border-[6px] border-[#2B3539] bg-[#171918] p-4 font-mono text-[12px] leading-5 text-[#AAB3AE] shadow-[0_14px_36px_#0008]">
          <div className="mb-2.5 flex gap-1.5"><i className="size-2 rounded-full bg-[#FF5F56]" /><i className="size-2 rounded-full bg-[#FFBD2E]" /><i className="size-2 rounded-full bg-[#74FA6A]" /></div>
          <div className="flex flex-1 flex-col justify-center">{terminal}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5"><p className="font-mono text-[10px] tracking-[.18em] text-[#74FA6A]">{label}</p><h3 className="mt-2 text-[20px] font-medium tracking-[-.04em] text-[#E8F0E8]">{title}</h3><p className="mt-1.5 max-w-[44ch] text-[13px] leading-[1.5] text-[#8C97A5]">{copy}</p></div>
    </motion.article>
  );
}

function SolutionCard({ label, title, copy, points }: { label: string; title: string; copy: string; points: string[] }) {
  return (
    <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .65, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col rounded-[16px] border border-white/15 bg-[#111413] p-6 transition-colors duration-300 hover:border-[#74FA6A]/45">
      <p className="font-mono text-[10px] tracking-[.18em] text-[#74FA6A]">{label}</p>
      <h3 className="mt-3 text-[20px] font-medium tracking-[-.04em] text-[#E8F0E8]">{title}</h3>
      <p className="mt-2 text-[13px] leading-[1.6] text-[#8C97A5]">{copy}</p>
      <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-[12px] leading-5 text-[#A9B4C0]">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#74FA6A]/70" />{point}
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

// ===== RESTORED: preview device (Flappy Bird, iOS Fitness, Kripto Wallet) =====
function AndroidFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      {/* Outer shell — matte graphite, flat sides ala Pixel 9 */}
      <div
        className="relative flex h-full flex-col overflow-visible"
        style={{ width: "calc(100% - 4px)" }}
      >
        {/* Volume down + up — kiri */}
        <div className="absolute -left-[3.5px] top-[18%] h-[28px] w-[3px] rounded-l-full"
          style={{ background: "linear-gradient(to right, #1a1f24, #2c333b)" }} />
        <div className="absolute -left-[3.5px] top-[27%] h-[44px] w-[3px] rounded-l-full"
          style={{ background: "linear-gradient(to right, #1a1f24, #2c333b)" }} />
        <div className="absolute -left-[3.5px] top-[36%] h-[44px] w-[3px] rounded-l-full"
          style={{ background: "linear-gradient(to right, #1a1f24, #2c333b)" }} />
        {/* Power button — kanan */}
        <div className="absolute -right-[3.5px] top-[26%] h-[52px] w-[3px] rounded-r-full"
          style={{ background: "linear-gradient(to left, #1a1f24, #2c333b)" }} />

        {/* Main body */}
        <div
          className="relative flex h-full w-full flex-col overflow-hidden"
          style={{
            borderRadius: "36px",
            background: "linear-gradient(145deg, #22272e 0%, #161b21 60%, #1c2128 100%)",
            boxShadow: "0 24px 64px rgba(0,0,0,.75), inset 0 0 0 1px rgba(255,255,255,.07), inset 0 1px 0 rgba(255,255,255,.12)",
            border: "2.5px solid #2c333b",
          }}
        >
          {/* Top speaker grille */}
          <div className="relative flex shrink-0 flex-col items-center pt-2.5">
            <div className="flex items-center gap-[3px]">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className="h-[3px] w-[3px] rounded-full bg-white/20" />
              ))}
            </div>

            {/* Status bar */}
            <div className="mt-1.5 flex w-full items-center justify-between px-5">
              <span className="font-sans text-[8px] font-semibold text-white/90">9:41</span>
              {/* Punch-hole camera — center */}
              <span className="absolute left-1/2 -translate-x-1/2">
                <span className="flex size-[11px] items-center justify-center rounded-full bg-black ring-1 ring-white/10">
                  <span className="size-[5px] rounded-full bg-[#1a1a2e]" />
                </span>
              </span>
              {/* Status icons */}
              <span className="flex items-center gap-1 text-white/80">
                {/* Signal */}
                <svg width="11" height="8" viewBox="0 0 17 12" fill="currentColor">
                  <rect x="0" y="6" width="3" height="6" rx="1" />
                  <rect x="4.5" y="4" width="3" height="8" rx="1" />
                  <rect x="9" y="2" width="3" height="10" rx="1" />
                  <rect x="13.5" y="0" width="3" height="12" rx="1" opacity=".3" />
                </svg>
                {/* WiFi */}
                <svg width="10" height="8" viewBox="0 0 20 14" fill="currentColor">
                  <path d="M10 11a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0-4a5.5 5.5 0 014.5 2.4l-1.5 1.5A3.5 3.5 0 0010 9.5a3.5 3.5 0 00-3 1.4L5.5 9.4A5.5 5.5 0 0110 7zm0-4a9.5 9.5 0 017.8 4.1l-1.6 1.6A7.5 7.5 0 0010 5.5a7.5 7.5 0 00-6.2 3.2L2.2 7.1A9.5 9.5 0 0110 3z" opacity=".9" />
                </svg>
                {/* Battery */}
                <svg width="16" height="8" viewBox="0 0 25 12" fill="none">
                  <rect x="0.5" y="1" width="21" height="10" rx="3" stroke="currentColor" strokeWidth="1" />
                  <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
                  <rect x="2" y="2.5" width="15" height="7" rx="1.5" fill="currentColor" />
                </svg>
              </span>
            </div>
          </div>

          {/* Screen content */}
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {children}
          </div>

          {/* Bottom gesture bar */}
          <div className="flex shrink-0 items-center justify-center py-2">
            <div className="h-[4px] w-[90px] rounded-full bg-white/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({ variant, children }: { variant: "android" | "ios"; children: React.ReactNode }) {
  if (variant === "android") return <AndroidFrame>{children}</AndroidFrame>;
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative aspect-[9/19] h-full overflow-hidden rounded-[36px] border-[2.5px] border-[#2E343B] bg-black shadow-[0_20px_60px_rgba(0,0,0,.7),inset_0_0_0_1px_rgba(255,255,255,.08)]">
        {/* Dynamic Island */}
        <span className="absolute left-1/2 top-2 z-20 h-[18px] w-[88px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/[.06]" />
        {/* iOS status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1">
          <span className="text-[8px] font-semibold text-white">9:41</span>
          <span className="flex items-center gap-1 text-white">
            <svg width="11" height="8" viewBox="0 0 17 12" fill="currentColor">
              <rect x="0" y="4" width="3" height="8" rx="1" />
              <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" />
              <rect x="9" y="0.5" width="3" height="11.5" rx="1" />
              <rect x="13.5" y="0" width="3.5" height="12" rx="1" opacity=".3" />
            </svg>
            <svg width="16" height="8" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="1" width="21" height="10" rx="3" stroke="currentColor" strokeWidth="1" />
              <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
              <rect x="2" y="2.5" width="14" height="7" rx="1.5" fill="currentColor" />
            </svg>
          </span>
        </div>
        {children}
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div className="h-[4px] w-[100px] rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}

// Preview browser mini untuk sample web project — CSS murni, tanpa WebGL/Spline,
// jadi homepage tetap ringan. Klik preview -> halaman sample masing-masing.
// Chrome ditiru dari SafariFrame asli: traffic lights, URL pill, viewport gelap.
function BrowserPreviewFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="relative aspect-[16/11] h-full overflow-hidden rounded-xl border border-white/10 bg-[#16161C] shadow-[0_14px_34px_rgba(0,0,0,.5)] transition group-hover:border-white/20 group-hover:shadow-[0_18px_44px_rgba(0,0,0,.6)]">
      <div className="flex h-6 items-center gap-1.5 border-b border-white/[.06] bg-[#1F2023] px-2">
        <span className="size-[7px] rounded-full bg-[#FF5F57]" />
        <span className="size-[7px] rounded-full bg-[#FEBC2E]" />
        <span className="size-[7px] rounded-full bg-[#28C840]" />
        <span className="mx-auto flex min-w-0 max-w-[130px] flex-1 items-center justify-center gap-1 rounded-[4px] border border-white/[.08] bg-white/[.06] px-1.5 py-[2px]">
          <Lock size={6} className="shrink-0 text-white/35" />
          <span className="truncate font-mono text-[6.5px] text-white/60">{url}</span>
        </span>
      </div>
      <div className="relative h-[calc(100%-24px)] overflow-hidden bg-[#0D0D18]">{children}</div>
    </div>
  );
}

const GalaxyHeroPreview = memo(function GalaxyHeroPreview() {
  return (
    <BrowserPreviewFrame url="scratchagent.app">
      {/* Nebula statis tiruan scene Spline (radial gradient, tanpa animasi berat) */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(90% 70% at 30% 40%, rgba(120,80,220,.35), transparent 60%), radial-gradient(70% 60% at 75% 60%, rgba(60,180,160,.22), transparent 60%), radial-gradient(50% 45% at 60% 25%, rgba(116,250,106,.14), transparent 55%)" }} />
      {/* Bintang kecil statis */}
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(1px 1px at 18% 22%, rgba(255,255,255,.8), transparent), radial-gradient(1px 1px at 64% 18%, rgba(255,255,255,.6), transparent), radial-gradient(1.5px 1.5px at 82% 48%, rgba(255,255,255,.7), transparent), radial-gradient(1px 1px at 38% 68%, rgba(255,255,255,.5), transparent), radial-gradient(1px 1px at 52% 42%, rgba(255,255,255,.65), transparent)" }} />
      {/* Hero card tiruan */}
      <div className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/[.03] px-3 py-2.5 text-center backdrop-blur-[2px]">
        <div className="mx-auto h-1.5 w-[70%] rounded-full bg-white/70" />
        <div className="mx-auto mt-1 h-1.5 w-[45%] rounded-full bg-white/40" />
        <div className="mx-auto mt-2 h-3 w-12 rounded-[4px] border border-[#74FA6A]/50 bg-[#74FA6A]/10" />
      </div>
    </BrowserPreviewFrame>
  );
});

const VortexPreview = memo(function VortexPreview() {
  return (
    <BrowserPreviewFrame url="immersiavr.app">
      {/* Vortex tiruan: ring konsentris ungu-cyan, CSS animasi ringan (rotate pelan) */}
      <div className="nv-spin-slow absolute left-1/2 top-1/2 size-[240%] -translate-x-1/2 -translate-y-1/2" style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgba(128,38,166,.5) 80deg, transparent 160deg, rgba(5,178,230,.35) 240deg, transparent 320deg)", maskImage: "radial-gradient(circle, black 8%, transparent 62%)", WebkitMaskImage: "radial-gradient(circle, black 8%, transparent 62%)" }} />
      <div className="nv-spin-slower absolute left-1/2 top-1/2 size-[180%] -translate-x-1/2 -translate-y-1/2" style={{ background: "conic-gradient(from 120deg, transparent 0deg, rgba(128,38,166,.4) 100deg, transparent 200deg, rgba(5,178,230,.28) 290deg, transparent 360deg)", maskImage: "radial-gradient(circle, black 5%, transparent 55%)", WebkitMaskImage: "radial-gradient(circle, black 5%, transparent 55%)" }} />
      {/* Hero card tiruan */}
      <div className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/[.03] px-3 py-2.5 text-center backdrop-blur-[2px]">
        <div className="mx-auto h-1.5 w-[65%] rounded-full bg-white/70" />
        <div className="mx-auto mt-1 h-1.5 w-[40%] rounded-full bg-white/40" />
        <div className="mx-auto mt-2 h-3 w-12 rounded-[4px] border border-white/20" />
      </div>
    </BrowserPreviewFrame>
  );
});

const SaasPreview = memo(function SaasPreview() {
  return (
    <BrowserPreviewFrame url="template.app">
      {/* Glow lembut di belakang, tiruan glows.png */}
      <div className="absolute left-1/2 top-1/2 h-[120%] w-[80%] -translate-x-1/2 -translate-y-[38%] rounded-full opacity-40 blur-xl" style={{ background: "radial-gradient(closest-side, rgba(120,140,255,.35), rgba(255,255,255,.06) 60%, transparent)" }} />
      {/* Heading gradient tiruan */}
      <div className="absolute left-1/2 top-[18%] w-[70%] -translate-x-1/2 text-center">
        <div className="mx-auto h-1.5 w-[85%] rounded-full bg-gradient-to-b from-white to-white/60" />
        <div className="mx-auto mt-1 h-1.5 w-[60%] rounded-full bg-gradient-to-b from-white/80 to-white/40" />
        <div className="mx-auto mt-1.5 h-1 w-[55%] rounded-full bg-white/25" />
        {/* CTA putih tiruan variant gradient */}
        <div className="mx-auto mt-2.5 h-3.5 w-16 rounded-[5px] bg-gradient-to-b from-white to-white/60 shadow-[0_2px_10px_rgba(255,255,255,.25)]" />
      </div>
      {/* Dashboard preview tiruan: bar chart mini */}
      <div className="absolute bottom-[8%] left-1/2 h-[38%] w-[72%] -translate-x-1/2 overflow-hidden rounded-[6px] border border-white/10 bg-[#101014] shadow-lg">
        <div className="flex h-full items-end justify-around gap-1 px-2 pb-1.5 pt-2">
          <div className="w-[9%] rounded-t-[2px] bg-white/25" style={{ height: "45%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-white/40" style={{ height: "62%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-white/25" style={{ height: "38%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-white/60" style={{ height: "78%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-white/30" style={{ height: "52%" }} />
          <div className="w-[9%] rounded-t-[2px] bg-white/45" style={{ height: "68%" }} />
        </div>
      </div>
    </BrowserPreviewFrame>
  );
});

const DashboardPreview = memo(function DashboardPreview() {
  return (
    <BrowserPreviewFrame url="efferd.app/dashboard">
      {/* Sidebar mini */}
      <div className="absolute inset-y-0 left-0 w-[18%] border-r border-white/[.06] bg-[#0E0E11] p-1.5">
        <div className="size-2.5 rounded-[3px] bg-[#74FA6A]" />
        <div className="mt-2 space-y-1">
          <div className="h-1 w-full rounded-full bg-white/25" />
          <div className="h-1 w-[80%] rounded-full bg-white/12" />
          <div className="h-1 w-[90%] rounded-full bg-white/12" />
          <div className="h-1 w-[70%] rounded-full bg-white/12" />
        </div>
      </div>
      {/* Konten: stat cards + chart tiruan */}
      <div className="absolute inset-y-0 left-[18%] right-0 p-2">
        <div className="flex gap-1.5">
          <div className="flex-1 rounded-[4px] border border-white/[.07] bg-white/[.03] p-1">
            <div className="h-0.5 w-[70%] rounded-full bg-white/25" />
            <div className="mt-1 h-1 w-[50%] rounded-full bg-white/60" />
          </div>
          <div className="flex-1 rounded-[4px] border border-white/[.07] bg-white/[.03] p-1">
            <div className="h-0.5 w-[70%] rounded-full bg-white/25" />
            <div className="mt-1 h-1 w-[50%] rounded-full bg-white/60" />
          </div>
          <div className="flex-1 rounded-[4px] border border-white/[.07] bg-white/[.03] p-1">
            <div className="h-0.5 w-[70%] rounded-full bg-white/25" />
            <div className="mt-1 h-1 w-[50%] rounded-full bg-white/60" />
          </div>
        </div>
        <div className="mt-1.5 flex h-[calc(100%-38px)] gap-1.5">
          <div className="flex flex-1 items-end justify-around rounded-[4px] border border-white/[.07] bg-white/[.03] px-1 pb-1">
            <div className="w-[10%] rounded-t-[2px] bg-[#74FA6A]/50" style={{ height: "40%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-[#74FA6A]/65" style={{ height: "58%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-[#74FA6A]/45" style={{ height: "36%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-[#74FA6A]/80" style={{ height: "74%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-[#74FA6A]/55" style={{ height: "50%" }} />
            <div className="w-[10%] rounded-t-[2px] bg-[#74FA6A]" style={{ height: "88%" }} />
          </div>
          <div className="grid w-[30%] place-items-center rounded-[4px] border border-white/[.07] bg-white/[.03]">
            <div className="size-7 rounded-full" style={{ background: "conic-gradient(#74FA6A 0 42%, #4DDCF0 42% 70%, #B48CFF 70% 88%, #3A3A44 88% 100%)", maskImage: "radial-gradient(circle, transparent 42%, black 44%)", WebkitMaskImage: "radial-gradient(circle, transparent 42%, black 44%)" }} />
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
    <div ref={areaRef} className="relative h-full w-full overflow-hidden bg-[#4EC0CA]">
      {/* awan */}
      <motion.div className="absolute left-0 top-[16%] h-3 w-10 rounded-full bg-white/70 blur-[1px]" animate={{ x: ["110%", "-30%"] }} transition={{ repeat: Infinity, duration: 9, ease: "linear" }} />
      <motion.div className="absolute left-0 top-[34%] h-2.5 w-8 rounded-full bg-white/50 blur-[1px]" animate={{ x: ["120%", "-25%"] }} transition={{ repeat: Infinity, duration: 13, delay: 2, ease: "linear" }} />

      {/* pipa ΓÇö posisi digerakin game loop */}
      {[0, 1, 2].map((i) => (
        <div key={i} ref={(el) => { pipeRefs.current[i] = el; }} className="absolute inset-y-0 left-0 w-[16%] will-change-transform">
          <div className="absolute inset-x-0 top-0 rounded-b-[3px] border border-[#2E7D32]/50 bg-[#61BB46]">
            <span className="absolute inset-x-0 bottom-0 h-2 rounded-[2px] border border-[#2E7D32]/50 bg-[#74C65B]" />
          </div>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] border border-[#2E7D32]/50 bg-[#61BB46]">
            <span className="absolute inset-x-0 top-0 h-2 rounded-[2px] border border-[#2E7D32]/50 bg-[#74C65B]" />
          </div>
        </div>
      ))}

      {/* burung ΓÇö posisi & rotasi digerakin game loop */}
      <div ref={birdRef} className="absolute left-0 top-0 z-10 will-change-transform">
        <div className="relative size-[18px] rounded-full bg-[#F8C034] shadow-[0_2px_4px_rgba(0,0,0,.25)]">
          <motion.span className="absolute left-[2px] top-[6px] size-[8px] rounded-full bg-[#FDE9B8]" animate={{ scaleY: [1, 0.55, 1] }} transition={{ repeat: Infinity, duration: 0.32, ease: "easeInOut" }} style={{ transformOrigin: "right center" }} />
          <span className="absolute right-[3px] top-[3px] size-[6px] rounded-full bg-white"><span className="absolute right-[1px] top-[1.5px] size-[3px] rounded-full bg-[#1A1A1A]" /></span>
          <span className="absolute -right-[5px] top-[7px] h-[6px] w-[8px] rounded-[2px] bg-[#F26D3D]" />
        </div>
      </div>

      {/* skor */}
      <span ref={scoreRef} className="absolute inset-x-0 top-[7%] z-10 text-center font-mono text-[22px] font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,.35)]">0</span>

      {/* tanah scroll */}
      <motion.div className="absolute bottom-0 left-0 z-[5] h-[13%] w-[200%]" animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}>
        <div className="h-[35%] w-full bg-[#8ED16B]" />
        <div className="h-[65%] w-full bg-[#D7C48A]" />
      </motion.div>
    </div>
  );
});

// ===== iOS Fitness (Apple-style glass) ΓÇö multi-screen preview =====
// Design tokens ala Apple Fitness+: ring Move/Exercise/Stand + aksen lime.
const AF = {
  move: "#FA2D5A",
  moveTrack: "#3A0010",
  ex: "#A8FF00",
  exTrack: "#1A3300",
  stand: "#00CFFF",
  standTrack: "#00202B",
  muted: "#8E8E93",
  card: "#1C1C1E",
};

// 3 activity ring konsentris (Move/Exercise/Stand), ngisi dari 0 tiap layar muncul.
function AppleRings({ size = 58, delay = 0.3 }: { size?: number; delay?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 110 110" className="size-full -rotate-90">
        <circle cx="55" cy="55" r="48" fill="none" stroke={AF.moveTrack} strokeWidth="10" />
        <motion.circle cx="55" cy="55" r="48" fill="none" stroke={AF.move} strokeWidth="10" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 0.42 }} transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay }} style={{ filter: "drop-shadow(0 0 3px rgba(250,45,90,0.45))" }} />
        <circle cx="55" cy="55" r="36" fill="none" stroke={AF.exTrack} strokeWidth="10" />
        <motion.circle cx="55" cy="55" r="36" fill="none" stroke={AF.ex} strokeWidth="10" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: delay + 0.1 }} style={{ filter: "drop-shadow(0 0 3px rgba(168,255,0,0.4))" }} />
        <circle cx="55" cy="55" r="24" fill="none" stroke={AF.standTrack} strokeWidth="10" />
        <motion.circle cx="55" cy="55" r="24" fill="none" stroke={AF.stand} strokeWidth="10" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 0.25 }} transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: delay + 0.2 }} style={{ filter: "drop-shadow(0 0 3px rgba(0,207,255,0.4))" }} />
      </svg>
    </div>
  );
}

// Ikon workout sesuai jenis (hike/walk & cycle = lime, breathe = cyan).
function WorkoutIcon({ kind }: { kind: "hike" | "cycle" | "breathe" }) {
  if (kind === "cycle") return <Bike size={13} style={{ color: AF.ex }} />;
  if (kind === "breathe") return <Wind size={13} style={{ color: AF.stand }} />;
  return <Footprints size={13} style={{ color: AF.ex }} />;
}

// Satu baris item workout (ikon dalem lingkaran hitam + nama + value + tanggal).
function WorkoutRow({ kind, name, val, date, delay = 0 }: { kind: "hike" | "cycle" | "breathe"; name: string; val: string; date: string; delay?: number }) {
  const cyan = kind === "breathe";
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay }} className="mx-3 mt-1.5 flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-2.5 py-1.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-black"><WorkoutIcon kind={kind} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[7px] font-medium text-white">{name}</p>
        <p className="text-[9.5px] font-bold tracking-tight" style={{ color: cyan ? AF.stand : AF.ex }}>{val}</p>
      </div>
      <p className="shrink-0 text-[6px] text-[#8E8E93]">{date}</p>
    </motion.div>
  );
}

function AppleSummary() {
  const stats = [
    { l: "Move", v: "209", g: "/500 CAL", c: AF.move },
    { l: "Exercise", v: "32", g: "/30 MIN", c: AF.ex },
    { l: "Stand", v: "3", g: "/12 HRS", c: AF.stand },
  ];
  return (
    <div className="flex h-full flex-col">
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }} className="px-3 pt-1.5 text-[13px] font-bold text-white">Summary</motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }} className="mx-3 mt-1.5 flex items-center justify-between rounded-xl bg-[#1C1C1E] px-2.5 py-2">
        <div className="flex-1 space-y-[3px]">
          {stats.map((s) => (
            <div key={s.l} className="flex items-baseline gap-1">
              <span className="w-[34px] text-[6.5px] font-semibold text-white">{s.l}</span>
              <span className="text-[6.5px] font-semibold text-[#8E8E93]"><span style={{ color: s.c }}>{s.v}</span>{s.g}</span>
            </div>
          ))}
          <div className="flex gap-2.5 pt-[3px]">
            <div><p className="text-[6px] text-white">Steps</p><p className="text-[7px] font-semibold text-[#8E8E93]">4,355</p></div>
            <div><p className="text-[6px] text-white">Distance</p><p className="text-[7px] font-semibold text-[#8E8E93]">2.26 MI</p></div>
          </div>
        </div>
        <AppleRings size={56} delay={0.35} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="mt-2 flex items-center justify-between px-3">
        <p className="text-[9.5px] font-bold text-white">History</p>
        <p className="text-[7px] text-[#A8FF00]">Show More</p>
      </motion.div>
      <WorkoutRow kind="hike" name="Hiking" val="1.70 MI" date="Today" delay={0.2} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="mt-2 px-3"><p className="text-[9.5px] font-bold text-white">Trainer Tips</p></motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }} className="mx-3 mt-1.5 flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-2.5 py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#333]"><User size={13} className="text-[#9a9a9e]" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[6.5px] font-semibold leading-tight text-white">Set up your feet for warrior 1 in yoga</p>
          <p className="text-[5.5px] text-[#8E8E93]">with Fitness+ Trainer Jonelle</p>
          <p className="text-[6px] font-medium text-[#A8FF00]">Watch this Week's Tip</p>
        </div>
      </motion.div>
    </div>
  );
}

function AppleHistory({ month, items, showFilter = false }: { month: string; items: { kind: "hike" | "cycle" | "breathe"; name: string; val: string; date: string }[]; showFilter?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex items-center gap-0.5 px-3 pt-1.5 text-[#A8FF00]">
        <ChevronLeft size={10} strokeWidth={2.5} />
        <span className="text-[7.5px]">Summary</span>
      </motion.div>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="px-3 pt-0.5 text-[15px] font-bold tracking-tight text-white">History</motion.p>
      {showFilter && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-1 flex gap-1 px-3">
          <span className="rounded-full bg-[#A8FF00] px-2 py-[2px] text-[6px] font-semibold text-black">All</span>
          <span className="rounded-full bg-[#2C2C2E] px-2 py-[2px] text-[6px] font-semibold text-[#A0A0A5]">Workouts</span>
          <span className="rounded-full bg-[#2C2C2E] px-2 py-[2px] text-[6px] font-semibold text-[#A0A0A5]">Mindfulness</span>
        </motion.div>
      )}
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="px-3 pt-1.5 text-[9.5px] font-bold text-white">{month}</motion.p>
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
  return (
    <div className="flex items-center justify-between px-3.5 pt-2">
      <span className="text-[7.5px] font-semibold text-white">2:34</span>
      <span className="flex items-center gap-1 text-white">
        <svg width="10" height="7" viewBox="0 0 17 12" fill="currentColor"><rect x="0" y="4" width="3" height="8" rx="1" /><rect x="4.5" y="2.5" width="3" height="9.5" rx="1" /><rect x="9" y="0.5" width="3" height="11.5" rx="1" /><rect x="13.5" y="0" width="3.5" height="12" rx="1" opacity=".35" /></svg>
        <svg width="14" height="7" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="1" width="21" height="10" rx="3" stroke="currentColor" strokeWidth="1" /><rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" /><rect x="2" y="2.5" width="13" height="7" rx="1.5" fill="currentColor" /></svg>
      </span>
    </div>
  );
}

// Tab bar iOS glass (Summary aktif), persist di bawah, gak ikut transisi layar.
function AppleTabBar() {
  return (
    <div className="relative border-t border-white/[0.12] bg-black/50 px-5 pt-1.5 backdrop-blur-xl">
      <div className="flex items-start justify-around">
        <div className="flex flex-col items-center gap-[2px]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#A8FF00" strokeWidth="2.2" /><circle cx="12" cy="12" r="6" stroke="#A8FF00" strokeWidth="2.2" /><circle cx="12" cy="12" r="2.2" fill="#A8FF00" /></svg>
          <span className="text-[5px] font-medium text-[#A8FF00]">Summary</span>
        </div>
        <div className="flex flex-col items-center gap-[2px] opacity-45">
          <User size={13} className="text-white" />
          <span className="text-[5px] font-medium text-white">Fitness+</span>
        </div>
        <div className="flex flex-col items-center gap-[2px] opacity-45">
          <Users size={13} className="text-white" />
          <span className="text-[5px] font-medium text-white">Sharing</span>
        </div>
      </div>
      <div className="mx-auto mb-1 mt-1 h-[3px] w-14 rounded-full bg-white/30" />
    </div>
  );
}

// Preview fitness iOS (Apple-style glass) ΓÇö 3 layar cycle dgn transisi slide, ring
// aktivitas ngisi, item stagger. Cuma mount saat hover; di-memo biar terisolasi.
const IosFitnessPreview = memo(function IosFitnessPreview() {
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
  green: "#4CAF50",
  eth: "#627EEA",
  ethDeep: "#3B5CE4",
  red: "#E53935",
  ink: "#111111",
  muted: "#888888",
  faint: "#999999",
  surface: "#F5F5F5",
};

// Ikon ETH kecil (gradient biru-benar, huruf Xi sebagai glyph).
function EthCoin({ size = 14, fontSize = 8 }: { size?: number; fontSize?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-bold text-white" style={{ width: size, height: size, fontSize, background: `linear-gradient(135deg, ${KRIPTO.eth}, ${KRIPTO.ethDeep})` }}>╬₧</span>
  );
}

// Chart harga: garis hijau ke-draw + fill gradient fade-in + dot pulse.
function KriptoChart({ delay = 0.3 }: { delay?: number }) {
  return (
    <div className="relative mt-1 h-[52px] w-full">
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
  return (
    <div className="flex h-full flex-col bg-white px-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }} className="flex items-center justify-between pt-1.5">
        <ChevronLeft size={12} className="text-[#111]" />
        <div className="flex items-center gap-1"><EthCoin size={15} fontSize={8} /><span className="text-[8px] font-semibold text-[#111]">Ethereum</span></div>
        <div className="flex items-center gap-1.5"><Star size={9} className="text-[#111]" /><MoreHorizontal size={10} className="text-[#111]" /></div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }} className="pt-1">
        <p className="text-[14px] font-extrabold tracking-tight text-[#111]">Rp 41.285.600</p>
        <div className="flex items-center gap-1.5"><span className="text-[5.5px] text-[#888]">pada 21 Jan, 11:42</span><span className="text-[5.5px] font-semibold text-[#E53935]">Γû╝ 3,04%</span></div>
      </motion.div>

      <KriptoChart delay={0.3} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.4 }} className="flex justify-around pt-1">
        {["1J", "1H", "1M", "1B", "1T"].map((t) => (
          <span key={t} className={`rounded-full px-1.5 py-[2px] text-[5.5px] font-medium ${t === "1M" ? "bg-[#4CAF50] font-semibold text-white" : "text-[#999]"}`}>{t}</span>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45, ease: [0.2, 0.8, 0.2, 1] }} className="flex gap-1.5 pt-1.5">
        <div className="flex-1 rounded-lg bg-[#F5F5F5] px-2 py-1.5">
          <p className="text-[5px] font-medium text-[#999]">Saldo</p>
          <div className="mt-0.5 flex items-center gap-1"><EthCoin size={11} fontSize={6} /><span className="text-[6.5px] font-bold text-[#111]">0,006714</span></div>
        </div>
        <div className="flex-1 rounded-lg bg-[#F5F5F5] px-2 py-1.5">
          <p className="text-[5px] font-medium text-[#999]">Nilai</p>
          <span className="mt-0.5 block text-[6.5px] font-bold text-[#111]">Rp 277.800</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5, ease: [0.2, 0.8, 0.2, 1] }} className="pt-1.5">
        <p className="text-[7px] font-bold text-[#111]">Deskripsi</p>
        <p className="mt-0.5 text-[5.5px] leading-snug text-[#888]">Ethereum adalah platform global untuk aplikasi terdesentralisasi, bertujuan menghilangkan kebutuhan akan otoritas pusat. <span className="font-medium text-[#4CAF50]">Baca Selengkapnya</span></p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.55, ease: [0.2, 0.8, 0.2, 1] }} className="mt-auto flex gap-1.5 pb-2 pt-2">
        <span className="flex-1 rounded-full bg-[#111] py-1.5 text-center text-[7px] font-semibold text-white">Tukar</span>
        <span className="flex-1 rounded-full bg-[#4CAF50] py-1.5 text-center text-[7px] font-semibold text-white">Kirim</span>
      </motion.div>
    </div>
  );
}

function KriptoContact({ icon, name, sub, bg, delay = 0 }: { icon: React.ReactNode; name: string; sub: string; bg: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: [0.2, 0.8, 0.2, 1] }} className="mt-1 flex items-center gap-1.5 rounded-lg bg-[#F5F5F5] px-2 py-1.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-md" style={{ background: bg }}>{icon}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-[6.5px] font-semibold text-[#111]">{name}</p><p className="text-[5px] text-[#999]">{sub}</p></div>
    </motion.div>
  );
}

function KriptoSendSelect() {
  return (
    <div className="flex h-full flex-col bg-white px-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between border-b border-[#F0F0F0] pb-1.5 pt-1.5">
        <p className="text-[10px] font-bold text-[#111]">Kirim</p>
        <X size={10} className="text-[#555]" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="mt-1.5 flex items-center rounded-lg bg-[#F5F5F5] px-2 py-1.5">
        <span className="text-[6px] font-medium text-[#AAA]">Ke</span>
        <span className="ml-1 flex-1 text-[6px] text-[#BBB]">ENS atau Alamat</span>
        <span className="rounded-md bg-[#111] px-1.5 py-[2px] text-[5.5px] font-semibold text-white">Tempel</span>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-[#F5F5F5] px-2 py-1.5">
        <QrCode size={12} className="text-[#555]" />
        <div><p className="text-[6.5px] font-semibold text-[#111]">Pindai Kode QR</p><p className="text-[5px] text-[#999]">Ketuk untuk memindai alamat</p></div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.15 }} className="flex items-center gap-1 pt-1.5"><Clock size={7} className="text-[#888]" /><span className="text-[6px] font-semibold text-[#888]">Terbaru</span></motion.div>
      <KriptoContact icon={<Star size={11} className="text-[#C9A227]" />} name="Stash" sub="1 Transaksi Sebelumnya" bg="#E8E8E8" delay={0.2} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.25 }} className="flex items-center gap-1 pt-1.5"><Sparkles size={7} className="text-[#888]" /><span className="text-[6px] font-semibold text-[#888]">Disarankan</span></motion.div>
      <KriptoContact icon={<CreditCard size={11} className="text-[#627EEA]" />} name="0xb249....9768" sub="1 Transaksi Sebelumnya" bg="#E8EEFF" delay={0.3} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.35 }} className="flex items-center gap-1 pt-1.5"><User size={7} className="text-[#888]" /><span className="text-[6px] font-semibold text-[#888]">Buku Alamat</span></motion.div>
      <KriptoContact icon={<CreditCard size={11} className="text-[#888]" />} name="vitalik.eth" sub="Tidak Ada Transaksi Sebelumnya" bg="#F0F0F0" delay={0.4} />
    </div>
  );
}

function KriptoSendAmount() {
  return (
    <div className="flex h-full flex-col bg-white px-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between border-b border-[#F0F0F0] pb-1.5 pt-1.5">
        <p className="text-[10px] font-bold text-[#111]">Kirim</p>
        <X size={10} className="text-[#555]" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="mt-1.5 flex items-center rounded-lg bg-[#F5F5F5] px-2 py-1.5">
        <span className="text-[6px] font-medium text-[#AAA]">Ke</span>
        <span className="ml-1 text-[6px] font-medium text-[#111]">0xb249....9768</span>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, delay: 0.1 }} className="pt-2 text-center">
        <p className="text-[16px] font-extrabold tracking-tight text-[#111]">Rp 41.285.600</p>
        <div className="mt-0.5 flex items-center justify-center gap-1"><EthCoin size={12} fontSize={7} /><span className="text-[6px] font-medium text-[#888]">0,00001902</span><ArrowUpDown size={7} className="text-[#555]" /></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-[#F5F5F5] px-2 py-1.5">
        <EthCoin size={20} fontSize={11} />
        <div className="flex-1"><p className="text-[6.5px] font-semibold text-[#111]">Ethereum</p><p className="text-[5px] text-[#999]">0,006714</p></div>
        <span className="rounded-md border border-[#DDD] px-1.5 py-[2px] text-[5.5px] font-semibold text-[#555]">Maks</span>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="grid grid-cols-3 gap-1 pt-1.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((k) => (
          <span key={k} className={`rounded-md py-1 text-center text-[8px] font-semibold ${k === "." ? "bg-[#F0F0F0] text-[#555]" : "bg-[#F5F5F5] text-[#111]"}`}>{k}</span>
        ))}
        <span className="grid place-items-center rounded-md bg-[#F0F0F0] py-1"><Delete size={9} className="text-[#555]" /></span>
      </motion.div>
      <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="mt-1.5 rounded-full bg-[#4CAF50] py-1.5 text-center text-[7px] font-bold text-white">Lanjutkan</motion.span>
    </div>
  );
}

const KriptoPreview = memo(function KriptoPreview() {
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setScreen((s) => (s + 1) % 3), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 pt-2">
        <span className="text-[8px] font-semibold text-[#111]">9:41</span>
        <span className="flex items-center gap-1 text-[#111]">
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

