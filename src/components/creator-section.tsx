"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { CircleCheck, Loader, ThumbsUp } from "lucide-react";
import { useLang } from "@/lib/lang";
import styles from "./creator-section.module.css";

const CREATOR = {
  name: "Teguh Adhi Wibowo",
  role: "Vibe Coding",
  id: "PMT2200021",
  onboard: "16 Sep 2022",
};

function ScratchMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 28" fill="none" className={className} aria-hidden="true">
      <path d="M6 9h9l-6 13H0z" fill="#74FA6A" />
      <path d="M16 4h9l-6 13h-9z" fill="#9AFF82" />
      <path d="M23 9h9l-6 13h-9z" fill="#4DDC62" />
    </svg>
  );
}

/** QoderWake composition, with Scratch Agent's existing palette and real workflow.
 * The creator badge uses the supplied artwork and animation.
 * Motion demonstrates capability changes, a hanging pass, and sequential tasks.
 */
export function CreatorSection() {
  const en = useLang() === "en";
  const section = useRef<HTMLElement>(null);
  const inView = useInView(section, { amount: 0.15 });
  const [pageVisible, setPageVisible] = useState(true);
  const [capability, setCapability] = useState(0);
  const [taskStep, setTaskStep] = useState(2);
  const running = inView && pageVisible;

  useEffect(() => {
    const sync = () => setPageVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    if (!running) return;
    const profileTimer = window.setInterval(() => setCapability((value) => (value + 1) % 2), 4000);
    const taskTimer = window.setInterval(() => setTaskStep((value) => (value + 1) % 4), 3600);
    return () => {
      window.clearInterval(profileTimer);
      window.clearInterval(taskTimer);
    };
  }, [running]);

  const capabilities = en ? [
    [{ title: "Project planning", prompt: "Turn my brief into a PRD" }, { title: "Task graph", prompt: "Break down the features and dependencies" }],
    [{ title: "Agent context", prompt: "Read the plan and pick up the next task" }, { title: "Checkpoints", prompt: "Save progress before continuing" }],
  ] : [
    [{ title: "Perencanaan project", prompt: "Ubah brief jadi PRD" }, { title: "Task graph", prompt: "Susun fitur dan dependensinya" }],
    [{ title: "Konteks agent", prompt: "Baca plan, ambil task berikutnya" }, { title: "Checkpoint", prompt: "Simpan progres sebelum lanjut" }],
  ];
  const tasks = en ? [
    { title: "Turn a brief into a plan", description: "Define features, scope, and acceptance criteria in a structured PRD." },
    { title: "Work through the task graph", description: "Give your coding agent the next task, with its dependencies and context." },
    { title: "Review the results", description: "Track progress, check the output, and continue from the saved checkpoint." },
  ] : [
    { title: "Ubah brief jadi rencana", description: "Susun fitur, scope, dan kriteria selesai dalam PRD yang terstruktur." },
    { title: "Jalankan task sesuai urutan", description: "Agent coding mengambil task berikutnya beserta dependensi dan konteksnya." },
    { title: "Review hasil pengerjaan", description: "Pantau progres, cek hasilnya, lalu lanjut dari checkpoint yang tersimpan." },
  ];

  return (
    <section ref={section} id="builders" aria-labelledby="builders-heading" className={styles.section} data-running={running}>
      <div className={styles.intro}>
        <h2 id="builders-heading" className={styles.heading}>
          Scratch Agent<br />
          {en ? "You bring the idea." : "Kamu bawa idenya."}<br />
          {en ? "Build it with your agent." : "Bangun bareng agent."}
        </h2>
        <p className={styles.description}>
          {en
            ? "Start with a short brief. Scratch Agent turns it into a PRD, ordered tasks, and context your coding agent can use. Work in your favorite tools, follow the progress, and review each checkpoint. A clear plan keeps you and your agent working toward the same result."
            : "Mulai dari brief singkat. Scratch Agent menyusunnya jadi PRD, task terurut, dan konteks yang siap dipakai agent coding. Kerjakan lewat tools favoritmu, ikuti progresnya, dan review setiap checkpoint. Dengan rencana yang jelas, kamu dan agent bisa fokus membangun ide yang sama."}
        </p>
        <div className={styles.badgeStage}>
          {/* Keep the supplied animated asset byte-for-byte. Next image optimization would alter delivery. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/creator/teguh-adhi-wibowo-animated.gif"
            alt="Name tag Teguh Adhi Wibowo"
            className={styles.badgeArtwork}
          />
        </div>
      </div>

      <div className={styles.showcase}>
        <div className={styles.topRow}>
          <div className={styles.profileStage}>
            <svg viewBox="0 0 456 318" fill="none" preserveAspectRatio="xMidYMid slice" className={styles.ribbon} aria-hidden="true">
              <path d="M330-70C400 117 253 236-70 257" stroke="#3F8250" strokeWidth="56" />
              <path d="M330-70C400 117 253 236-70 257" stroke="#B6DAB4" strokeOpacity=".3" strokeDasharray="4 4" />
            </svg>
            <div className={styles.profile}>
              <div className={styles.profileHeader}>
                <span className={styles.avatar}><ScratchMark /></span>
                <span className={styles.like} aria-hidden="true"><ThumbsUp size={17} /></span>
              </div>
              <h3 className={styles.profileTitle}>{en ? "Your project planning partner" : "Partner perencanaan project kamu"}</h3>
              <p className={styles.profileDescription}>
                {en ? "PRD, task dependencies, and checkpoints. Give your agent a clear starting point." : "PRD, dependensi task, dan checkpoint. Beri agent titik mulai yang jelas."}
              </p>
              <p className={styles.capabilityLabel}>{en ? "What Scratch Agent prepares" : "Yang disiapkan Scratch Agent"}</p>
              <div className={styles.capabilityViewport}>
                <AnimatePresence initial={false}>
                  <motion.ul key={capability} className={styles.capabilities}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}>
                    {capabilities[capability].map((item) => (
                      <li key={item.title}>
                        <span className={styles.capabilityTitle}>{item.title}</span>
                        <p><span className={styles.promptLabel}>Prompt</span><span>{item.prompt}</span></p>
                      </li>
                    ))}
                  </motion.ul>
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>

        <div className={styles.taskStage}>
          <div className={styles.taskCard}>
            <div className={styles.taskHeader}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/creator/teguh-avatar.png"
                alt={CREATOR.name}
                className={styles.miniAvatar}
              />
              <p>{CREATOR.name} <span>· {CREATOR.role}</span></p>
            </div>
            <ul className={styles.tasks}>
              {tasks.map((task, index) => {
                const status = index < taskStep ? "done" : index === taskStep ? "active" : "waiting";
                return (
                  <li key={index} data-status={status}>
                    <span className={styles.taskIcon} aria-hidden="true">
                      {status === "done" ? <CircleCheck size={16} /> : status === "active" ? <Loader size={16} className={styles.spinner} /> : <span className={styles.waiting} />}
                    </span>
                    <div><h3 className={status === "active" ? styles.shiny : undefined}>{task.title}</h3><p>{task.description}</p></div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
