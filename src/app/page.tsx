"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useScroll } from "motion/react";
import { ArrowUpRight, Play, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DottedDemo from "@/components/ui/dotted-demo";
import { ImageAutoSlider } from "@/components/ui/image-auto-slider";
import { getCurrentUser, refreshCurrentUser } from "@/lib/current-user";

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

  return <section className="relative mx-auto mt-24 w-full overflow-hidden py-5 md:mt-32 md:py-8" aria-label="Scratch Agent stack">
    <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#0A0A0A] to-transparent md:w-48" />
    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#0A0A0A] to-transparent md:w-48" />
    <div className="stack-row"><div className="stack-track stack-track-right">{[0, 1].map((copy) => <div key={copy} className="stack-group">{repeated(stackRows[0]).map((item, i) => <span key={`${item.name}-${i}`} className="stack-brand"><img src={`https://cdn.simpleicons.org/${item.slug}/B7C8B9`} alt="" />{item.name}</span>)}</div>)}</div></div>
    <div className="stack-row mt-5"><div className="stack-track stack-track-left">{[0, 1].map((copy) => <div key={copy} className="stack-group">{repeated(stackRows[1]).map((item, i) => <span key={`${item.name}-${i}`} className="stack-brand"><img src={`https://cdn.simpleicons.org/${item.slug}/B7C8B9`} alt="" />{item.name}</span>)}</div>)}</div></div>
  </section>;
}

function Navbar() {
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
          <div className="hidden items-center gap-9 md:flex"><a href="#platform" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">Product</a><a href="#platform" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">Solutions</a><a href="#workflow" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">Resources</a><a href="#agents" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">Customers</a><Link href="/new" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">Pricing</Link><a href="#agents" className="font-mono text-[12px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">Docs</a></div>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          {loggedIn ? (
            <Link href="/profile" className="font-mono text-[12px] tracking-[0.02em] text-white/80 transition-colors hover:text-[#74FA6A]">Profile</Link>
          ) : (
            <Link href="/login" className="font-mono text-[12px] tracking-[0.02em] text-white/80 transition-colors hover:text-[#74FA6A]">Login</Link>
          )}
          <Link href={loggedIn ? "/new" : "/login"} className="grid size-8 place-items-center rounded-full bg-[#74FA6A] text-black transition hover:scale-105 hover:bg-[#A8FF9B]" aria-label="Mulai sekarang"><ArrowUpRight size={16} /></Link>
        </div>
        <button className="grid size-8 place-items-center text-white md:hidden" onClick={() => setMobileNav((v) => !v)} aria-label="Navigasi"><span className="relative block h-3.5 w-5"><span className={`absolute left-0 top-0 block h-px w-full bg-white transition-all duration-300 ${mobileNav ? "translate-y-[7px] rotate-45" : ""}`} /><span className={`absolute left-0 top-[7px] block h-px w-full bg-white transition-opacity duration-200 ${mobileNav ? "opacity-0" : "opacity-100"}`} /><span className={`absolute left-0 top-[14px] block h-px w-full bg-white transition-all duration-300 ${mobileNav ? "translate-y-[-7px] -rotate-45" : ""}`} /></span></button>
      </motion.nav>
      <motion.div className="fixed inset-0 z-[60] flex flex-col bg-[#0A0A0A] md:hidden" initial={false} animate={mobileNav ? { opacity: 1, pointerEvents: "auto" } : { opacity: 0, pointerEvents: "none" }} transition={{ duration: .35, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex h-[64px] items-center justify-between px-5"><span className="flex items-center gap-2 text-[18px] font-semibold tracking-[-.04em] text-[#E8F0E8]"><span className="size-6 skew-x-[-28deg] bg-[#74FA6A]" />Scratch Agent</span><button className="grid size-8 place-items-center text-white" onClick={() => setMobileNav(false)} aria-label="Tutup"><X size={18} /></button></div>
        <div className="flex flex-1 flex-col justify-between px-5 py-12"><div className="space-y-1">{[{ href: "#platform", label: "platform" }, { href: "#workflow", label: "cara kerja" }, { href: "#agents", label: "agent api" }, { href: "/project/demo", label: "contoh plan" }].map((link, i) => (<motion.a key={link.href} href={link.href} onClick={() => setMobileNav(false)} className="block py-4 font-mono text-[14px] tracking-[0.08em] text-white/70 transition-colors hover:text-[#74FA6A]" initial={{ opacity: 0, y: 16 }} animate={mobileNav ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ delay: 0.08 + i * 0.05, duration: .4, ease: [0.16, 1, 0.3, 1] }}>{link.label}</motion.a>))}</div><motion.div initial={{ opacity: 0, y: 16 }} animate={mobileNav ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ delay: 0.32, duration: .4, ease: [0.16, 1, 0.3, 1] }}><Link href={loggedIn ? "/new" : "/login"} onClick={() => setMobileNav(false)} className="flex w-full items-center justify-center rounded-full border border-[#74FA6A] px-6 py-3.5 font-mono text-[13px] tracking-[0.06em] text-[#74FA6A] transition-colors hover:bg-[#74FA6A] hover:text-black">mulai gratis</Link><p className="mt-6 font-mono text-[11px] tracking-[.08em] text-white/30">{loggedIn ? <Link href="/profile" className="hover:text-[#74FA6A]">profile</Link> : "login segera"}</p></motion.div></div>
      </motion.div>
    </>
  );
}

