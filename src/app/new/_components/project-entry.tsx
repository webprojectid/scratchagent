"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { SetupFrame } from "./setup-frame";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { useLang } from "@/lib/lang";
import { switchProjectDraft } from "@/lib/project-draft";
import styles from "./new-project.module.css";

type Domain = "software" | "physical";
export function ProjectEntry() {
  const language = useLang();
  const t = (en: string, id: string) => language === "en" ? en : id;
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [brief, setBrief] = useState("");
  const [ready, setReady] = useState(false);
  const [showMaxUnlock, setShowMaxUnlock] = useState(false);
  const [maxAccess, setMaxAccess] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    let active = true;
    void getCurrentUser({ fresh: true }).then(user => {
      if (!active) return;
      if (!user) { router.replace("/login"); return; }
      setMaxAccess(user.tier === "max" && user.proActive === true);
      try {
        const fromLibrary = new URLSearchParams(location.search).get("from") === "library";
        const saved = fromLibrary ? "software" : sessionStorage.getItem("rv_domain");
        if (fromLibrary) sessionStorage.setItem("rv_domain", "software");
        if (saved === "software" || saved === "physical" && user.tier === "max" && user.proActive === true) setDomain(saved);
        setBrief(sessionStorage.getItem("rv_brief") ?? "");
      } catch { setError("Browser storage is unavailable."); }
      setReady(true);
    }).catch(() => { if (active) setError("Sign-in could not be checked. Reload to try again."); });
    return () => { active = false; };
  }, [router]);
  function choose(next: Domain) {
    if (next === "physical" && !maxAccess) { setError(""); setShowMaxUnlock(true); return; }
    setShowMaxUnlock(false);
    setError("");
    try {
      switchProjectDraft(sessionStorage, domain ?? "software", next);
      if (domain) sessionStorage.setItem(`rv_brief_${domain}`, brief);
      const nextBrief = domain && next !== domain ? sessionStorage.getItem(`rv_brief_${next}`) ?? "" : brief;
      setBrief(nextBrief); setDomain(next);
      sessionStorage.setItem("rv_domain", next); sessionStorage.setItem("rv_brief", nextBrief);
    } catch { setError(t("Your choice could not be saved.", "Pilihan belum bisa disimpan.")); }
  }
  function continueSetup(event: React.FormEvent) {
    event.preventDefault();
    if (!domain || brief.trim().length < 3 || domain === "physical" && !maxAccess) return;
    try {
      sessionStorage.setItem("rv_brief", brief.trim()); sessionStorage.setItem(`rv_brief_${domain}`, brief.trim());
      sessionStorage.removeItem("rv_generation_plan_id"); sessionStorage.removeItem("rv_generating");
      router.push(domain === "physical" ? "/new/foundation" : "/new/prefs");
    } catch { setError(t("Your brief could not be saved.", "Brief belum bisa disimpan.")); }
  }
  return <SetupFrame stage="idea"><div className={styles.page}>
    {!ready ? <p role="status">{error || t("Checking your session…", "Memeriksa sesi…")}</p> : <div className={styles.workspace} data-expanded={!!domain || showMaxUnlock}>
      <section className={styles.selection} aria-labelledby="project-kind">
        <p className={styles.eyebrow}>{t("NEW PROJECT", "PROYEK BARU")}</p>
        <h1 id="project-kind">{t("What are you building?", "Apa yang ingin kamu bangun?")}</h1>
        <p className={styles.intro}>{t("Choose a direction. We’ll shape the plan around it.", "Pilih arahnya. Rencana akan mengikuti produkmu.")}</p>
        <fieldset className={styles.choices}><legend className={styles.srOnly}>{t("Project type", "Jenis proyek")}</legend>
          {([{ id: "software", title: "Software & Apps", description: t("Websites, mobile apps and desktop software.", "Website, aplikasi mobile, dan software desktop.") }, { id: "physical", title: "Hardware & Robotics", description: t("Machines, robots and electronic devices.", "Mesin, robot, dan perangkat elektronik.") }] as const).map((item, index) => <label key={item.id} className={styles.choice} data-selected={domain === item.id}>
            <input type="radio" name="project-domain" checked={domain === item.id} onClick={() => { if (domain === item.id) choose(item.id); }} onChange={() => choose(item.id)}/><span className={styles.number}>0{index + 1}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span className={styles.check} aria-hidden="true">{domain === item.id ? <Check size={17}/> : <ArrowRight size={17}/>}</span>
          </label>)}
        </fieldset>
      </section>
      <AnimatePresence initial={false} mode="wait">{showMaxUnlock ? <motion.section key="max-unlock" className={styles.brief} aria-labelledby="unlock-title" initial={{ opacity: 0, x: reducedMotion ? 0 : 56 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -16 }} transition={{ duration: reducedMotion ? 0 : .38, ease: [.22, 1, .36, 1] }}>
        <h2 id="unlock-title">{t("Unlock Hardware & Robotics", "Buka akses Hardware & Robotics")}</h2>
        <p className={styles.intro}>{t("Max includes planning for machines, robots and electronic devices. Your current plan does not include this feature.", "Max mencakup perencanaan mesin, robot, dan perangkat elektronik. Paketmu saat ini belum mencakup fitur ini.")}</p>
        <div className={styles.unlockActions}><button type="button" onClick={() => setShowMaxUnlock(false)}>{t("Go back", "Kembali")}</button><Link href="/pricing">{t("Explore Max", "Lihat paket Max")}<ArrowRight size={17}/></Link></div>
      </motion.section> : domain && <motion.section key={domain} className={styles.brief} aria-labelledby="brief-title" initial={{ opacity: 0, x: reducedMotion ? 0 : 56 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -16 }} transition={{ duration: reducedMotion ? 0 : .38, ease: [.22, 1, .36, 1] }} onAnimationComplete={() => input.current?.focus({ preventScroll: true })}>
        <form onSubmit={continueSetup}>
          <p className={styles.eyebrow}>{domain === "physical" ? "HARDWARE & ROBOTICS" : "SOFTWARE & APPS"}</p>
          <h2 id="brief-title">{t("Start with your idea.", "Mulai dari idemu.")}</h2>
          <label htmlFor="project-brief" className={styles.intro}>{t("Tell us what it should do, who it’s for, and what matters to you.", "Ceritakan fungsinya, untuk siapa, dan apa yang penting buatmu.")}</label>
          <textarea ref={input} id="project-brief" required minLength={3} maxLength={4000} rows={7} value={brief} onChange={event => { setBrief(event.target.value); try { sessionStorage.setItem("rv_brief", event.target.value); } catch {} }} placeholder={domain === "physical" ? t("Example: An offline robot that waters balcony plants, using locally available parts…", "Contoh: Robot penyiram tanaman balkon yang bekerja offline dengan komponen lokal…") : t("Example: A music studio booking app to check available slots and reserve a room…", "Contoh: Aplikasi booking studio musik untuk melihat jadwal dan memesan ruangan…")}/>
          <div className={styles.actions}><span>{brief.length}/4000</span><button type="submit" disabled={brief.trim().length < 3}>{t("Continue", "Lanjut")}<ArrowRight size={17}/></button></div>
        </form>
      </motion.section>}</AnimatePresence>
    </div>}
    {error && ready && <p role="alert" className={styles.error}>{error}</p>}

  </div></SetupFrame>;
}
