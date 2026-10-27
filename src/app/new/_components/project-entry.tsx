"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SetupFrame } from "./setup-frame";
import { getCurrentUser } from "@/lib/current-user";
import { restoreSoftwareDraft } from "@/lib/software-draft";
import { useLang } from "@/lib/lang";
import styles from "./new-project.module.css";

export function ProjectEntry() {
  const language = useLang();
  const t = (en: string, id: string) => language === "en" ? en : id;
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void getCurrentUser({ fresh: true }).then(user => {
      if (!active) return;
      if (!user) { router.replace("/login"); return; }
      try { setBrief(restoreSoftwareDraft(sessionStorage)); }
      catch { setError("Browser storage is unavailable."); }
      setReady(true);
    }).catch(() => { if (active) setError("Sign-in could not be checked. Reload to try again."); });
    return () => { active = false; };
  }, [router]);
  function continueSetup(event: React.FormEvent) {
    event.preventDefault();
    if (brief.trim().length < 3) return;
    try {
      sessionStorage.setItem("rv_brief", brief.trim());
      sessionStorage.setItem("rv_brief_software", brief.trim());
      sessionStorage.removeItem("rv_generation_plan_id");
      sessionStorage.removeItem("rv_generating");
      router.push("/new/prefs");
    } catch { setError(t("Your brief could not be saved.", "Brief belum bisa disimpan.")); }
  }
  return <SetupFrame stage="idea"><div className={styles.page}>
    {!ready ? <p role="status">{error || t("Checking your session…", "Memeriksa sesi…")}</p> : <div className={styles.workspace}>
      <section className={styles.brief} aria-labelledby="brief-title"><form onSubmit={continueSetup}>
        <h1 id="brief-title">{t("Start with your idea.", "Mulai dari idemu.")}</h1>
        <label htmlFor="project-brief" className={styles.intro}>{t("Tell us what it should do, who it’s for, and what matters to you.", "Ceritakan fungsinya, untuk siapa, dan apa yang penting buatmu.")}</label>
        <textarea id="project-brief" required minLength={3} maxLength={4000} rows={7} value={brief} onChange={event => { setBrief(event.target.value); try { sessionStorage.setItem("rv_brief", event.target.value); } catch {} }} placeholder={t("Example: A music studio booking app to check available slots and reserve a room…", "Contoh: Aplikasi booking studio musik untuk melihat jadwal dan memesan ruangan…")}/>
        <div className={styles.actions}><span>{brief.length}/4000</span><button type="submit" disabled={brief.trim().length < 3}>{t("Continue", "Lanjut")}<ArrowRight size={17}/></button></div>
      </form></section>
    </div>}
    {error && ready && <p role="alert" className={styles.error}>{error}</p>}
  </div></SetupFrame>;
}
