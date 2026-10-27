"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/lib/types";
import { useLang } from "@/lib/lang";

export function PhysicalTaskControls({ planId, task }: { planId: string; task: Task }) {
  const lang = useLang(), router = useRouter();
  const t = (en: string, id: string) => lang === "en" ? en : id;
  const [report, setReport] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"pass" | "fail" | "inconclusive">("inconclusive");
  const [waitReason, setWaitReason] = useState<"parts" | "human" | "review" | "tool">("human");
  const hardware = task.hardware;
  if (!hardware) return null;
  async function act(action: string) {
    setBusy(true); setError("");
    try {
      const workflow = ["start", "complete", "fail", "retry"].includes(action);
      const response = await fetch(workflow ? `/api/v1/tasks/${encodeURIComponent(task.ref)}/${action}?planId=${encodeURIComponent(planId)}` : `/api/plans/${encodeURIComponent(planId)}/hardware-tasks/${encodeURIComponent(task.ref)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: workflow ? (action === "fail" ? JSON.stringify({ reason: report || "Task failed" }) : undefined) : JSON.stringify({ action, revision: hardware!.revision, ...(action === "evidence" ? { report, outcome, requestId: crypto.randomUUID() } : {}), ...(action === "wait" ? { reason: waitReason } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed.");
      setReport(""); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Request failed."); }
    finally { setBusy(false); }
  }
  const button = "rounded border border-white/25 px-3 py-2 min-h-11 text-xs hover:bg-white/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white";
  return <section className="space-y-4 border-t border-white/15 pt-5">
    <h3 className="text-sm font-semibold">{t("Execution & evidence", "Pengerjaan & bukti")}</h3>
    <dl className="grid grid-cols-[100px_1fr] gap-2 text-xs"><dt>{t("Executor", "Pelaksana")}</dt><dd>{hardware.executor}</dd><dt>{t("Revision", "Revisi")}</dt><dd>{hardware.revision}</dd><dt>{t("Evidence", "Bukti")}</dt><dd>{hardware.evidenceKind === "physical" ? t("Physical results reported by a human", "Hasil fisik yang dilaporkan manusia") : t("Digital verification", "Verifikasi digital")}</dd>{hardware.waitReason && <><dt>{t("Waiting for", "Menunggu")}</dt><dd>{hardware.waitReason}</dd></>}</dl>
    {[{ title: t("Inputs", "Masukan"), values: hardware.inputs }, { title: t("Tools", "Tools"), values: hardware.tools }].map(group => <div key={group.title}><h4 className="mb-1 text-xs font-semibold">{group.title}</h4><ul className="list-disc pl-4 text-xs leading-relaxed">{group.values.map(value => <li key={value}>{value}</li>)}</ul></div>)}
    <div className="flex flex-wrap gap-2">{task.status === "pending" && !hardware.waitReason && <button className={button} disabled={busy || hardware.invalidated} onClick={() => act("start")}>{t("Start task", "Mulai task")}</button>}{hardware.waitReason && <button className={button} disabled={busy} onClick={() => act("resume")}>{t("Confirm prerequisite ready", "Konfirmasi prasyarat tersedia")}</button>}{["pending", "in_progress"].includes(task.status) && !hardware.waitReason && <><label className="sr-only" htmlFor={`wait-${task.ref}`}>{t("Waiting reason", "Alasan menunggu")}</label><select id={`wait-${task.ref}`} value={waitReason} onChange={e => setWaitReason(e.target.value as typeof waitReason)} className="min-h-11 rounded border border-white/25 bg-[#0c0e10] px-3 text-xs"><option value="parts">{t("Parts", "Komponen")}</option><option value="human">{t("Human input", "Tindakan manusia")}</option><option value="review">{t("Review", "Review")}</option><option value="tool">{t("Tool", "Tools")}</option></select><button className={button} disabled={busy} onClick={() => act("wait")}>{t("Put on hold", "Tunda task")}</button></>}</div>
    {task.status === "failed" && <button className={button} disabled={busy} onClick={() => act("retry")}>{t("Retry task", "Coba ulang task")}</button>}
    {task.status === "in_progress" && <><label className="block text-xs">{t("Actual verification result", "Hasil verifikasi nyata")}<textarea rows={4} maxLength={4000} value={report} onChange={e => setReport(e.target.value)} className="mt-2 w-full rounded border border-white/25 bg-transparent p-3 text-sm leading-relaxed" placeholder={t("Describe what was run or measured, the setup and the observed result. Do not enter a planned result.", "Jelaskan yang dijalankan/diukur, setup, dan hasil pengamatan. Jangan isi hasil yang baru direncanakan.")}/></label><label className="block text-xs">{t("Observed outcome", "Hasil pengamatan")}<select value={outcome} onChange={e => setOutcome(e.target.value as typeof outcome)} className="ml-3 min-h-11 border border-white/25 bg-[#0c0e10] px-3"><option value="inconclusive">{t("Inconclusive", "Belum meyakinkan")}</option><option value="pass">{t("Pass", "Lulus")}</option><option value="fail">{t("Fail", "Gagal")}</option></select></label><div className="flex flex-wrap gap-2"><button className={button} disabled={busy || report.trim().length < 5} onClick={() => act("evidence")}>{t("Record result", "Simpan hasil")}</button><button className={button} disabled={busy || report.trim().length < 5} onClick={() => act("fail")}>{t("Mark failed", "Tandai gagal")}</button><button className={button} disabled={busy || report.trim().length < 5} onClick={() => act("fail")}>{t("Mark failed", "Tandai gagal")}</button>{hardware.reviewRequired && <button className={button} disabled={busy || hardware.evidence.filter(e => e.revision === hardware.revision).at(-1)?.outcome !== "pass"} onClick={() => act("review")}>{t("Review this evidence", "Tinjau bukti ini")}</button>}<button className={button} disabled={busy} onClick={() => act("complete")}>{t("Complete task", "Selesaikan task")}</button></div></>}
    {hardware.evidence.map(e => <div key={e.id} className="border-l border-white/20 pl-3 text-xs leading-relaxed"><p className="text-slate-400">{e.actorType === "human" ? t("Human report", "Laporan manusia") : t("Agent report", "Laporan agent")} · {e.outcome} · r{e.revision}{e.revision !== hardware.revision ? ` · ${t("superseded", "revisi lama")}` : ""}</p><p className="whitespace-pre-wrap">{e.report}</p></div>)}
    {hardware.review?.revision === hardware.revision && <p className="text-xs">{t("Human review recorded for this revision.", "Review manusia tersimpan untuk revisi ini.")}</p>}
    {task.status === "done" && <button className={button} disabled={busy} onClick={() => act("invalidate")}>{t("Design changed — require revalidation", "Desain berubah — perlu uji ulang")}</button>}
    {error && <p role="alert" className="text-xs leading-relaxed text-amber-200">{error}</p>}
  </section>;
}
