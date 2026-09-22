"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, AlignLeft } from "lucide-react";
import { CLARIFY_QUESTIONS } from "@/lib/clarify-questions";
import { getCurrentUser } from "@/lib/current-user";
import { SetupFrame } from "../_components/setup-frame";
import styles from "../_components/setup.module.css";

type AnswerValue = string | string[];
const questions = CLARIFY_QUESTIONS;
const total = questions.length;
const topics = ["Pengguna", "Masalah", "Fitur utama", "Platform", "Model bisnis", "Target rilis"];
const isAnswered = (answer: AnswerValue | undefined) => Array.isArray(answer) ? answer.length > 0 : typeof answer === "string" && answer.trim() !== "";

export default function QuestionsPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [authed, setAuthed] = useState(false);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const focusOnChange = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const storedBrief = sessionStorage.getItem("rv_brief");
        if (!storedBrief) { router.replace("/new"); return; }
        const user = await getCurrentUser();
        if (!active) return;
        if (!user) { router.replace("/login"); return; }
        setBrief(storedBrief);
        setAuthed(true);
      } catch {
        if (active) setError("Detail proyek belum bisa dibuka. Periksa koneksi dan izinkan penyimpanan browser, lalu coba lagi.");
      }
    }
    void initialize();
    return () => { active = false; };
  }, [router, retry]);

  const q = questions[step];
  const value = answers[step];
  const isLast = step === total - 1;
  const answeredCount = questions.filter((_, index) => isAnswered(answers[index])).length;

  function changeStep(next: number) {
    if (next === step) return;
    setDirection(next > step ? 1 : -1);
    focusOnChange.current = true;
    setStep(next);
  }
  function selectOption(option: string) {
    setAnswers((previous) => {
      if (q.type === "single") return { ...previous, [step]: option };
      const current = Array.isArray(previous[step]) ? previous[step] as string[] : [];
      return { ...previous, [step]: current.includes(option) ? current.filter((item) => item !== option) : [...current, option] };
    });
  }
  function proceed() {
    const contextAnswers = questions.map((question, index) => {
      const answer = answers[index];
      if (!isAnswered(answer)) return null;
      return { question: question.question, answer: Array.isArray(answer) ? answer.join(", ") : (answer as string).trim() };
    }).filter((answer): answer is { question: string; answer: string } => answer !== null);
    try {
      sessionStorage.setItem("rv_answers", JSON.stringify(contextAnswers));
      setLeaving(true);
      router.push("/generate");
    } catch {
      setError("Jawaban belum tersimpan. Izinkan penyimpanan browser, lalu coba lagi.");
    }
  }

  return (
    <SetupFrame stage="questions">
      {!authed ? (
        <section className={styles.loading} aria-live="polite">
          {error ? <><p role="alert">{error}</p><button className={styles.primary} onClick={() => { setError(""); setRetry((value) => value + 1); }}>Coba lagi</button></> : <><span className={styles.loadingMark} aria-hidden="true" /><p>Menyiapkan detail proyekmu…</p></>}
        </section>
      ) : (
        <div className={styles.questionsLayout}>
          <aside className={styles.questionAside}>
            <nav className={styles.questionIndex} aria-label="Topik pertanyaan">
              {questions.map((question, index) => (
                <button type="button" key={question.question} className={styles.indexButton} aria-current={step === index ? "step" : undefined} onClick={() => changeStep(index)}>
                  <span className={`${styles.indexNumber} ${isAnswered(answers[index]) ? styles.indexDone : ""}`} aria-hidden="true">{isAnswered(answers[index]) ? <Check size={11} /> : `0${index + 1}`}</span>
                  {topics[index]}{isAnswered(answers[index]) && <span className={styles.srOnly}>, sudah dijawab</span>}
                </button>
              ))}
            </nav>
            <details className={styles.briefNote}><summary>Lihat brief awal</summary><p>{brief}</p></details>
          </aside>

          <section className={styles.questionMain} aria-label="Pertanyaan detail proyek">
            <div className={styles.questionTop}><span className={styles.questionCount}>DETAIL {String(step + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span><button type="button" className={styles.textButton} onClick={proceed} disabled={leaving}>{answeredCount > 0 ? "Selesai dengan jawaban ini" : "Lewati detail"}</button></div>

            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div key={step} custom={direction} variants={{ enter: (dir: number) => ({ opacity: 0, x: reducedMotion ? 0 : 14 * dir }), center: { opacity: 1, x: 0 }, exit: (dir: number) => ({ opacity: 0, x: reducedMotion ? 0 : -10 * dir }) }} initial="enter" animate="center" exit="exit" transition={{ duration: reducedMotion ? 0 : .18, ease: "easeOut" }} className={styles.questionBody} onAnimationComplete={(phase) => { if (phase === "center" && focusOnChange.current) { headingRef.current?.focus({ preventScroll: true }); focusOnChange.current = false; } }}>
                <h1 id={`question-${step}`} ref={headingRef} tabIndex={-1} className={styles.questionTitle}>{q.question}</h1>
                <p id={`question-hint-${step}`} className={styles.questionHint}><span>{q.type === "single" ? "Pilih satu jawaban" : q.type === "multiple" ? "Boleh pilih lebih dari satu" : "Ceritakan dengan bahasamu sendiri"}</span> · Opsional</p>

                {(q.type === "single" || q.type === "multiple") ? (
                  <div className={styles.answerList} role={q.type === "single" ? "radiogroup" : "group"} aria-labelledby={`question-${step}`} aria-describedby={`question-hint-${step}`}>
                    {(q.options ?? []).map((option, index) => {
                      const selected = Array.isArray(value) ? value.includes(option) : value === option;
                      return <label className={styles.answerChoice} data-selected={selected} key={option}><input type={q.type === "single" ? "radio" : "checkbox"} name={`answer-${step}`} checked={selected} onChange={() => selectOption(option)} className={styles.nativeChoice} /><span className={styles.answerLetter} aria-hidden="true">{String.fromCharCode(65 + index)}</span><span className={styles.answerLabel}>{option}</span><span className={`${styles.radio} ${q.type === "multiple" ? styles.checkbox : ""}`} aria-hidden="true">{selected && <Check size={12} strokeWidth={2.5} />}</span></label>;
                    })}
                  </div>
                ) : (
                  <>
                    {q.type === "text" ? <input type="text" className={styles.textAnswer} value={typeof value === "string" ? value : ""} onChange={(event) => setAnswers((previous) => ({ ...previous, [step]: event.target.value }))} placeholder={q.placeholder || "Tulis jawabanmu di sini…"} aria-labelledby={`question-${step}`} aria-describedby={`question-hint-${step}`} /> : <textarea rows={5} className={styles.textAnswer} value={typeof value === "string" ? value : ""} onChange={(event) => setAnswers((previous) => ({ ...previous, [step]: event.target.value }))} placeholder={q.placeholder || "Tulis jawabanmu di sini…"} aria-labelledby={`question-${step}`} aria-describedby={`question-hint-${step}`} />}
                    <p className={styles.textHint}><AlignLeft size={13} aria-hidden="true" />Poin singkat juga cukup.</p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <div className={styles.questionActions}>
              <button type="button" className={styles.textButton} onClick={() => step === 0 ? router.push("/new/prefs") : changeStep(step - 1)}><ArrowLeft size={15} aria-hidden="true" />Kembali</button>
              <div className={styles.questionActionsRight}><span className={styles.answerCount} aria-live="polite">{answeredCount} dari {total} dijawab</span><button type="button" className={styles.primary} disabled={leaving} onClick={() => isLast ? proceed() : changeStep(step + 1)}>{leaving ? "Membuka rencana…" : isLast ? "Buat rencana" : "Lanjut"}<ArrowRight size={16} aria-hidden="true" /></button></div>
            </div>
          </section>
        </div>
      )}
    </SetupFrame>
  );
}
