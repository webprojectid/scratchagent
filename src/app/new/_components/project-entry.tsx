"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { motion } from "motion/react";
import { SetupFrame } from "./setup-frame";
import { getCurrentUser } from "@/lib/current-user";
import { restoreSoftwareDraft } from "@/lib/software-draft";
import { useLang } from "@/lib/lang";
import styles from "./planning.module.css";

const starters = [
  {
    labelEn: "Music studio booking",
    labelId: "Booking studio musik",
    briefEn: "A booking app for a music studio: show open slots, reserve a room, and let the owner confirm each booking.",
    briefId: "Aplikasi booking studio musik: tampilkan jadwal kosong, pesan ruangan, dan biarkan pemilik mengonfirmasi setiap booking.",
  },
  {
    labelEn: "Online coffee shop",
    labelId: "Toko kopi online",
    briefEn: "An online coffee shop with a product catalog, cart, and checkout that supports local bank transfer.",
    briefId: "Toko kopi online dengan katalog produk, keranjang, dan checkout yang mendukung transfer bank lokal.",
  },
  {
    labelEn: "Neighborhood cashier",
    labelId: "Kasir warung",
    briefEn: "A simple cashier app for a neighborhood shop: record sales, track stock, and print a daily summary.",
    briefId: "Aplikasi kasir sederhana untuk warung: catat penjualan, pantau stok, dan cetak ringkasan harian.",
  },
  {
    labelEn: "SaaS analytics",
    labelId: "Analitik SaaS",
    briefEn: "An analytics dashboard for a small SaaS team: track signups, active users, and monthly revenue.",
    briefId: "Dashboard analitik untuk tim SaaS kecil: pantau pendaftaran, pengguna aktif, dan pendapatan bulanan.",
  },
];

export function ProjectEntry() {
  const language = useLang();
  const t = (en: string, id: string) => language === "en" ? en : id;
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    void getCurrentUser({ fresh: true }).then(user => {
      if (!active) return;
      if (!user) { router.replace("/login"); return; }
      setName(user.name?.trim().split(/\s+/)[0] ?? "");
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

  function applyStarter(briefText: string) {
    setBrief(briefText);
    inputRef.current?.focus();
  }

  const greeting = name
    ? t(`What do you want to build, ${name}?`, `Apa yang mau kamu bangun, ${name}?`)
    : t("What do you want to build?", "Apa yang mau kamu bangun?");

  return <SetupFrame stage="idea">
    {!ready ? <section className={styles.ideaLayout} aria-live="polite">
      <div className={styles.ideaStatus}>
        <span className={styles.loadingMark} aria-hidden="true" />
        <p>{error || t("Checking your session…", "Memeriksa sesi…")}</p>
      </div>
    </section> : <div className={styles.ideaLayout}>
      <motion.div className={styles.ideaIntro} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
        <p className={styles.ideaScope}>{t("Software & Apps", "Software & Apps")}</p>
        <h1 className={styles.ideaTitle}>{greeting}</h1>
        <p className={styles.ideaSub}>{t("Start with one brief. Scratch Agent turns it into a reviewed PRD, roadmap, architecture, and ordered tasks.", "Mulai dari satu brief. Scratch Agent menyusunnya jadi PRD, roadmap, arsitektur, dan task yang siap dikerjakan.")}</p>
      </motion.div>

      <motion.form onSubmit={continueSetup} className={styles.composerForm} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}>
        <div className={styles.composerFrame}>
          <div className={styles.composerBody}>
            <label htmlFor="project-brief" className={styles.srOnly}>{t("Project brief", "Brief proyek")}</label>
            <textarea
              ref={inputRef}
              id="project-brief"
              required
              minLength={3}
              maxLength={4000}
              rows={5}
              value={brief}
              onChange={event => { setBrief(event.target.value); try { sessionStorage.setItem("rv_brief", event.target.value); } catch {} }}
              placeholder={t("Describe what it should do, who it is for, and what matters. Example: a music studio booking app that shows open slots and reserves a room.", "Ceritakan fungsinya, untuk siapa, dan apa yang penting. Contoh: aplikasi booking studio musik yang menampilkan jadwal kosong dan memesan ruangan.")}
              className={styles.briefInput}
            />
            <div className={styles.composerToolbar}>
              <span className={styles.counter}>{brief.length}/4000</span>
              <button type="submit" disabled={brief.trim().length < 3} className={styles.send}>
                <ArrowUp size={18} strokeWidth={2.25} aria-hidden="true" />
                <span className={styles.srOnly}>{t("Continue", "Lanjut")}</span>
              </button>
            </div>
          </div>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </motion.form>

      <div className={styles.suggestions}>
        <p className={styles.suggestionsLabel}>{t("Not sure where to start? Try one of these.", "Belum ada ide? Coba salah satu ini.")}</p>
        <div className={styles.chipRow}>
          {starters.map((starter) => (
            <button key={starter.labelEn} type="button" className={styles.chip} onClick={() => applyStarter(language === "en" ? starter.briefEn : starter.briefId)}>
              {language === "en" ? starter.labelEn : starter.labelId}
            </button>
          ))}
        </div>
      </div>
    </div>}
  </SetupFrame>;
}
