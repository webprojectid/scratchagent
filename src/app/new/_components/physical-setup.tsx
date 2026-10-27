"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/lib/lang";
import { getCurrentUser, supabaseConfigured } from "@/lib/current-user";
import { physicalCategories, physicalCategoryCopy, physicalDefaults, physicalDraftSchema, physicalInputSchema, physicalQuestions, type PhysicalInput, type PhysicalCategory } from "@/lib/physical-domain";
import { physicalProgrammingNotes } from "@/lib/physical-programming";
import { PhysicalChoices } from "./physical-choices";
import { defaultHandoff, type HandoffSettings } from "@/lib/account-preferences";
import styles from "./setup.module.css";

const DRAFT = "rv_physical_v1";
export function PhysicalSetup({ stage }: { stage: "foundation" | "configuration" | "review" }) {
  const lang = useLang();
  const t = (en: string, id: string) => lang === "en" ? en : id;
  const router = useRouter();
  const [input, setInput] = useState<PhysicalInput>(physicalDefaults);
  const [brief, setBrief] = useState("");
  const [ready, setReady] = useState(false);
  const [allowance, setAllowance] = useState<{remaining:number;limit:number;windowDays:number;resetAt:number}>();
  const [allowanceFailed, setAllowanceFailed] = useState(false);
  const [error, setError] = useState("");
  const [invalidChoice, setInvalidChoice] = useState<PhysicalCategory>();
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [foundationGroup, setFoundationGroup] = useState(0);
  const [handoff, setHandoff] = useState<HandoffSettings>(defaultHandoff);
  useEffect(() => {
    let active = true;
    void getCurrentUser({ fresh: true }).then(user => {
      if (!active) return;
      if (!user) { router.replace("/login"); return; }
      if (user.tier !== "max" || user.proActive !== true) { router.replace("/pricing"); return; }
      void fetch(`/api/generate?domain=physical${!supabaseConfigured() ? `&userId=${encodeURIComponent(user.email)}` : ""}`,{cache:"no-store"}).then(async response => { if (!response.ok) throw new Error("Allowance unavailable"); return response.json(); }).then(value => { if (active) setAllowance(value); }).catch(() => { if (active) setAllowanceFailed(true); });
      try {
        const savedBrief = sessionStorage.getItem("rv_brief");
        if (!savedBrief || sessionStorage.getItem("rv_domain") !== "physical") { router.replace("/new"); return; }
        setBrief(savedBrief);
        const parsed = physicalDraftSchema.safeParse(JSON.parse(sessionStorage.getItem(DRAFT) ?? "null"));
        if (parsed.success) setInput(parsed.data);
        const savedHandoff = sessionStorage.getItem("rv_handoff");
        if (savedHandoff) setHandoff(JSON.parse(savedHandoff));
        setReady(true);
      } catch { setError("Browser storage is unavailable. Return to your brief and try again."); }
    }).catch(() => { if (active) setError("Your session could not be checked. Reload to try again."); });
    return () => { active = false; };
  }, [router]);
  const programmingNotes = physicalProgrammingNotes(input, lang);
  function save(next: PhysicalInput) { setInput(next); try { sessionStorage.setItem(DRAFT, JSON.stringify(next)); } catch { setError(t("Your answers could not be saved.", "Jawaban belum bisa disimpan.")); } }
  function nextStep() {
    if (stage === "foundation" && foundationGroup < 2) { setFoundationGroup(value => value + 1); window.scrollTo({ top: 0, behavior: "instant" }); return; }
    const parsed = physicalInputSchema.safeParse(input);
    if (!parsed.success) { setValidationAttempt(value => value + 1); const key = parsed.error.issues[0]?.path[1]; if (typeof key === "string" && physicalCategories.includes(key as PhysicalCategory)) setInvalidChoice(key as PhysicalCategory); setError(t("Complete custom selections or switch them to a recommendation.", "Isi pilihan custom atau ganti ke rekomendasi.")); return; }
    try {
      sessionStorage.setItem(DRAFT, JSON.stringify(parsed.data));
      sessionStorage.setItem("rv_handoff", JSON.stringify(handoff));
      if (stage === "foundation") { router.push("/new/hardware"); return; }
      if (stage === "configuration") { router.push("/new/review"); return; }
      sessionStorage.setItem("rv_prefs", JSON.stringify({ mode: "custom", domain: "physical", hardware: parsed.data }));
      sessionStorage.setItem("rv_answers", JSON.stringify(physicalQuestions.filter(q => (!q.kinds || q.kinds.includes(input.kind)) && input.foundation[q.key]?.trim()).map(q => ({ question: q.title[lang], answer: input.foundation[q.key].trim() }))));
      sessionStorage.removeItem("rv_generation_plan_id"); sessionStorage.removeItem("rv_generating");
      router.push("/generate/hardware");
    } catch { setError(t("Your choices could not be saved.", "Pilihan belum bisa disimpan.")); }
  }
  function setChoice(key: PhysicalCategory, mode: "auto" | "manual" | "custom" | "none", value = "") { setInvalidChoice(undefined); setError(""); save({ ...input, choices: { ...input.choices, [key]: { mode, value } } }); }
  const steps = [{ label: t("Brief", "Brief"), path: "/new" }, { label: "Foundation", path: "/new/foundation" }, { label: t("Configuration", "Konfigurasi"), path: "/new/hardware" }, { label: t("Review", "Tinjau"), path: "/new/review" }];
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.brand}>Scratch Agent</Link><span className={styles.headerLabel}>Hardware & Robotics</span><Link className={styles.headerBack} href={stage === "foundation" ? "/new" : stage === "configuration" ? "/new/foundation" : "/new/hardware"}>{t("Back", "Kembali")}</Link></header>
    <div className={styles.workspace}><nav className={styles.progressNav} aria-label={t("Project setup", "Setup proyek")}><ol>{steps.map((s, i) => <li key={s.path} className={i === (stage === "foundation" ? 1 : stage === "configuration" ? 2 : 3) ? styles.currentStage : undefined}><Link href={s.path}>{s.label}</Link></li>)}</ol></nav>
      <section className={styles.prefsLayout}>
        <p className={styles.eyebrow}>HARDWARE & ROBOTICS</p>
        <h1 className={styles.title}>{stage === "foundation" ? t("Define the essentials.", "Tentukan fondasinya.") : stage === "configuration" ? t("Choose your components.", "Pilih komponenmu.") : t("Review your direction.", "Tinjau arah proyekmu.")}</h1>
        {stage !== "configuration" && <p className={styles.intro}>{t("Start with what you know. Unknown details stay open; they won’t be invented.", "Mulai dari yang kamu tahu. Detail yang belum diketahui tetap terbuka, tidak dikarang.")}</p>}
        {!ready ? <p role="status">{error || t("Loading…", "Memuat…")}</p> : <>
          {stage === "foundation" && <div className={styles.fields}><p className={styles.eyebrow}>{[t("Purpose & environment", "Tujuan & lingkungan"), t("Resources & limits", "Sumber daya & batasan"), t("Operation details", "Detail operasi")][foundationGroup]} · {foundationGroup + 1}/3</p>
            {foundationGroup === 0 && <>
            <label className={styles.fieldLabel}><span>{t("What are you building?", "Apa yang dibangun?")}</span><select aria-label={t("What are you building?", "Apa yang dibangun?")} className={styles.select} value={input.kind} onChange={e => save({ ...input, kind: e.target.value as PhysicalInput["kind"] })}>{[["robot", t("Robot", "Robot")], ["machine", t("Machine", "Mesin")], ["electronic_device", t("Electronic device", "Perangkat elektronik")], ["connected_device", t("Connected device / IoT", "Perangkat terhubung / IoT")]].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
            <label className={styles.fieldLabel}><span>{t("Project goal", "Tujuan proyek")}</span><select aria-label={t("Project goal", "Tujuan proyek")} className={styles.select} value={input.goal} onChange={e => save({ ...input, goal: e.target.value as PhysicalInput["goal"] })}>{[["concept", t("Explore a concept", "Eksplorasi konsep")], ["prototype", t("Build a prototype", "Membuat prototipe")], ["improvement", t("Improve an existing device", "Mengembangkan alat existing")]].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
            </>}
            {physicalQuestions.filter(q => !q.kinds || q.kinds.includes(input.kind)).filter(q => (foundationGroup === 0 ? ["users", "environment", "outcome", "operation"] : foundationGroup === 1 ? ["power", "budget", "existing", "exclusions"] : ["motion", "process", "measurement", "connectivity", "intelligence"]).includes(q.key)).map(q => <label key={q.key} style={{ display: "block", marginTop: 26 }}><span>{q.title[lang]} <small style={{ color: "#a7acab", fontSize: 11 }}>({t("optional", "opsional")})</small></span><small style={{ display: "block", color: "#a7acab", lineHeight: 1.7, margin: "8px 0" }}>{q.hint[lang]}</small><textarea className={styles.textAnswer} style={{ minHeight: 90 }} rows={2} maxLength={1500} value={input.foundation[q.key] ?? ""} placeholder={t("Not sure yet? Leave this open.", "Belum tahu? Boleh dikosongkan.")} onChange={e => save({ ...input, foundation: { ...input.foundation, [q.key]: e.target.value } })}/></label>)}
          </div>}
          {stage === "configuration" && <>
            <p className={styles.autoDetail} role="status">{allowance ? t(`${allowance.remaining} of ${allowance.limit} hardware PRDs available · rolling ${allowance.windowDays} days${allowance.remaining < allowance.limit ? ` · Next slot: ${new Date(allowance.resetAt).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}` : ""}`, `${allowance.remaining} dari ${allowance.limit} PRD hardware tersedia · rolling ${allowance.windowDays} hari${allowance.remaining < allowance.limit ? ` · Slot berikut: ${new Date(allowance.resetAt).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}` : ""}`) : allowanceFailed ? t("Hardware allowance could not be loaded. It will be checked before generation.", "Kuota hardware belum bisa dimuat. Kuota akan diperiksa sebelum generate.") : t("Checking your hardware allowance…", "Memeriksa kuota hardware…")}</p>
            <PhysicalChoices input={input} lang={lang} onChoice={setChoice} invalidChoice={invalidChoice} validationAttempt={validationAttempt}/>
            {programmingNotes.length > 0 && <aside aria-label={t("Programming compatibility notes", "Catatan kompatibilitas pemrograman")} style={{ padding: "20px 0", lineHeight: 1.7 }}><strong>{t("Check these selections", "Periksa pilihan berikut")}</strong><ul>{programmingNotes.map(note => <li key={note}>{note}</li>)}</ul></aside>}
            <details className={styles.documentOptions}><summary>{t("Document settings", "Pengaturan dokumen")}<span>{handoff.language === "en" ? "English" : "Indonesia"} · {handoff.detail === "detailed" ? t("Detailed", "Mendetail") : t("Concise", "Ringkas")}</span></summary>
            <label className={styles.fieldLabel}><span>{t("Document language", "Bahasa dokumen")}</span><select className={styles.select} value={handoff.language} onChange={e => setHandoff({ ...handoff, language: e.target.value as "en" | "id" })}><option value="en">English</option><option value="id">Indonesia</option></select></label>
            <label className={styles.fieldLabel}><span>{t("Context depth", "Kedalaman konteks")}</span><select className={styles.select} value={handoff.detail} onChange={e => setHandoff({ ...handoff, detail: e.target.value as "standard" | "detailed" })}><option value="standard">{t("Concise", "Ringkas")}</option><option value="detailed">{t("Detailed", "Mendetail")}</option></select></label>
            <label className={styles.fieldLabel}><span>{t("Target agent", "Agent tujuan")}</span><select className={styles.select} value={handoff.agent} onChange={e => setHandoff({ ...handoff, agent: e.target.value as HandoffSettings["agent"] })}>{["generic", "claude", "codex", "cursor", "opencode"].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
            </details>
          </>}
          {stage === "review" && <>{programmingNotes.length > 0 && <aside aria-label={t("Programming compatibility notes", "Catatan kompatibilitas pemrograman")}><strong>{t("Check these selections", "Periksa pilihan berikut")}</strong><ul>{programmingNotes.map(note => <li key={note}>{note}</li>)}</ul></aside>}<h2 style={{ fontSize: 20, marginBottom: 16 }}>{t("Your brief", "Brief kamu")}</h2><p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{brief}</p><p className={styles.intro}>{input.kind.replaceAll("_", " ")} · {input.goal}</p>
            <h2 style={{ fontSize: 20 }}>Foundation</h2>{physicalQuestions.filter(q => input.foundation[q.key]?.trim()).map(q => <div key={q.key} style={{ padding: "16px 0", borderBottom: "1px solid #353939" }}><strong>{q.title[lang]}</strong><p style={{ color: "#b4c0b8", whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{input.foundation[q.key]}</p></div>)}
            <h2 style={{ fontSize: 20, marginTop: 28 }}>{t("Selections", "Pilihan")}</h2>{physicalCategories.map(key => <p key={key} style={{ lineHeight: 1.8 }}><strong>{physicalCategoryCopy[key][lang]}:</strong> {input.choices[key]?.value || (input.choices[key]?.mode === "none" ? t("Not needed", "Tidak diperlukan") : t("Recommend for me", "Rekomendasikan untuk saya"))}</p>)}
            <p className={styles.intro}>{t("These selections are constraints, not a verified wiring or production design. Conflicts and missing engineering values will be listed as open decisions.", "Pilihan ini menjadi batasan, bukan wiring/desain produksi yang tervalidasi. Konflik dan nilai engineering yang belum ada akan dicatat sebagai keputusan terbuka.")}</p>
          </>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.actions}>{stage === "foundation" && foundationGroup > 0 && <button type="button" className={styles.headerBack} onClick={() => setFoundationGroup(value => value - 1)}>{t("Previous", "Sebelumnya")}</button>}<span className={styles.actionHint}>{t("You can return and change your answers.", "Kamu bisa kembali dan mengubah jawaban.")}</span><button className={styles.primary} type="button" onClick={nextStep}>{stage === "review" ? t("Generate plan", "Buat rencana") : t("Continue", "Lanjut")}<ArrowRight size={16}/></button></div>
        </>}
      </section>
    </div>
  </main>;
}
