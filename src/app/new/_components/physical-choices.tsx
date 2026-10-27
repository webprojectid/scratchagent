"use client";
import { useEffect, useRef, useState } from "react";
import { physicalChoiceOptions } from "@/lib/physical-choice-options";
import { hardwareCatalog } from "@/lib/physical-catalog";
import { physicalCategoryCopy, type PhysicalCategory, type PhysicalInput } from "@/lib/physical-domain";
import styles from "./physical-choices.module.css";

const groups: { id: string; en: string; idText: string; keys: PhysicalCategory[] }[] = [
  { id: "programming", en: "Programming", idText: "Pemrograman", keys: ["controller", "language", "firmware", "control"] },
  { id: "components", en: "Components", idText: "Komponen", keys: ["sensors", "actuators", "mechanical", "power"] },
  { id: "connections", en: "Connections & tools", idText: "Koneksi & tools", keys: ["communication", "interface", "companion", "tools", "learning"] },
];
export function PhysicalChoices({ input, lang, onChoice, invalidChoice, validationAttempt = 0 }: { validationAttempt?: number; invalidChoice?: PhysicalCategory; input: PhysicalInput; lang: "en" | "id"; onChoice: (key: PhysicalCategory, mode: "auto" | "manual" | "custom" | "none", value: string) => void }) {
  const [groupId, setGroupId] = useState("programming");
  const [active, setActive] = useState<PhysicalCategory>();
  const panel = useRef<HTMLDialogElement>(null);
  const t = (en: string, id: string) => lang === "en" ? en : id;
  const [handledValidation, setHandledValidation] = useState(0);
  if (invalidChoice && handledValidation !== validationAttempt) {
    setHandledValidation(validationAttempt);
    setGroupId(groups.find(group => group.keys.includes(invalidChoice))!.id);
    setActive(invalidChoice);
  }
  useEffect(() => {
    const dialog = panel.current;
    if (!dialog) return;
    if (active) {
      if (!dialog.open) dialog.showModal();
      if (invalidChoice === active) dialog.querySelector<HTMLInputElement | HTMLSelectElement>("input,select")?.focus();
    } else if (dialog.open) dialog.close();
  }, [active, invalidChoice]);
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [active]);
  const group = groups.find(item => item.id === groupId)!;
  const choice = active ? input.choices[active] ?? { mode: "auto", value: "" } : undefined;
  const options = active ? physicalChoiceOptions(active) : [];
  const reference = active ? hardwareCatalog.find(entry => entry.category === active && entry.name === choice?.value) : undefined;
  function summary(key: PhysicalCategory) {
    const value = input.choices[key];
    if (!value || value.mode === "auto") return t("Recommend from brief", "Rekomendasi dari brief");
    if (value.mode === "none") return t("Not needed", "Tidak diperlukan");
    return value.value || t("Choose an option", "Pilih opsi");
  }
  return <div className={styles.choices}>
    <p className={styles.guidance}>{t("We’ll recommend the setup from your brief. Change only what you have in mind.", "Kami rekomendasikan konfigurasi dari brief. Ubah hanya yang sudah kamu tentukan.")}</p>
    <div className={styles.sections} role="group" aria-label={t("Configuration sections", "Kelompok konfigurasi")}>{groups.map(item => <button key={item.id} type="button" aria-pressed={groupId === item.id} onClick={() => setGroupId(item.id)}>{lang === "en" ? item.en : item.idText}</button>)}</div>
    <div className={styles.rows}>{group.keys.map(key => <div className={styles.row} key={key}>
      <span className={styles.label}>{physicalCategoryCopy[key][lang]}</span>
      <span className={styles.summary} title={summary(key)}>{summary(key)}</span>
      <button type="button" className={styles.edit} aria-label={`${t("Edit", "Ubah")} ${physicalCategoryCopy[key][lang]}`} onClick={() => setActive(key)}>{t("Edit", "Ubah")}</button>
    </div>)}</div>
    <p className={styles.reference}>{t("Component types are starting points. Exact models and compatibility still need verification.", "Jenis komponen menjadi titik awal. Model dan kompatibilitas masih perlu diverifikasi.")}</p>
    <dialog ref={panel} className={styles.panel} aria-labelledby="hardware-editor-title" onClose={() => setActive(undefined)} onClick={event => { if (event.target !== event.currentTarget) return; const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close(); }}>
      {active && choice && <>
        <header className={styles.panelHeader}><div><p>{t("HARDWARE SETUP", "KONFIGURASI HARDWARE")}</p><h2 id="hardware-editor-title">{physicalCategoryCopy[active][lang]}</h2></div><button type="button" className={styles.close} aria-label={t("Close setting", "Tutup pengaturan")} onClick={() => panel.current?.close()}>×</button></header>
        <div className={styles.panelBody}>
          <div className={styles.modes} role="group" aria-label={`${physicalCategoryCopy[active][lang]} ${t("selection mode", "mode pilihan")}`}>
            {([{value:"auto",label:t("Recommend", "Rekomendasi")},{value:"manual",label:t("Choose", "Pilih")},{value:"custom",label:"Custom"},{value:"none",label:t("Not needed", "Tidak perlu")}] as const).map(mode => <button type="button" key={mode.value} aria-pressed={choice.mode === mode.value} onClick={() => onChoice(active, mode.value, mode.value === "manual" ? (choice.mode === "manual" && choice.value ? choice.value : options[0] ?? "") : mode.value === "custom" ? choice.value : "")}>{mode.label}</button>)}
          </div>
          {choice.mode === "auto" && <p className={styles.explanation}>{t("The plan will propose a suitable option using your brief and Foundation answers.", "Plan akan mengusulkan pilihan berdasarkan brief dan jawaban Foundation.")}</p>}
          {choice.mode === "none" && <p className={styles.explanation}>{t("This category is marked as not needed in your plan.", "Kategori ini ditandai tidak diperlukan dalam plan.")}</p>}
          {choice.mode === "manual" && <label className={styles.valueLabel}>{t("Your selection", "Pilihanmu")}<select className={styles.value} aria-invalid={invalidChoice === active || undefined} aria-label={`${physicalCategoryCopy[active][lang]} ${t("selection", "pilihan")}`} value={choice.value} onChange={event => onChoice(active,"manual",event.target.value)}><option value="">{t("Select an option", "Pilih opsi")}</option>{choice.value && !options.includes(choice.value) && <option value={choice.value}>{choice.value}</option>}{options.map(value => <option key={value} value={value}>{value}</option>)}</select></label>}
          {choice.mode === "custom" && <label className={styles.valueLabel}>{t("Model, version or specification", "Model, versi, atau spesifikasi")}<input className={styles.value} aria-invalid={invalidChoice === active || undefined} aria-label={`${physicalCategoryCopy[active][lang]} ${t("selection", "pilihan")}`} maxLength={300} value={choice.value} onChange={event => onChoice(active,"custom",event.target.value)}/></label>}
          {invalidChoice === active && <p className={styles.reference} role="alert">{t("Enter a selection or choose Recommend.", "Isi pilihan atau gunakan Rekomendasi.")}</p>}
          {reference && <p className={styles.reference}><a href={reference.source} target="_blank" rel="noreferrer">{t("Official reference", "Referensi resmi")}</a> · {reference.checkedAt} · {t("Verify board and version compatibility", "Verifikasi kompatibilitas board dan versi")}</p>}
        </div>
        <footer className={styles.panelFooter}><span>{t("Selections save as you edit.", "Pilihan tersimpan saat diubah.")}</span><button type="button" onClick={() => panel.current?.close()}>{t("Done", "Selesai")}</button></footer>
      </>}
    </dialog>
  </div>;
}
