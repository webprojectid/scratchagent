"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Shell } from "@/components/brand";
import { CLARIFY_QUESTIONS } from "@/lib/clarify-questions";
import { getCurrentUser } from "@/lib/current-user";

type AnswerValue = string | string[];

const questions = CLARIFY_QUESTIONS;
const total = questions.length;

export default function QuestionsPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [step, setStep] = useState(0);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const brief = sessionStorage.getItem("rv_brief");
    if (!brief) {
      router.push("/new");
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    getCurrentUser().then((u) => {
      if (!active) return;
      if (!u) {
        router.push("/login");
        return;
      }
      timer = setTimeout(() => setAuthed(true), 0);
    });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  const isLast = step === total - 1;
  const q = questions[step];
  const value = answers[step];

  const isAnswered = (a: AnswerValue | undefined) =>
    Array.isArray(a) ? a.length > 0 : typeof a === "string" && a.trim() !== "";
  const answeredCount = questions.reduce((acc, _q, i) => acc + (isAnswered(answers[i]) ? 1 : 0), 0);

  function setSingle(index: number, v: string) {
    setAnswers((prev) => ({ ...prev, [index]: prev[index] === v ? "" : v }));
  }
  function toggleMultiple(index: number, v: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[index]) ? (prev[index] as string[]) : [];
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      return { ...prev, [index]: next };
    });
  }
  function setText(index: number, v: string) {
    setAnswers((prev) => ({ ...prev, [index]: v }));
  }

  function proceed(answersToSave: Record<number, AnswerValue>) {
    const contextAnswers = questions
      .map((qq, i) => {
        const a = answersToSave[i];
        if (Array.isArray(a)) return a.length > 0 ? { question: qq.question, answer: a.join(", ") } : null;
        return typeof a === "string" && a.trim() !== "" ? { question: qq.question, answer: a.trim() } : null;
      })
      .filter((x): x is { question: string; answer: string } => x !== null);

    sessionStorage.setItem("rv_answers", JSON.stringify(contextAnswers));
    router.push("/generate");
  }

  function goBack() {
    if (step === 0) router.push("/new/prefs");
    else setStep((s) => s - 1);
  }
  function goNext() {
    if (isLast) proceed(answers);
    else setStep((s) => s + 1);
  }

  if (!authed) return null;

  return (
    <Shell back="/new/prefs" sidebar={false}>
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-[680px] flex-col justify-center px-5 py-8 md:px-8">
        {/* Top row: label + skip */}
        <div className="flex items-center justify-between">
          <p className="eyebrow">klarifikasi</p>
          <button
            onClick={() => proceed({})}
            className="font-mono text-[11px] tracking-[.04em] text-white/35 transition-colors hover:text-white/70"
          >
            Lewati →
          </button>
        </div>

        {/* Progress */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full bg-[#74FA6A]"
              animate={{ width: `${((step + 1) / total) * 100}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/40">
            {step + 1}/{total}
          </span>
        </div>

        {/* Question card */}
        <div className="mt-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[14px] border border-white/10 bg-[#0F1317] p-6"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#74FA6A]/10 font-mono text-[12px] font-semibold tabular-nums text-[#74FA6A]">
                  {step + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="!m-0 !text-[17px] !font-semibold !leading-6 !tracking-[-.01em] text-white">
                    {q.question}
                  </h1>
                  {(q.type === "single" || q.type === "multiple") && (
                    <p className="mt-1 font-mono text-[10px] tracking-[.04em] text-white/25">
                      {q.type === "single" ? "pilih satu" : "boleh pilih lebih dari satu"} · opsional
                    </p>
                  )}
                  {(q.type === "text" || q.type === "textarea") && (
                    <p className="mt-1 font-mono text-[10px] tracking-[.04em] text-white/25">opsional</p>
                  )}

                  <div className="mt-4">
                    {q.type === "text" && (
                      <input
                        type="text"
                        autoFocus
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setText(step, e.target.value)}
                        placeholder={q.placeholder || "Jawaban kamu..."}
                        className="field rounded-[10px] py-2.5 text-[13px]"
                      />
                    )}

                    {q.type === "textarea" && (
                      <textarea
                        autoFocus
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setText(step, e.target.value)}
                        placeholder={q.placeholder || "Jawaban kamu..."}
                        rows={3}
                        className="field resize-none rounded-[10px] py-2.5 text-[13px] leading-5"
                      />
                    )}

                    {(q.type === "single" || q.type === "multiple") && (q.options ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(q.options ?? []).map((opt) => {
                          const selectedMultiple = Array.isArray(value) ? value : [];
                          const selected = q.type === "single" ? value === opt : selectedMultiple.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => (q.type === "single" ? setSingle(step, opt) : toggleMultiple(step, opt))}
                              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] transition-all ${
                                selected
                                  ? "border-[#74FA6A] bg-[#74FA6A]/[.12] text-[#74FA6A]"
                                  : "border-white/12 bg-[#0A0A0A] text-[#9AA5B3] hover:border-white/25 hover:text-white"
                              }`}
                              aria-pressed={selected}
                            >
                              {selected && <Check size={12} />}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 font-mono text-[12px] tracking-[.04em] text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} /> Kembali
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[10px] tabular-nums text-white/25 sm:block">
              {answeredCount} dijawab
            </span>
            <button className="btn px-6" onClick={goNext}>
              {isLast ? (
                <>
                  <Sparkles size={14} /> Bikin Struktur
                </>
              ) : (
                <>
                  Lanjut <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </Shell>
  );
}
