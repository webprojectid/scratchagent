"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { ProjectGenerationPreferences } from "@/components/account-panels";
import { defaultHandoff, type HandoffSettings } from "@/lib/account-preferences";
import { SetupFrame } from "../_components/setup-frame";
import styles from "../_components/planning.module.css";

const opts = {
  Frontend: ["Next.js", "TanStack Start", "Svelte / SvelteKit", "Astro", "Nuxt", "React", "Vue", "Angular", "HTMX", "Qwik", "Solid / SolidStart", "Flutter", "React Native / Expo", "Jetpack Compose", "SwiftUI (iOS Native)", "Tauri (Desktop)", "Electron (Desktop)"],
  Backend: ["Next.js", "Node.js", "Bun", "Hono", "Deno", "tRPC", "Python (FastAPI / Django)", "Go (Fiber / Echo)", "Rust (Axum / Actix)", "Ruby on Rails", "Java", ".NET", "Laravel", "Cloudflare Workers", "Convex (BaaS)", "InstantForge (BaaS)", "Supabase (BaaS)", "Firebase (BaaS)", "Appwrite (BaaS)", "PocketBase (BaaS)"],
  Database: ["Supabase (Postgres)", "Neon (Serverless Postgres)", "Prisma Postgres", "PostgreSQL", "SurrealDB", "Turso (libSQL)", "Turborepo (libSQL) / LibSQL", "PlanetScale (MySQL)", "MySQL", "MongoDB", "Cloudflare D1", "DynamoDB", "CockroachDB", "ClickHouse", "Xata", "Redis / Upstash", "SQLite"],
  Deployment: ["Vercel", "Netlify", "Cloudflare Pages / Workers", "Railway", "Render", "Fly.io", "Koyeb", "Northflank", "Deno Deploy", "SST / Ion", "Modal", "AWS (Amplify / ECS / Lambda)", "Google Cloud (Cloud Run)", "Azure (App Service)", "Hetzner Cloud", "DigitalOcean (App Platform)", "VPS", "Docker / Kubernetes", "Coolify"],
};
type StackKey = keyof typeof opts;
const stackKeys = Object.keys(opts) as StackKey[];
const defaults: Record<StackKey, string> = { Frontend: "Next.js", Backend: "Node.js", Database: "PostgreSQL", Deployment: "Railway" };
const descriptions: Record<StackKey, string> = { Frontend: "Tampilan dan interaksi pengguna", Backend: "Logika dan layanan aplikasi", Database: "Penyimpanan data proyek", Deployment: "Tempat aplikasi dijalankan" };

export default function Prefs() {
  useUiLanguage();
  const router = useRouter();
  const [handoff, setHandoff] = useState<HandoffSettings>(defaultHandoff);
  const [custom, setCustom] = useState(false);
  const [prefs, setPrefs] = useState(defaults);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("rv_prefs") || "null");
      if (!saved) return;
      setCustom(saved.mode === "custom");
      setPrefs(Object.fromEntries(stackKeys.map((key) => {
        const value = saved[key.toLowerCase()];
        return [key, opts[key].includes(value) ? value : defaults[key]];
      })) as Record<StackKey, string>);
    } catch { /* A missing or older preference starts with the default stack. */ }
  }, []);

  function start() {
    try {
      const techPrefs = custom
        ? { mode: "custom" as const, frontend: prefs.Frontend, backend: prefs.Backend, database: prefs.Database, deployment: prefs.Deployment }
        : { mode: "auto" as const };
      sessionStorage.setItem("rv_prefs", JSON.stringify(techPrefs));
      sessionStorage.setItem("rv_handoff", JSON.stringify(handoff));
      setLeaving(true);
      router.push("/new/questions");
    } catch {
      setError(ui("Pilihan belum tersimpan. Izinkan penyimpanan browser, lalu coba lagi."));
    }
  }

  return (
    <SetupFrame stage="prefs">
      <div className={styles.prefsLayout}>
        <section aria-labelledby="prefs-title">
          <p className={styles.eyebrow}>{ui("02 / Teknologi")}</p>
          <h1 id="prefs-title" className={styles.title}>{ui("Tentukan fondasinya.")}</h1>
          <p className={styles.intro}>{ui("Pakai teknologi pilihanmu, atau biarkan Scratch Agent menyesuaikannya dengan brief.")}</p>
          <fieldset className={styles.modeChoices}>
            <legend className={styles.srOnly}>{ui("Cara memilih teknologi")}</legend>
            {[{ mode: false, title: ui("Otomatis"), description: ui("Scratch Agent memilih stack berdasarkan kebutuhan proyek.") }, { mode: true, title: ui("Pilih sendiri"), description: ui("Tentukan teknologi yang ingin kamu gunakan.") }].map((item, index) => (
              <label key={item.title} className={styles.modeChoice} data-selected={custom === item.mode}>
                <input className={styles.nativeChoice} type="radio" name="stack-mode" checked={custom === item.mode} onChange={() => setCustom(item.mode)} />
                <span className={styles.choiceNumber} aria-hidden="true">0{index + 1}</span>
                <span className={styles.choiceCopy}><span className={styles.modeHeading}>{item.title}</span><span className={styles.modeDescription}>{item.description}</span></span>
                <span className={styles.radio} aria-hidden="true">{custom === item.mode && <Check size={12} strokeWidth={2.5} />}</span>
              </label>
            ))}
          </fieldset>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={custom ? "custom" : "auto"} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .18 }} className={styles.modeDetail}>
              {custom ? <div className={styles.fields}>{stackKeys.map((key) => <label key={key} className={styles.fieldLabel}><span>{key}<small>{ui(descriptions[key])}</small></span><select className={styles.select} value={prefs[key]} onChange={(event) => setPrefs((previous) => ({ ...previous, [key]: event.target.value }))}>{opts[key].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</div> : <p className={styles.autoDetail}>{ui("Frontend, backend, database, dan deployment akan ditentukan dari brief. Pilihan otomatis mengutamakan opsi free tier.")}</p>}
            </motion.div>
          </AnimatePresence>
          <div className={styles.documentPrefs}><ProjectGenerationPreferences onChange={setHandoff}/></div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.actions}><span className={styles.actionHint}>{ui("Berikutnya: detail proyek")}</span><button type="button" className={styles.primary} onClick={start} disabled={leaving}>{leaving ? ui("Membuka detail…") : ui("Lanjut ke detail")}<ArrowRight size={16} aria-hidden="true" /></button></div>
        </section>
      </div>
    </SetupFrame>
  );
}
