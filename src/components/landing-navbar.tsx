"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useScroll } from "motion/react";
import { KeyRound, X } from "lucide-react";
import { Vaso } from "vaso";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { getCurrentUser, refreshCurrentUser } from "@/lib/current-user";
import { UserNav } from "@/components/user-nav";
export function LandingNavbar() {
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
      <motion.nav data-liquid-nav className="sticky top-3 z-40 mx-auto flex h-[64px] w-[calc(100%-28px)] max-w-[1300px] items-center justify-between rounded-full px-4 md:top-4 md:px-5" initial={false}>
        <Vaso aria-hidden="true" radius={32} depth={1.25} blur={10} dispersion={false} specular={false} style={{ position: "absolute", inset: 0, pointerEvents: "none", background: scrolled ? "rgba(18,24,21,.86)" : "rgba(29,34,35,.72)", borderRadius: 32, transition: "background-color 200ms ease" }} />
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-[18px] font-semibold tracking-[-.04em] text-[#E8F0E8]"><span className="relative grid size-7 place-items-center overflow-hidden text-[#74FA6A]" aria-hidden="true"><span className="absolute left-0 top-[7px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" /><span className="absolute left-[8px] top-[3px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" /><span className="absolute left-[16px] top-[7px] h-3 w-2.5 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" /></span>Scratch Agent</Link>
          <div className="hidden items-center gap-9 md:flex"><Link href="/pricing" className="font-mono text-[13px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">{t("nav", "pricing", lang)}</Link><Link href="/solutions" className="font-mono text-[13px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">{t("nav", "solutions", lang)}</Link><Link href="/docs" className="font-mono text-[13px] tracking-[0.02em] text-white/70 transition-colors duration-200 hover:text-[#74FA6A]">{t("nav", "docs", lang)}</Link><a href="https://scratchagent.store/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-mono text-[13px] tracking-[0.02em] text-[#74FA6A] transition-colors duration-200 hover:text-[#A8FF9B]"><KeyRound size={13} strokeWidth={2.2} aria-hidden="true" />Api Key</a></div>
        </div>
        <div className="hidden items-center gap-3 md:flex">

          <UserNav landingButtons />
          <Link href={loggedIn ? "/new" : "/login"} className="landing-nav-button landing-nav-button-solid"><span>{lang === "en" ? "Create plan" : "Buat plan"}</span></Link>
        </div>
        <button className="grid size-8 place-items-center text-white md:hidden" onClick={() => setMobileNav((v) => !v)} aria-label={lang === "en" ? "Navigation menu" : "Menu navigasi"} aria-expanded={mobileNav} aria-controls="scratch-mobile-navigation"><span className="relative block h-3.5 w-5"><span className={`absolute left-0 top-0 block h-px w-full bg-white transition-all duration-300 ${mobileNav ? "translate-y-[7px] rotate-45" : ""}`} /><span className={`absolute left-0 top-[7px] block h-px w-full bg-white transition-opacity duration-200 ${mobileNav ? "opacity-0" : "opacity-100"}`} /><span className={`absolute left-0 top-[14px] block h-px w-full bg-white transition-all duration-300 ${mobileNav ? "translate-y-[-7px] -rotate-45" : ""}`} /></span></button>
      </motion.nav>
      <motion.div id="scratch-mobile-navigation" inert={!mobileNav} aria-hidden={!mobileNav} className="fixed inset-0 z-[60] flex flex-col bg-[#0A0A0A] md:hidden" initial={false} animate={mobileNav ? { opacity: 1, pointerEvents: "auto" } : { opacity: 0, pointerEvents: "none" }} transition={{ duration: .35, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex h-[64px] items-center justify-between px-5"><span className="flex items-center gap-2 text-[18px] font-semibold tracking-[-.04em] text-[#E8F0E8]"><span className="size-6 skew-x-[-28deg] bg-[#74FA6A]" />Scratch Agent</span><div className="flex items-center gap-3"><button className="grid size-8 place-items-center text-white" onClick={() => setMobileNav(false)} aria-label={ui("Tutup")}><X size={18} /></button></div></div>
        <div className="flex flex-1 flex-col justify-between px-5 py-12"><div className="space-y-1">{[{ href: "/pricing", label: t("nav", "pricing", lang) }, { href: "/solutions", label: t("nav", "solutions", lang) }, { href: "/docs", label: t("nav", "docs", lang) }, { href: "https://scratchagent.store/", label: "Api Key", external: true }, { href: "/project/demo", label: t("cta", "examplePlan", lang) }].map((link, i) => (<motion.a key={link.href} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noopener noreferrer" : undefined} onClick={() => setMobileNav(false)} className={`block py-4 font-mono text-[14px] tracking-[0.08em] transition-colors hover:text-[#74FA6A] ${link.external ? "text-[#74FA6A]" : "text-white/70"}`} initial={{ opacity: 0, y: 16 }} animate={mobileNav ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ delay: 0.08 + i * 0.05, duration: .4, ease: [0.16, 1, 0.3, 1] }}>{link.label}</motion.a>))}</div><motion.div initial={{ opacity: 0, y: 16 }} animate={mobileNav ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ delay: 0.32, duration: .4, ease: [0.16, 1, 0.3, 1] }}><Link href={loggedIn ? "/new" : "/login"} onClick={() => setMobileNav(false)} className="flex w-full items-center justify-center rounded-full border border-[#74FA6A] px-6 py-3.5 font-mono text-[13px] tracking-[0.06em] text-[#74FA6A] transition-colors hover:bg-[#74FA6A] hover:text-black">{t("cta", "startFree", lang)}</Link><p className="mt-6 font-mono text-[11px] tracking-[.08em] text-white/30">{loggedIn ? <Link href="/profile" className="hover:text-[#74FA6A]">{t("nav", "profile", lang)}</Link> : t("cta", "login", lang)}</p></motion.div></div>
      </motion.div>
    </>
  );
}

