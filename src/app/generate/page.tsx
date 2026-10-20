"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";

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
  const language = useUiLanguage();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completedSections, setCompletedSections] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const brief = sessionStorage.getItem("rv_brief");
    const prefsStr = sessionStorage.getItem("rv_prefs");
    if (!brief || !prefsStr) {
      router.push("/new");
      return;
    }

    const alreadyGenerating = sessionStorage.getItem("rv_generating") === "true";
    const existingPlanId = sessionStorage.getItem("rv_generation_plan_id");
    if (!alreadyGenerating) {
      sessionStorage.setItem("rv_generating", "true");
    }

    const elapsedTimer = setInterval(() => setElapsed((e) => e + 1), 1000);
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let pollFailures = 0;
    const cleanup = () => {
      sessionStorage.removeItem("rv_generating");
      sessionStorage.removeItem("rv_generation_plan_id");
      clearInterval(elapsedTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
    const pollStructure = async (planId: string) => {
      if (disposed) return;
      try {
        const pr = await fetch(`/api/plans/${planId}/progress`);
        if (pr.status === 404) {
          cleanup();
          setError(ui("Generate gagal di tengah jalan. Kuota sudah dikembalikan, silakan coba lagi."));
          return;
        }
        const pj = await pr.json();
        if (!pr.ok) throw new Error(pj.error ?? `HTTP ${pr.status}`);
        pollFailures = 0;
        if (pj.generationFailure?.paused) {
          cleanup();
          setError(ui("Pembuatan terhenti. Bagian yang selesai tersimpan dan kuota sudah dikembalikan."));
          return;
        }
        const activeStage = pj.generationProgress?.activeStage as string | null | undefined;
        const stageIndex: Record<string, number> = {
          discovery: 0,
          outline: 2,
          subfeatures: 3,
          architecture: 5,
          database: 6,
          requirements: 8,
          review: 8,
          tasks: 9,
          diagram: 6,
        };
        if (activeStage && activeStage in stageIndex) setStep(stageIndex[activeStage]);
        setCompletedSections(pj.generationProgress?.completedCount ?? 0);
        if ((pj.features ?? []).length > 0) {
          cleanup();
          setStep(stages.length);
          setTimeout(() => router.push(`/project/${planId}`), 400);
          return;
        }
      } catch {
        pollFailures++;
        if (pollFailures >= 5) {
          cleanup();
          setError(language === "en"
            ? "Progress could not be checked after several attempts. Return to the brief and try again."
            : "Progress gagal diperiksa setelah beberapa percobaan. Kembali ke brief lalu coba lagi.");
          return;
        }
      }
      pollTimer = setTimeout(() => pollStructure(planId), 3000);
    };

    if (existingPlanId) {
      pollStructure(existingPlanId);
    } else if (!alreadyGenerating) {
      const answersStr = sessionStorage.getItem("rv_answers");
      getCurrentUser().then((user) => {
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handoff: JSON.parse(sessionStorage.getItem("rv_handoff") || "null") ?? undefined,
            brief,
            techPrefs: JSON.parse(prefsStr),
            userId: user?.email || "shared",
            answers: answersStr ? JSON.parse(answersStr) : [],
          }),
        })
          .then(async (r) => {
            // Respons non-JSON berarti function-nya error di tingkat platform
            if (!r.ok) {
              const text = await r.text().catch(() => "");
              let msg = `HTTP ${r.status}`;
              try { msg = (await r.json()).error ?? msg; } catch { msg = text.slice(0, 200) || msg; }
              throw new Error(msg);
            }
            return r.json();
          })
          .then((data) => {
            if (data.error) {
              cleanup();
              setError(data.error);
              return;
            }
            sessionStorage.setItem("rv_generation_plan_id", data.id);
            // Generate jalan di background (after). Tunggu struktur PRD siap
            // (fase pertama muncul di /progress) baru pindah ke halaman project
            // Di situ task lanjut terisi realtime dan generate-all terpicu.
            pollStructure(data.id);
          })
          .catch((err) => {
            cleanup();
            setError(err.message);
          });
      });
    } else {
      sessionStorage.removeItem("rv_generating");
      pollTimer = setTimeout(() => setError(language === "en"
        ? "This generation session lost its plan reference. Return to the brief and start it again."
        : "Sesi generate kehilangan referensi plan. Kembali ke brief lalu mulai lagi."), 0);
    }

    return () => {
      disposed = true;
      clearInterval(elapsedTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [language, router]);

  const currentStage = Math.min(Math.floor(step), stages.length - 1);
  const pct = step >= stages.length ? 100 : Math.min(92, Math.max(4, Math.round(((step + 1) / stages.length) * 100)));

  return (
    <Shell back="/new/prefs" sidebar={false}>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col justify-center px-5 py-16">
        <p className="eyebrow">{error ? ui("Misi gagal") : ui("Agent sedang menyusun strategi")}</p>
        {error ? (
          <div className="mt-8">
            <p className="text-red-400">{error}</p>
            <button className="btn secondary mt-6" onClick={() => router.push("/new")}>{ui("Kembali")}</button>
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
              {completedSections > 0
                ? language === "en"
                  ? `${completedSections} PRD sections saved. Work will continue from this checkpoint.`
                  : `${completedSections} bagian PRD tersimpan. Proses akan dilanjutkan dari checkpoint ini.`
                : elapsed > 60
                  ? language === "en"
                    ? "The first PRD section is still being written. Progress reflects the server job."
                    : "Bagian pertama PRD masih disusun. Progress mengikuti proses server."
                  : language === "en"
                    ? "PRD generation has started. Progress reflects the server job."
                    : "Penyusunan PRD sudah dimulai. Progress mengikuti proses server."}
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}
