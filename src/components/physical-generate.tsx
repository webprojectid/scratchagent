"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { physicalInputSchema } from "@/lib/physical-domain";
import { getCurrentUser, supabaseConfigured } from "@/lib/current-user";
import { Shell } from "./brand";
import { CircularCarousel } from "./ui/circular-carousel";

const starts = new Map<string, Promise<{ id: string }>>();
export function PhysicalGenerate() {
  const lang = useLang(), router = useRouter();
  const [progress, setProgress] = useState(0), [stage, setStage] = useState(0), [error, setError] = useState("");
  const [restart, setRestart] = useState(0), [paused, setPaused] = useState(false), [savedId, setSavedId] = useState<string | null>(null), [resuming, setResuming] = useState(false);
  const labels = lang === "en" ? ["Foundation & requirements", "Engineering & components", "Roadmap & work packages", "Task instructions & verification"] : ["Foundation & kebutuhan", "Engineering & komponen", "Roadmap & paket pekerjaan", "Instruksi task & verifikasi"];
  useEffect(() => {
    let active = true, timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0, legacyQuery = "";
    async function poll(id: string) {
      if (!active) return;
      setSavedId(id);
      try {
        const response = await fetch(`/api/plans/${id}/progress${legacyQuery}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Progress could not be checked.");
        const data = await response.json();
        if (!active) return;
        failures = 0;
        if (data.generationFailure?.paused) { setPaused(true); setError(data.generationFailure.message); return; }
        const sections: string[] = data.generationProgress?.completedSections ?? [];
        const tasksSaved = sections.filter(value => value === "tasks").length;
        const phaseCount = data.generationProgress?.physicalPhaseCount ?? 0;
        const done = ["discovery", "architecture", "outline"].filter(value => sections.includes(value)).length;
        setProgress(Math.min(95, Math.round((done + (phaseCount ? tasksSaved / phaseCount : 0)) / 4 * 100)));
        setStage(data.generationProgress?.activeStage === "architecture" ? 1 : data.generationProgress?.activeStage === "tasks" ? 3 : data.generationProgress?.activeStage === "outline" ? 2 : 0);
        if (data.features?.length && data.status !== "generating") { starts.clear(); sessionStorage.removeItem("rv_generating"); router.replace(`/project/${id}`); return; }
      } catch { if (++failures >= 5) { setError("Progress could not be checked. Reopen this page to continue your saved job."); return; } }
      timer = setTimeout(() => void poll(id), 3000);
    }
    void (async () => {
      const brief = sessionStorage.getItem("rv_brief");
      const prefs = JSON.parse(sessionStorage.getItem("rv_prefs") ?? "null");
      if (!brief || prefs?.domain !== "physical" || !physicalInputSchema.safeParse(prefs.hardware).success) { router.replace("/new"); return; }
      const user = await getCurrentUser({ fresh: true });
      if (!user) { router.replace("/login"); return; }
      if (user.tier !== "max" || user.proActive !== true) { router.replace("/pricing"); return; }
      legacyQuery = supabaseConfigured() ? "" : `?userId=${encodeURIComponent(user.email)}`;
      const existing = sessionStorage.getItem("rv_generation_plan_id");
      if (existing) { await poll(existing); return; }
      const body = { brief, techPrefs: prefs, handoff: JSON.parse(sessionStorage.getItem("rv_handoff") ?? "null") ?? undefined, userId: user.email };
      const key = JSON.stringify(body);
      let work = starts.get(key);
      if (!work) {
        work = fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: key }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The plan could not be started."); return data as { id: string }; });
        starts.set(key, work);
        void work.catch(() => starts.delete(key));
      }
      const result = await work;
      sessionStorage.setItem("rv_generation_plan_id", result.id);
      sessionStorage.setItem("rv_generating", "true");
      if (active) await poll(result.id);
    })().catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Generation could not start."); });
    return () => { active = false; clearTimeout(timer); };
  }, [router, restart]);
  async function resumeSaved() {
    if (!savedId) return;
    setResuming(true);
    try {
      const user = await getCurrentUser({ fresh: true });
      const query = !supabaseConfigured() && user ? `?userId=${encodeURIComponent(user.email)}` : "";
      const response = await fetch(`/api/plans/${encodeURIComponent(savedId)}/retry-generation${query}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The saved plan could not resume.");
      setPaused(false); setError(""); setRestart(value => value + 1);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The saved plan could not resume."); }
    finally { setResuming(false); }
  }
  const pct = progress;
  return <Shell back="/new/review" sidebar={false}><section aria-label={lang === "en" ? "Hardware project generation" : "Penyusunan proyek hardware"} className="mx-auto flex min-h-[85dvh] max-w-3xl flex-col justify-center overflow-hidden px-5 py-12">
    <p className="eyebrow">{lang === "en" ? "PLANNING YOUR HARDWARE PROJECT" : "MENYUSUN PROYEK HARDWARE"}</p>
    {error ? <div role="alert" className="mt-6 space-y-5 text-sm leading-relaxed"><p>{error}</p>{paused && savedId && <button disabled={resuming} onClick={() => void resumeSaved()} className="min-h-11 rounded border border-white/30 px-4 disabled:opacity-50">{lang === "en" ? "Resume saved plan" : "Lanjutkan plan tersimpan"}</button>}<a className="underline" href="/new/review">{lang === "en" ? "Return to review" : "Kembali ke review"}</a></div> : <><p role="status" className="mt-6 text-sm">{labels[stage]}</p><div role="progressbar" aria-label={lang === "en" ? "Saved generation progress" : "Progres generation tersimpan"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-4 h-1.5 overflow-hidden rounded bg-white/10"><div style={{ width: `${pct}%` }} className="h-full bg-[#74fa6a] transition-[width] motion-reduce:transition-none"/></div><CircularCarousel items={labels.map((title, index) => ({ id: String(index), title, description: lang === "en" ? "Following your brief and manual selections" : "Mengikuti brief dan pilihan manual kamu", tag: ["SPEC", "ENG", "MAP", "TASK"][index] }))} activeIndex={stage} showArrows={false} autoPlay={false} countLabel={lang === "en" ? "of" : "dari"}/></>}
  </section></Shell>;
}
