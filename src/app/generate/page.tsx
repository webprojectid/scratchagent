"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { Shell } from "@/components/brand";
import { CircularCarousel, type CarouselItem } from "@/components/ui/circular-carousel";
import { getCurrentUser } from "@/lib/current-user";

const indonesianStages = [
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

const englishStages = [
  { title: "Reading your brief", desc: "Identifying the product domain and context", tag: "Brief" },
  { title: "Defining assumptions", desc: "Choosing a suitable technology stack", tag: "Stack" },
  { title: "Planning features", desc: "Listing features and their priorities", tag: "Features" },
  { title: "Defining subfeatures", desc: "Breaking each feature into smaller parts", tag: "Detail" },
  { title: "Priorities and phases", desc: "Ordering phases and priorities", tag: "Phases" },
  { title: "System architecture", desc: "Designing the system architecture and diagrams", tag: "Arch" },
  { title: "Database schema", desc: "Designing tables, relationships, and the ERD", tag: "DB" },
  { title: "User flow", desc: "Mapping the user journey", tag: "Flow" },
  { title: "Requirements", desc: "Defining functional and nonfunctional requirements", tag: "Spec" },
  { title: "Tech stack", desc: "Preparing the technology stack details", tag: "Tech" },
];

async function legacyUserQuery(): Promise<string> {
  const user = await getCurrentUser();
  return user?.email ? `?userId=${encodeURIComponent(user.email)}` : "";
}

export default function Generate() {
  const language = useUiLanguage();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stages = language === "en" ? englishStages : indonesianStages;
  const carouselItems: CarouselItem[] = stages.map((stage, index) => ({ id: String(index + 1), title: stage.title, description: stage.desc, tag: stage.tag }));
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

    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let pollFailures = 0;
    const cleanup = () => {
      sessionStorage.removeItem("rv_generating");
      sessionStorage.removeItem("rv_generation_plan_id");
      if (pollTimer) clearTimeout(pollTimer);
    };
    const pollStructure = async (planId: string) => {
      if (disposed) return;
      try {
        const pr = await fetch(`/api/plans/${planId}/progress${await legacyUserQuery()}`);
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
        if ((pj.features ?? []).length > 0) {
          cleanup();
          setStep(englishStages.length);
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
    } else if (alreadyGenerating) {
      // In development, React Strict Mode can replay this effect while the
      // first start request is still in flight. Wait for its plan ID instead
      // of showing a false lost-session error or starting another request.
      const waitStartedAt = Date.now();
      const waitForPlanId = () => {
        if (disposed) return;
        const planId = sessionStorage.getItem("rv_generation_plan_id");
        if (planId) {
          pollStructure(planId);
          return;
        }
        if (Date.now() - waitStartedAt >= 60_000) {
          cleanup();
          setError(language === "en"
            ? "The plan could not be started. Return to the brief and try again."
            : "Plan belum berhasil dimulai. Kembali ke brief lalu coba lagi.");
          return;
        }
        pollTimer = setTimeout(waitForPlanId, 250);
      };
      waitForPlanId();
    } else {
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
    }

    return () => {
      disposed = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [language, router]);

  const currentStage = Math.min(Math.floor(step), stages.length - 1);
  const pct = step >= stages.length ? 100 : Math.min(92, Math.max(4, Math.round(((step + 1) / stages.length) * 100)));

  return (
    <Shell back="/new/prefs" sidebar={false}>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col justify-center px-5 py-16">
        <p className="eyebrow mx-auto w-full max-w-xl">{error ? ui("Misi gagal") : ui("Agent sedang menyusun strategi")}</p>
        {error ? (
          <div className="mt-8">
            <p className="text-red-400">{error}</p>
            <button className="btn secondary mt-6" onClick={() => router.push("/new")}>{ui("Kembali")}</button>
          </div>
        ) : (
          <>
            <div className="mx-auto mt-6 flex w-full max-w-xl items-center text-sm text-slate-400">
              <span>{pct}%</span>
            </div>

            <div className="mx-auto mt-2 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-white/10">
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

            <div className="mx-auto mt-5 flex w-full max-w-xl items-center gap-3 text-sm text-slate-300">
              <Loader2 className="size-4 animate-spin text-[#74FA6A]" />
              <motion.span key={currentStage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                {stages[currentStage].desc}
              </motion.span>
            </div>

            <div className="mt-10 mb-2">
              <CircularCarousel
                items={carouselItems}
                activeIndex={currentStage}
                autoPlay={false}
                showArrows={false}
                countLabel={language === "en" ? "of" : "dari"}
              />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
