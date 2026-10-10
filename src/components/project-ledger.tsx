"use client";
import { uiText as ui, useUiLanguage, uiLocale } from "@/lib/ui-text";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Download, Flag, FolderOpen, Loader2, MoreVertical, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Tag, Trash2, UserRound, Star, Archive } from "lucide-react";
import type { PlanOverview } from "@/lib/plan-overview";
import { ProjectIcon } from "./project-icon";
import s from "./project-ledger.module.css";

export type LedgerPlan = {
  id: string; title: string; brief?: string; status: string; createdAt: string | undefined;
  favorite?: boolean; archived?: boolean; lastOpenedAt?: string | null;
  stack: string[]; featureCount: number; taskCount: number; tasksDone: number; tasksActive: number; tasksFailed: number;
};
type Filter = "all" | "active" | "near" | "done" | "ready" | "favorite" | "archived";
type InspectorTab = "detail" | "phases" | "notes";
const tabs: InspectorTab[] = ["detail", "phases", "notes"];
const percent = (plan: LedgerPlan) => plan.taskCount > 0 ? Math.min(100, Math.round(plan.tasksDone / plan.taskCount * 100)) : 0;
const working = (plan: LedgerPlan) => plan.status === "implementing" || plan.tasksActive > 0;
const nearDone = (plan: LedgerPlan) => plan.status !== "done" && percent(plan) >= 80 && percent(plan) < 100;
function statusInfo(plan: LedgerPlan) {
  if (plan.status === "done") return { label: ui("Selesai"), tone: "done" };
  if (plan.status === "generating") return { label: ui("Membuat plan"), tone: "generating" };
  if (nearDone(plan)) return { label: ui("Hampir selesai"), tone: "generating" };
  if (working(plan)) return { label: ui("Dikerjakan"), tone: "active" };
  return { label: ui("Siap dikerjakan"), tone: "ready" };
}
function dateLabel(date?: string | null, time = false, timezone = "Asia/Jakarta") {
  if (!date || Number.isNaN(Date.parse(date))) return ui("Belum tersedia");
  return new Intl.DateTimeFormat(uiLocale(), { day: "numeric", month: "short", year: "numeric", timeZone: timezone, ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(date));
}
function sampleOverview(plan: LedgerPlan): PlanOverview {
  const titles = ["Riset & Discovery", "Desain Produk", "Pengembangan MVP", "Pengujian & Iterasi", "Peluncuran"];
  let doneLeft = plan.tasksDone, activeLeft = plan.tasksActive, failedLeft = plan.tasksFailed;
  const phases = Array.from({ length: plan.featureCount }, (_, index) => {
    const total = Math.floor(plan.taskCount / plan.featureCount) + (index < plan.taskCount % plan.featureCount ? 1 : 0);
    const done = Math.min(doneLeft, total); doneLeft -= done;
    const active = Math.min(activeLeft, total - done); activeLeft -= active;
    const failed = Math.min(failedLeft, total - done - active); failedLeft -= failed;
    const tasks = Array.from({ length: total }, (_, taskIndex) => ({ ref: `CONTOH-${index + 1}.${taskIndex + 1}`, title: ["Susun kebutuhan", "Implementasikan antarmuka", "Integrasikan layanan", "Verifikasi alur"][taskIndex % 4], layer: "frontend" as const, status: taskIndex < done ? "done" as const : taskIndex < done + active ? "in_progress" as const : taskIndex < done + active + failed ? "failed" as const : "pending" as const }));
    return { slug: `preview-${index}`, title: titles[index] ?? ui("Fase {0}", index + 1), total, done, active, failed, tasks };
  });
  const tasks = phases.flatMap(phase => phase.tasks);
  return { id: plan.id, brief: plan.brief ?? "", notes: "", lastActivityAt: plan.createdAt ?? null, generationSettings: null, phases, blocked: false, nextTask: tasks.find(task => task.status === "in_progress") ?? tasks.find(task => task.status === "pending") ?? null };
}

export function ProjectLedger({ plans, loading, error = false, onRetry, preview = false, compact = false, defaultFilter = "all", userEmail, userName, onDelete, draftState, reducedMotion = false, onUpdate, timezone = "Asia/Jakarta" }: {
  onUpdate: (id: string, patch: { favorite?: boolean; archived?: boolean }) => Promise<void>; timezone?: string;
  plans: LedgerPlan[]; loading: boolean; error?: boolean; onRetry: () => void; preview?: boolean; compact?: boolean;
  draftState?: [Record<string, string>, Dispatch<SetStateAction<Record<string, string>>>]; reducedMotion?: boolean;
  defaultFilter?: "all" | "active" | "done"; userEmail?: string; userName?: string; onDelete: (plan: LedgerPlan) => void;
}) {
  useUiLanguage();
  const [updating, setUpdating] = useState<string | null>(null);
  async function updateIdentity(plan: LedgerPlan, patch: { favorite?: boolean; archived?: boolean }) { setUpdating(plan.id); setNotice(null); try { await onUpdate(plan.id, patch); } catch (cause) { setNotice(cause instanceof Error ? cause.message : ui("Proyek belum bisa diperbarui.")); } finally { setUpdating(null); } }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("detail");
  const [focusedPhase, setFocusedPhase] = useState<string | null>(null);
  const [overview, setOverview] = useState<PlanOverview | null>(null);
  const [detailErrorId, setDetailErrorId] = useState<string | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const [sortNewest, setSortNewest] = useState(true);
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = draftState ?? [localDrafts, setLocalDrafts];
  const [previewNotes, setPreviewNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteMessage, setNoteMessage] = useState<{ id: string; text: string; error: boolean } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const counts = useMemo(() => ({ all: plans.filter(plan => !plan.archived).length, favorite: plans.filter(plan => plan.favorite && !plan.archived).length, archived: plans.filter(plan => plan.archived).length, active: plans.filter(plan => !plan.archived && working(plan)).length, near: plans.filter(plan => !plan.archived && nearDone(plan)).length, done: plans.filter(plan => !plan.archived && plan.status === "done").length, ready: plans.filter(plan => !plan.archived && plan.status === "ready" && !working(plan)).length }), [plans]);
  const filtered = useMemo(() => plans.filter(plan => {
    const text = `${plan.title} ${plan.brief ?? ""} ${plan.stack.join(" ")}`.toLocaleLowerCase("id-ID");
    const matches = filter === "all" || (filter === "active" ? working(plan) : filter === "near" ? nearDone(plan) : filter === "done" ? plan.status === "done" : plan.status === "ready" && !working(plan));
    const collectionMatches = filter === "archived" ? plan.archived : !plan.archived;
    const extraMatches = filter === "favorite" ? plan.favorite : filter === "archived" || matches;
    return collectionMatches && extraMatches && text.includes(query.trim().toLocaleLowerCase("id-ID"));
  }).sort((a, b) => ((Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0)) * (sortNewest ? 1 : -1)), [plans, query, filter, sortNewest]);
  const selected = filtered.find(plan => plan.id === selectedId) ?? filtered[0] ?? null;
  const selectedPlanId = !loading && !error ? selected?.id : undefined;
  useEffect(() => {
    if (!selectedPlanId || preview) return;
    const controller = new AbortController();
    fetch(`/api/plans/${encodeURIComponent(selectedPlanId)}/overview${userEmail ? `?userId=${encodeURIComponent(userEmail)}` : ""}`, { signal: controller.signal, cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error(ui("Detail belum tersedia")); return response.json(); })
      .then(detail => { if (!controller.signal.aborted) { setOverview(detail); setDetailErrorId(null); } })
      .catch(() => { if (!controller.signal.aborted) setDetailErrorId(selectedPlanId); });
    return () => controller.abort();
  }, [selectedPlanId, userEmail, preview, detailRevision]);
  const detail = preview && selected ? { ...sampleOverview(selected), notes: previewNotes[selected.id] ?? "" } : overview?.id === selectedPlanId ? overview : null;
  async function saveNotes() {
    if (!selected || !detail || savingNotes) return;
    const id = selected.id, notes = drafts[id] ?? detail.notes;
    setSavingNotes(true); setNoteMessage(null);
    try {
      if (preview) setPreviewNotes(previous => ({ ...previous, [id]: notes }));
      else {
        const response = await fetch(`/api/plans/${encodeURIComponent(id)}/overview?userId=${encodeURIComponent(userEmail ?? "")}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }) });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error || ui("Catatan belum bisa disimpan."));
        setOverview(previous => previous?.id === id ? { ...previous, notes: result.notes, lastActivityAt: result.updatedAt } : previous);
      }
      setDrafts(previous => { const next = { ...previous }; delete next[id]; return next; });
      setNoteMessage({ id, text: preview ? ui("Tersimpan untuk pratinjau ini.") : ui("Catatan tersimpan di proyek."), error: false });
    } catch (cause) { setNoteMessage({ id, text: cause instanceof Error ? cause.message : ui("Catatan belum bisa disimpan."), error: true }); }
    finally { setSavingNotes(false); }
  }
  async function exportPlan(format: "zip" | "md" | "json") {
    if (!selected || exporting) return;
    if (preview) { setNotice(ui("Ini data contoh. Ekspor tersedia pada proyek milik akun Anda.")); return; }
    setExporting(true); setNotice(null);
    try {
      const response = await fetch(`/api/plans/${encodeURIComponent(selected.id)}/export?format=${format}&download=1&userId=${encodeURIComponent(userEmail ?? "")}`);
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error || ui("Ekspor belum bisa dibuat.")); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `scratch-agent-${selected.id}.${format}`; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice(`Ekspor ${format.toUpperCase()} siap diunduh.`);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : ui("Ekspor belum bisa dibuat.")); }
    finally { setExporting(false); }
  }
  const detailState = !detail ? <div className={s.detailState}>{detailErrorId === selectedPlanId ? <><p role="alert">{ui("Detail belum bisa dimuat.")}</p><button onClick={() => { setDetailErrorId(null); setDetailRevision(value => value + 1); }}>{ui("Coba lagi")}</button></> : <p role="status"><Loader2 size={16} className={s.spin}/>{ui("Memuat detail proyek…")}</p>}</div> : null;
  return <section className={`${s.ledger} ${compact ? s.compact : ""}`} aria-labelledby="project-title">
    <div className={s.mainColumn}>
      <header className={s.header}><div><h1 id="project-title">{ui("Proyek")}</h1><p>{ui("Rencanakan, kembangkan, dan lacak progres produk Anda dengan bantuan AI.")}</p></div><Link className={s.create} href="/new"><Plus size={20}/>{ui("Buat plan")}</Link></header>
      {preview && <p className={s.previewLabel}>{ui("Data contoh untuk meninjau desain nomor 2")}</p>}
      <div className={s.metrics} aria-label={ui("Ringkasan proyek")}>{[{ key: "all", Icon: FolderOpen, label: ui("Total proyek"), help: ui("Seluruh proyek di workspace ini") }, { key: "active", Icon: RefreshCw, label: ui("Sedang dikerjakan"), help: ui("Proyek dalam progres aktif") }, { key: "near", Icon: Flag, label: ui("Hampir selesai"), help: ui("Minimal 80% tugas selesai") }, { key: "done", Icon: CheckCircle2, label: ui("Selesai"), help: ui("Proyek yang sudah selesai") }].map(({ key, Icon, label, help }) => <div key={key}><Icon size={24}/><strong>{loading ? "…" : counts[key as keyof typeof counts]}</strong><span>{label}</span><small>{help}</small></div>)}</div>
      <div className={s.toolbar}><label className={s.search}><Search size={20}/><span className="sr-only">{ui("Cari proyek")}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={ui("Cari proyek, deskripsi, atau teknologi…")}/></label><div className={s.filters} role="group" aria-label={ui("Filter status proyek")}>{(["all", "active", "near", "done", "ready", "favorite", "archived"] as const).map(item => <button key={item} className={filter === item ? s.filterActive : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{({ all: ui("Semua"), active: ui("Dikerjakan"), near: ui("Hampir selesai"), done: ui("Selesai"), ready: ui("Siap"), favorite: ui("Favorit"), archived: ui("Arsip") })[item]} <span>({counts[item]})</span></button>)}</div></div>
      <div className={s.tableHeading}><span>{ui("Nama proyek")}</span><span>{ui("Progres fase / tugas")}</span><button aria-label={ui(sortNewest ? "Sort oldest first" : "Sort newest first")} onClick={() => setSortNewest(!sortNewest)}>{ui("Dibuat")}<ArrowDown size={15} style={{ transform: sortNewest ? "none" : "rotate(180deg)" }}/></button><span>{ui("Status")}</span><span>{ui("Aksi")}</span></div>
      {loading ? <div className={s.empty} role="status"><Loader2 className={s.spin} size={24}/><strong>{ui("Memuat proyek…")}</strong><p>{ui("The list will appear shortly.")}</p></div> : error ? <div className={s.empty} role="alert"><FolderOpen size={28}/><strong>{ui("Proyek belum bisa dimuat")}</strong><p>{ui("Periksa koneksi lalu coba lagi.")}</p><button onClick={onRetry}>{ui("Coba lagi")}<ArrowRight size={16}/></button></div> : filtered.length === 0 ? <div className={s.empty}><FolderOpen size={28}/><strong>{plans.length === 0 ? ui("Belum ada proyek") : ui("Tidak ada hasil")}</strong><p>{plans.length === 0 ? ui("Mulai dengan membuat plan pertama Anda.") : ui("Coba kata pencarian atau filter lain.")}</p>{plans.length === 0 && <Link href="/new">{ui("Buat plan")}<ArrowRight size={16}/></Link>}</div> : <div className={s.rows}>{filtered.map((plan, index) => {
        const status = statusInfo(plan);
        return <article key={plan.id} className={`${s.row} ${selected?.id === plan.id ? s.selected : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
          <button className={s.rowSelect} onClick={() => { setSelectedId(plan.id); setNotice(null); }} aria-label={ui("Lihat detail {0}", plan.title)} aria-pressed={selected?.id === plan.id}><ProjectIcon project={plan} className={s.planIcon}/><span className={s.planName}><strong>{plan.title}{plan.favorite && <Star size={12} aria-label={ui("Favorit")}/>}{plan.archived && <Archive size={12} aria-label={ui("Arsip")}/>}</strong><small>{plan.brief || ui("{0} fase · {1}", plan.featureCount, plan.stack.join(", ") || ui("Teknologi belum ditentukan"))}</small></span></button>
          <div className={s.progressCell}><span>{ui("{0} fase · {1}", plan.featureCount, ui("{0} dari {1} tugas", plan.tasksDone, plan.taskCount))}</span><div><progress aria-label={ui("Progress for {0}", plan.title)} value={plan.tasksDone} max={Math.max(1, plan.taskCount)}/><b>{percent(plan)}%</b></div></div>
          <time className={s.date} dateTime={plan.createdAt}>{dateLabel(plan.createdAt, false, timezone)}{plan.createdAt && Number.isFinite(Date.parse(plan.createdAt)) && <small>{new Date(plan.createdAt).toLocaleTimeString(uiLocale(), { hour: "2-digit", minute: "2-digit", timeZone: timezone })}</small>}</time>
          <span className={`${s.status} ${s[status.tone]}`}><i/>{status.label}</span>
          <div className={s.actions}>{preview ? <button onClick={() => { setSelectedId(plan.id); setInspectorTab("phases"); }}>{ui("Buka")}<ArrowUpRight size={15}/></button> : <Link href={`/project/${plan.id}`}>{ui("Buka")}<ArrowUpRight size={15}/></Link>}<DropdownMenu.Root><DropdownMenu.Trigger asChild><button className={s.more} aria-label={ui("Options for {0}", plan.title)}><MoreVertical size={19}/></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content data-motion={reducedMotion ? "reduced" : "system"} className={s.menu} align="end" sideOffset={7}><DropdownMenu.Item className={s.menuItem} onSelect={() => { setSelectedId(plan.id); setInspectorTab("notes"); }}>{ui("Catatan proyek")}</DropdownMenu.Item><DropdownMenu.Item disabled={updating === plan.id} className={s.menuItem} onSelect={() => void updateIdentity(plan, { favorite: !plan.favorite })}><Star size={15}/>{plan.favorite ? ui("Hapus favorit") : ui("Tambahkan favorit")}</DropdownMenu.Item><DropdownMenu.Item disabled={updating === plan.id} className={s.menuItem} onSelect={() => void updateIdentity(plan, { archived: !plan.archived })}><Archive size={15}/>{plan.archived ? ui("Kembalikan dari arsip") : ui("Arsipkan proyek")}</DropdownMenu.Item>{!preview && <DropdownMenu.Item className={`${s.menuItem} ${s.danger}`} onSelect={() => onDelete(plan)}><Trash2 size={15}/>{ui("Hapus proyek")}</DropdownMenu.Item>}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></div>
        </article>;
      })}</div>}
      <p className={s.resultCount}>{loading || error ? "" : ui("{0} dari {1} proyek", filtered.length, plans.length)}</p>
    </div>
    <aside className={s.detail} aria-label={ui("Detail proyek terpilih")}>{selected && !loading && !error ? <div key={selected.id} className={s.detailInner}>
      <header className={s.detailHeading}><ProjectIcon project={selected} className={s.detailIcon} size={29}/><div><h2>{selected.title}</h2><p>{selected.brief || detail?.brief || ui("Ringkasan plan yang dipilih")}</p></div></header>
      <div className={s.detailTabs} role="tablist" aria-label={ui("Bagian detail proyek")} onKeyDown={event => {
        const current = tabs.indexOf(inspectorTab), next = event.key === "ArrowRight" ? (current + 1) % tabs.length : event.key === "ArrowLeft" ? (current + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
        if (next < 0) return; event.preventDefault(); setInspectorTab(tabs[next]); (event.currentTarget.querySelectorAll("button")[next] as HTMLButtonElement).focus();
      }}>{tabs.map(item => <button key={item} id={`ledger-tab-${item}-${selected.id}`} role="tab" tabIndex={inspectorTab === item ? 0 : -1} aria-selected={inspectorTab === item} aria-controls={`ledger-panel-${selected.id}`} onClick={() => setInspectorTab(item)}>{item === "detail" ? ui("Detail") : item === "phases" ? ui("Fase & Tugas") : ui("Catatan")}</button>)}</div>
      <div className={s.inspectorPanel} role="tabpanel" id={`ledger-panel-${selected.id}`} aria-labelledby={`ledger-tab-${inspectorTab}-${selected.id}`} tabIndex={0}>
        {inspectorTab === "detail" && <>{detail?.generationSettings && <p className={s.muted}>PRD {detail.generationSettings.language.toUpperCase()} · {detail.generationSettings.scope.toUpperCase()} · {detail.generationSettings.detail === "detailed" ? ui("Mendetail") : ui("Ringkas")} · {detail.generationSettings.agent}</p>}<dl className={s.facts}><div><dt><SlidersHorizontal size={17}/>{ui("Status")}</dt><dd><span className={`${s.status} ${s[statusInfo(selected).tone]}`}><i/>{statusInfo(selected).label}</span></dd></div><div><dt><CalendarDays size={17}/>{ui("Dibuat")}</dt><dd>{dateLabel(selected.createdAt, true, timezone)}</dd></div><div><dt><RefreshCw size={17}/>{ui("Aktivitas terakhir")}</dt><dd>{dateLabel(detail?.lastActivityAt, true, timezone)}</dd></div><div><dt><FolderOpen size={17}/>{ui("Terakhir dibuka")}</dt><dd>{dateLabel(selected.lastOpenedAt, true, timezone)}</dd></div><div><dt><UserRound size={17}/>{ui("Pemilik")}</dt><dd>{userName || userEmail || ui("Akun Anda")}</dd></div><div><dt><Tag size={17}/>{ui("Teknologi")}</dt><dd className={s.tags}>{selected.stack.length ? selected.stack.map(tag => <span key={tag}>{tag}</span>) : ui("Belum ditentukan")}</dd></div></dl>{detailState || (detail && <>
          <section className={s.phases} aria-label={ui("Progres fase")}><h3>{ui("Progres fase")}</h3><div className={s.progressSummary}><span>{ui("{0} dari {1} fase selesai", detail.phases.filter(phase => phase.total > 0 && phase.done === phase.total).length, detail.phases.length)}</span><strong>{percent(selected)}%</strong></div><progress className={s.overallProgress} aria-label={ui("Progres tugas proyek terpilih")} value={selected.tasksDone} max={Math.max(1, selected.taskCount)}/>{!detail.phases.length ? <p className={s.muted}>{ui("Fase belum tersedia. Plan masih disusun.")}</p> : <ol className={s.timeline}>{detail.phases.map((phase, index) => {
            const done = phase.total > 0 && phase.done === phase.total;
            return <li key={phase.slug}><button onClick={() => { setFocusedPhase(phase.slug); setInspectorTab("phases"); }} className={done ? s.phaseDone : phase.active > 0 ? s.phaseActive : s.phasePending} aria-label={ui("Lihat tugas fase {0}", phase.title)}><span className={s.phaseNumber}>{done ? <Check size={17}/> : index + 1}</span><span className={s.phaseText}><strong>{phase.title}</strong>{done ? <small>{ui("Selesai")}</small> : <span className={s.phaseProgress}><small>{ui("{0} dari {1} tugas", phase.done, phase.total)}{phase.failed > 0 ? ` · ${phase.failed} gagal` : ""}</small><progress aria-label={ui("Progres fase {0}", phase.title)} value={phase.done} max={Math.max(1, phase.total)}/><small>{phase.total ? Math.round(phase.done / phase.total * 100) : 0}%</small></span>}</span>{done && <ChevronRight size={15}/>}</button></li>;
          })}</ol>}</section><section className={s.nextTask}><h3><Sparkles size={17}/>{ui("Langkah berikutnya")}</h3>{detail.nextTask ? <button onClick={() => setInspectorTab("phases")}><span className={s.taskSquare}/><span>{detail.nextTask.title}<small>{detail.nextTask.status === "in_progress" ? ui("Sedang dikerjakan") : ui("Dependensi sudah selesai")}</small></span><ChevronRight size={16}/></button> : <p>{detail.blocked ? ui("Menunggu dependensi tugas selesai.") : selected.taskCount > 0 && selected.tasksDone === selected.taskCount ? ui("Semua tugas selesai.") : ui("Belum ada tugas yang siap.")}</p>}</section>
        </>)}</>}
        {inspectorTab === "phases" && (detailState || (detail && <section className={s.taskList}><h3>{ui("Fase &amp; tugas")}<span>{selected.taskCount}{ui("tugas")}</span></h3>{detail.phases.length ? detail.phases.map(phase => <details key={phase.slug} open={focusedPhase === phase.slug || phase.active > 0 || undefined}><summary>{phase.title}<span>{phase.done}/{phase.total}</span><ChevronDown size={16}/></summary><ul>{phase.tasks.map(task => <li key={task.ref}><span className={task.status === "done" ? s.taskDone : s.taskSquare}>{task.status === "done" && <Check size={12}/>}</span><div><strong>{task.title}</strong><small>{task.ref} · {task.layer} · {task.status === "done" ? ui("Selesai") : task.status === "in_progress" ? ui("Dikerjakan") : task.status === "failed" ? ui("Gagal") : ui("Menunggu")}</small></div></li>)}</ul></details>) : <p>{ui("Belum ada fase atau tugas.")}</p>}</section>))}
        {inspectorTab === "notes" && (detailState || (detail && <form className={s.notes} onSubmit={event => { event.preventDefault(); void saveNotes(); }}><label htmlFor={`project-notes-${selected.id}`}>{ui("Catatan proyek")}</label><p>{ui("Catat keputusan dan hal yang perlu ditinjau kembali.")}</p><textarea id={`project-notes-${selected.id}`} rows={8} maxLength={3000} disabled={savingNotes} value={drafts[selected.id] ?? detail.notes} onChange={event => { setDrafts(previous => ({ ...previous, [selected.id]: event.target.value })); setNoteMessage(null); }} placeholder={ui("Tulis catatan untuk proyek ini…")}/><div><span>{(drafts[selected.id] ?? detail.notes).length}/3.000</span><button disabled={savingNotes || (drafts[selected.id] ?? detail.notes) === detail.notes}>{savingNotes ? ui("Menyimpan…") : ui("Simpan catatan")}</button></div>{noteMessage?.id === selected.id && <p role={noteMessage.error ? "alert" : "status"}>{noteMessage.text}</p>}{drafts[selected.id] !== undefined && drafts[selected.id] !== detail.notes && <p role="status">{ui("Ada catatan yang belum disimpan.")}</p>}</form>))}
      </div>
      <footer className={s.detailBottom}><button className={s.export} disabled={exporting} onClick={() => void exportPlan(detail?.generationSettings?.exportFormat ?? "zip")}>{exporting ? <Loader2 className={s.spin} size={18}/> : <Download size={18}/>} {exporting ? ui("Menyiapkan…") : ui("Ekspor {0}", (detail?.generationSettings?.exportFormat ?? "zip").toUpperCase())}<ArrowRight size={17}/></button><DropdownMenu.Root><DropdownMenu.Trigger asChild><button className={s.other}>{ui("Lainnya")}<ChevronDown size={16}/></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content data-motion={reducedMotion ? "reduced" : "system"} className={s.menu} align="end" sideOffset={7}><DropdownMenu.Item className={s.menuItem} disabled={exporting} onSelect={() => void exportPlan("md")}>{ui("Ekspor Markdown")}</DropdownMenu.Item><DropdownMenu.Item className={s.menuItem} disabled={exporting} onSelect={() => void exportPlan("json")}>{ui("Ekspor JSON")}</DropdownMenu.Item>{!preview && <><DropdownMenu.Item className={s.menuItem} asChild><Link href={`/project/${selected.id}`}>{ui("Buka proyek")}</Link></DropdownMenu.Item><DropdownMenu.Item className={`${s.menuItem} ${s.danger}`} onSelect={() => onDelete(selected)}><Trash2 size={15}/>{ui("Hapus proyek")}</DropdownMenu.Item></>}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>{notice && <p className={s.notice} role="status">{notice}</p>}</footer>
    </div> : <div className={s.detailEmpty}><FolderOpen size={28}/><p>{ui("Pilih proyek untuk melihat detailnya.")}</p></div>}</aside>
  </section>;
}