export default function Home() {
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
      <a href="#agents" className="relative z-30 mb-3 flex min-h-8 items-center justify-center gap-2 bg-[#74FA6A] px-4 py-1.5 text-center text-[11px] font-medium leading-4 text-black transition-colors hover:bg-[#9AFF82] md:mb-4 md:text-[12px]">Scratch Agent is free to use. Enjoying it? Support the project <span className="underline underline-offset-2">Donate</span><span aria-hidden="true">→</span></a>
      <Navbar />

       <section className="relative mx-auto max-w-[980px] px-5 pb-14 pt-10 md:px-10 md:pb-18 md:pt-12">
         <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center text-center">
           <h1 className="max-w-[16ch] text-balance text-[clamp(2.8rem,5.8vw,5rem)] font-medium leading-[.96] tracking-[-.065em] text-[#E8F8E5]"><span className="text-[#74FA6A]">Rencana yang jelas.</span><br />Agent yang terus bergerak.</h1>
           <p className="mt-5 max-w-[54ch] text-balance text-[15px] leading-[1.6] text-[#A9C5A7]">Ubah brief menjadi task terurut, konteks siap pakai, dan langkah berikutnya yang bisa langsung dikerjakan agent.</p>
           <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
               <Magnetic><Link href={loggedIn ? "/new" : "/login"} className="rv2-button min-w-[146px] bg-[#74FA6A] text-black hover:bg-[#A8FF9B] group">Mulai <span className="grid size-6 place-items-center rounded-full bg-black/10 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"><ArrowUpRight size={12} /></span></Link></Magnetic>
             <Link href="/project/demo" className="rv2-button light min-w-[146px]"><Play size={13} fill="currentColor" /> Lihat demo</Link>
           </div>
        </motion.div>
      </section>

       <StackMarquee />
       <motion.section initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .7, ease: [0.16, 1, 0.3, 1] }} className="relative mx-auto mt-24 w-[min(1220px,calc(100%-32px))] overflow-hidden rounded-[26px] border border-white/10 bg-[#0E0E0E] p-2 shadow-[0_28px_90px_#000C] md:mt-32 md:p-3">
         <div className="rounded-[18px] border border-white/10 bg-[#151A21]">
           <div className="flex h-11 items-center justify-between border-b border-white/10 px-4 font-mono text-[10px] text-white/40"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#FF5F56]" /><i className="size-2.5 rounded-full bg-[#FFBD2E]" /><i className="size-2.5 rounded-full bg-[#74FA6A]" /></span><span className="tracking-[.08em]">scratch-agent / mission-control</span><span className="inline-flex items-center gap-1.5 text-emerald-300/80"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> live • 5s</span></div>
           <div className="grid min-h-[420px] md:grid-cols-[176px_1fr_296px]">
             <aside className="hidden border-r border-white/10 p-4 md:block"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-white/30">plan</p>{["Struktur", "PRD", "Task", "Checkpoint"].map((item, index) => (<div key={item} className={`mt-2 flex items-center gap-2 rounded-[10px] px-2.5 py-2 font-mono text-[11px] ${index === 0 ? "bg-[#74FA6A]/10 text-[#74FA6A] border border-[#74FA6A]/20" : "text-white/44"}`}><span className="size-1.5 rounded-full bg-current" />{item}</div>))}</aside>
             <div className="relative overflow-x-auto p-5 md:p-6"><div className="absolute inset-0 opacity-[.14] [background-image:radial-gradient(#9AA5B366_1px,transparent_1px)] [background-size:18px_18px]" /><div className="relative flex min-w-[640px] items-center gap-10 py-16"><BentoMock ok title="PROJECT" name="Kedai Senja" meta="0 / 28 task" /><Connector /><div className="space-y-5"><BentoMock eyebrow="PHASE 1" name="Pemesanan" meta="8 task" pulse /><BentoMock eyebrow="PHASE 2" name="Operasional" meta="12 task" /><BentoMock eyebrow="PHASE 3" name="Laporan" meta="8 task" /></div><Connector /><div className="space-y-5"><BentoMock title="SUB-FITUR" list={["Katalog menu", "Keranjang", "Checkout"]} /><BentoMock title="TASK" list={["Buat halaman katalog", "Tambah stub", "Integrasi API"]} typing /></div></div></div>
             <aside className="hidden border-l border-white/10 bg-[#0E1115] p-5 lg:block"><Eyebrow>agent aktif</Eyebrow><h3 className="mt-3 text-[15px] font-semibold tracking-[-.02em] text-white">F01-S01-T02</h3><p className="mt-2 text-xs leading-5 text-white/48">Tambah pencarian + filter menu.</p><div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-[10px] leading-6 text-white/50"><span className="text-[#74FA6A]">$</span> scratch task next<br /><span className="text-emerald-300">✓</span> dep ready<br /><span className="text-white">›</span> checkpoint: false</div><div className="mt-5 flex items-center gap-2 font-mono text-[10px] text-white/30"><Zap size={11} className="text-white/40" /> polling 5s</div></aside>
           </div>
         </div>
       </motion.section>

      <section id="platform" className="mx-auto max-w-[1360px] px-5 pb-24 pt-24 md:px-10 md:pb-32 md:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-6"><div><Eyebrow>the planning cloud for agents</Eyebrow><h2 className="mt-5 max-w-[18ch] text-balance text-[clamp(2.35rem,4.2vw,3.75rem)] font-medium leading-[.98] tracking-[-.055em] text-[#F0F3F5]">Konteks penuh untuk agent dalam satu alur.</h2></div></div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <FeatureCard label="PRD ENGINE" title="Brief → graph terurut." copy="Asumsi diperkaya. Feature, sub-feature, task, deps." terminal={<AnimatedTerminalPRD />} />
          <FeatureCard label="AGENT-NATIVE RUNTIME" title="Built untuk eksekusi fokus." copy="Satu task aktif. Status, layer, checkpoint terbaca." terminal={<AnimatedTerminalRuntime />} />
          <FeatureCard label="TASK GRAPH" title="Ordering deterministik." copy="Frontend, backend, QA. Server menentukan urutan." terminal={<AnimatedTerminalQueue />} />
          <FeatureCard label="LIVE PROGRESS" title="Lihat agent bergerak." copy="Polling lima detik. Telemetry tetap terlihat." terminal={<><div className="flex items-center justify-between"><span>LIVE TELEMETRY</span><span className="text-[#74FA6A]">5s poll</span></div><div className="relative mt-6 h-[96px] overflow-hidden rounded border border-white/10 bg-[#111312] p-3"><motion.svg viewBox="0 0 330 100" preserveAspectRatio="none" className="h-full w-full"><motion.polyline points="0,70 28,35 55,72 88,65 118,82 148,45 175,58 208,29 235,66 260,51 290,76 315,42 330,48" fill="none" stroke="#74FA6A" strokeWidth="2" strokeLinecap="round" animate={{ pathLength: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }} /></motion.svg></div><p className="mt-3 text-[10px] text-white/35">active · 03 &nbsp; done today · 08 &nbsp; checkpoint false</p></>} />
        </div>
      </section>



      <section id="workflow-replacement" className="relative w-full border-y border-[#1E252F] bg-[#0A0A0A]">
        <ImageAutoSlider />
      </section>

      <section id="agents" className="mx-auto w-[calc(100%-32px)] max-w-[1280px] mb-8 mt-8 overflow-hidden rounded-[24px] border border-white/10 bg-[#111318] px-5 py-16 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-2"><div><Eyebrow>agent-native cli</Eyebrow><h2 className="mt-4 text-[clamp(2.1rem,4.8vw,3.8rem)] font-semibold leading-[.95] tracking-[-.06em] text-white">Sewa agent.<br />Kirim misinya.</h2><p className="mt-5 max-w-[44ch] text-sm leading-6 text-[#8C97A5]">Satu prompt hubungkan agent ke plan. Server tentukan urutan, dependensi, retry, checkpoint. Agent tulis kode.</p><Magnetic className="mt-8 inline-block"><a href="https://paypal.me/notdeadlysins" target="_blank" rel="noopener noreferrer" className="btn-donate inline-flex items-center gap-2.5"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7.174 2.037c-.46-.03-.94-.04-1.44-.04H2.53a.97.97 0 0 0-.96.83L.04 17.98a.97.97 0 0 0 .96 1.08h3.12l1.02-6.45-.02.13a.97.97 0 0 1 .96-.83h1.38c3.33 0 5.94-1.35 6.7-5.26.32-1.64.15-3.01-.52-4.08a4.03 4.03 0 0 0-2.05-1.53 7.9 7.9 0 0 0-2.07-.36 6.08 6.08 0 0 0-1.36.04zM9.81 6.82a3.5 3.5 0 0 1 .44-.02c1.14 0 1.82.25 2.23.76.41.5.52 1.28.28 2.44-.61 3.13-2.48 3.13-4.54 3.13H7.02l.76-4.82c.07-.46.46-.8.92-.83.35-.02.71-.04 1.11-.04.37 0 .7.01 1 .02z" /></svg> Donate — PayPal @notdeadlysins</a></Magnetic></div><DoubleBezel className="overflow-hidden !p-1.5"><div className="rounded-[calc(24px-10px)] bg-[#0A0A0A] p-5 font-mono text-[12px] leading-7 text-[#C5CDD7]"><div className="mb-3 flex gap-1.5"><i className="size-2.5 rounded-full bg-[#FF5F56]" /><i className="size-2.5 rounded-full bg-[#FFBD2E]" /><i className="size-2.5 rounded-full bg-[#74FA6A]" /></div><CLITerminal /></div></DoubleBezel></div>
      </section>

      <footer className="px-5 py-10 md:px-10"><div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-8 border-t border-white/10 pt-8 md:flex-row"><div><div className="font-semibold text-[13px] tracking-[-.02em] text-white">Scratch Agent</div><p className="mt-2 font-mono text-[11px] text-[#5B6676]">Hire your AI agent.</p></div><div className="flex flex-wrap gap-6 font-mono text-[11px] text-[#6C7787]"><Link href="/new">buat plan</Link><Link href="/project/demo">demo</Link><Link href="/settings">settings</Link><span>© 2026 Scratch Agent</span></div></div></footer>
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
  return (
    <div className="space-y-1">
      <p><span className="text-[#74FA6A]">$</span> <TypingText text="scratch plan parse" speed={38} loop /></p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9 }} className="space-y-[4px] pt-3">
        <p className="text-white/50">brief: &quot;booking studio musik&quot;</p>
        <p className="text-[#74FA6A]">✓ 03 fase · 09 sub-fitur</p>
        <p className="text-white/65">graph.edges: 28 · deps acyclic</p>
      </motion.div>
    </div>
  );
}

function AnimatedTerminalRuntime() {
  const items = [{ label: "Membaca PRD" }, { label: "Menyusun graph" }, { label: "Menunggu agent" }];
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
              <span className="ml-auto text-[9px] text-white/30">{done ? "done" : active ? "…" : "next"}</span>
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

function CLITerminal() {
  const lines = [
    { t: "# login sekali", c: "#5B6676" },
    { t: "$ npx scratch-agent login --token rv_...", c: "cmd" },
    { t: "$ npx scratch-agent plan get plan_id", c: "cmd" },
    { t: "", c: "" },
    { t: "# satu task per siklus", c: "#5B6676" },
    { t: "$ npx scratch-agent task next --plan plan_id", c: "cmd" },
    { t: "✓ F01-S01-T01 · Buat halaman katalog", c: "ok" },
    { t: "$ npx scratch-agent task start F01-S01-T01", c: "cmd" },
    { t: "agent sedang mengeksekusi_", c: "blink" },
  ];
  const [visible, setVisible] = useState(0);
  const [char, setChar] = useState(0);
  useEffect(() => {
    if (visible >= lines.length) {
      const r = setTimeout(() => { setVisible(0); setChar(0); }, 2000);
      return () => clearTimeout(r);
    }
    const cur = lines[visible].t;
    if (char >= cur.length) {
      const d = setTimeout(() => { setVisible((v) => v + 1); setChar(0); }, cur === "" ? 200 : 400);
      return () => clearTimeout(d);
    }
    const d = setTimeout(() => setChar((c) => c + 1), cur[0] === "$" || cur[0] === "✓" ? 24 : 16);
    return () => clearTimeout(d);
  }, [visible, char]);
  return (
    <div className="min-h-[252px] space-y-0">
      {lines.slice(0, visible).map((l, i) => <Line key={i} text={l.t} kind={l.c} />)}
      {visible < lines.length && lines[visible].t === "" ? null : visible < lines.length ? <Line text={lines[visible].t.slice(0, char)} kind={lines[visible].c} typing /> : null}
    </div>
  );
}

function Line({ text, kind, typing = false }: { text: string; kind: string; typing?: boolean }) {
  if (kind === "cmd") return <p><span className="text-[#74FA6A]">$</span> {text.replace(/^\$\s/, "")}{typing && <Caret />}</p>;
  if (kind === "ok") return <p className="text-[#74FA6A]">{text}{typing && <Caret />}</p>;
  if (kind === "blink") return <motion.p animate={{ opacity: [.35, 1, .35] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-white/55">{text}</motion.p>;
  if (text === "") return <br />;
  return <p className={kind === "#5B6676" ? "text-[#5B6676]" : ""}>{text}{typing && <Caret />}</p>;
}

function Caret() {
  return <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: .6 }} className="ml-px inline-block h-[1em] w-[7px] translate-y-[2px] bg-white/80" />;
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
