"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { Shell } from "@/components/brand";
import { CircularCarousel, type CarouselItem } from "@/components/ui/circular-carousel";
import { getCurrentUser } from "@/lib/current-user";

const stages = [
  { title: "Membaca brief", desc: "Mendeteksi domain produk & konteks awal", tag: "Brief" },
  { title: "Menyusun asumsi", desc: "Memilih stack teknologi yang relevan", tag: "Stack" },
  { title: "Daftar fitur", desc: "Membuat daftar fitur lengkap dengan prioritas", tag: "Fitur" },
  { title: "Sub-fitur", desc: "Memecah setiap fitur menjadi sub-fitur", tag: "Detail" },
  { title: "Prioritas & fase", desc: "Menentukan urutan fase dan prioritas", tag: "Fase" },
  { title: "Arsitektur", desc: "Menyusun arsitektur sistem & diagram", tag: "Arch" },
  { title: "Database schema", desc: "Mendesain tabel, relasi & ERD", tag: "DB" },
  { title: "User flow", desc: "Membuat alur perjalanan pengguna", tag: "Flow" },
  { title: "Requirements", desc: "Kebutuhan fungsional & non-fungsional", tag: "Spec" },
  { title: "Tech stack", desc: "Menyiapkan deskripsi tech stack detail", tag: "Tech" },
];

const carouselItems: CarouselItem[] = stages.map((s, i) => ({
  id: String(i + 1),
  title: s.title,
  description: s.desc,
  tag: s.tag,
}));

export default function Generate() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const brief = sessionStorage.getItem("rv_brief");
    const prefsStr = sessionStorage.getItem("rv_prefs");
    if (!brief || !prefsStr) {
      router.push("/new");
      return;
    }

    const alreadyGenerating = sessionStorage.getItem("rv_generating") === "true";
    if (!alreadyGenerating) {
      sessionStorage.setItem("rv_generating", "true");
    }

    const elapsedTimer = setInterval(() => setElapsed((e) => e + 1), 1000);
    const maxStep = stages.length - 0.4;
    const stageTimer = setInterval(() => {
      setStep((s) => {
        if (s >= maxStep) return s;
        const remaining = maxStep - s;
        return s + Math.max(0.03, remaining * 0.06);
      });
    }, 1500);

    if (!alreadyGenerating) {
      const answersStr = sessionStorage.getItem("rv_answers");
      getCurrentUser().then((user) => {
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief,
            techPrefs: JSON.parse(prefsStr),
            userId: user?.email || "shared",
            answers: answersStr ? JSON.parse(answersStr) : [],
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            sessionStorage.removeItem("rv_generating");
            clearInterval(stageTimer);
            clearInterval(elapsedTimer);
            if (data.error) {
              setError(data.error);
              return;
            }
            setStep(stages.length);
            setTimeout(() => router.push(`/project/${data.id}`), 400);
          })
          .catch((err) => {
            sessionStorage.removeItem("rv_generating");
            clearInterval(stageTimer);
            clearInterval(elapsedTimer);
            setError(err.message);
          });
      });
    }

    return () => {
      clearInterval(stageTimer);
      clearInterval(elapsedTimer);
    };
  }, [router]);

  const currentStage = Math.min(Math.floor(step), stages.length - 1);
  const pct = Math.round((step / stages.length) * 100);

  return (
    <Shell back="/new/prefs" sidebar={false}>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col justify-center px-5 py-16">
        <p className="eyebrow">{error ? "Misi gagal" : "Agent sedang menyusun strategi"}</p>
        {error ? (
          <div className="mt-8">
            <p className="text-red-400">{error}</p>
            <button className="btn secondary mt-6" onClick={() => router.push("/new")}>Kembali</button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
              <span>{pct}%</span>
              <span className="font-mono text-xs">{elapsed}s</span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ ease: "easeOut", duration: 0.4 }}
                className="relative h-full bg-[#74FA6A]"
              >
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                />
              </motion.div>
            </div>

            <div className="mt-5 flex items-center gap-3 text-sm text-slate-300">
              <Loader2 className="size-4 animate-spin text-[#74FA6A]" />
              <motion.span key={currentStage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                {stages[currentStage].desc}
              </motion.span>
            </div>

            <div className="mt-16 mb-8">
              <CircularCarousel
                items={carouselItems}
                activeIndex={currentStage}
                autoPlay={false}
                showArrows={false}
              />
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">
              {elapsed > 60 ? "Masih bekerja. LLM sedang menyusun struktur kompleks, sabar ya." : elapsed > 30 ? "Hampir selesai..." : "Biasanya 20 sampai 60 detik. Task akan menyusul di halaman plan."}
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}
