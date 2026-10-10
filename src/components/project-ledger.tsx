"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Download, Flag, FolderOpen, Loader2, MoreVertical, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Tag, Trash2, UserRound } from "lucide-react";
import type { PlanOverview } from "@/lib/plan-overview";
import { ProjectIcon } from "./project-icon";
import s from "./project-ledger.module.css";

export type LedgerPlan = {
  id: string; title: string; brief?: string; status: string; createdAt: string | undefined;
  stack: string[]; featureCount: number; taskCount: number; tasksDone: number; tasksActive: number; tasksFailed: number;
};
type Filter = "all" | "active" | "near" | "done" | "ready";
type InspectorTab = "detail" | "phases" | "notes";
const tabs: InspectorTab[] = ["detail", "phases", "notes"];
const percent = (plan: LedgerPlan) => plan.taskCount > 0 ? Math.min(100, Math.round(plan.tasksDone / plan.taskCount * 100)) : 0;
const working = (plan: LedgerPlan) => plan.status === "implementing" || plan.tasksActive > 0;
const nearDone = (plan: LedgerPlan) => plan.status !== "done" && percent(plan) >= 80 && percent(plan) < 100;
function statusInfo(plan: LedgerPlan) {
  if (plan.status === "done") return { label: "Selesai", tone: "done" };
  if (plan.status === "generating") return { label: "Membuat plan", tone: "generating" };
  if (nearDone(plan)) return { label: "Hampir selesai", tone: "generating" };
  if (working(plan)) return { label: "Dikerjakan", tone: "active" };
  return { label: "Siap dikerjakan", tone: "ready" };
}
function dateLabel(date?: string | null, time = false) {
  if (!date || Number.isNaN(Date.parse(date))) return "Belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(date));
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
    return { slug: `preview-${index}`, title: titles[index] ?? `Fase ${index + 1}`, total, done, active, failed, tasks };
  });
  const tasks = phases.flatMap(phase => phase.tasks);
  return { id: plan.id, brief: plan.brief ?? "", notes: "", lastActivityAt: plan.createdAt ?? null, phases, blocked: false, nextTask: tasks.find(task => task.status === "in_progress") ?? tasks.find(task => task.status === "pending") ?? null };
}

export function ProjectLedger({ plans, loading, error = false, onRetry, preview = false, compact = false, defaultFilter = "all", userEmail, userName, onDelete, draftState, reducedMotion = false }: {
  plans: LedgerPlan[]; loading: boolean; error?: boolean; onRetry: () => void; preview?: boolean; compact?: boolean;
  draftState?: [Record<string, string>, Dispatch<SetStateAction<Record<string, string>>>]; reducedMotion?: boolean;
  defaultFilter?: "all" | "active" | "done"; userEmail?: string; userName?: string; onDelete: (plan: LedgerPlan) => void;
}) {
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
  const counts = useMemo(() => ({ all: plans.length, active: plans.filter(working).length, near: plans.filter(nearDone).length, done: plans.filter(plan => plan.status === "done").length, ready: plans.filter(plan => plan.status === "ready" && !working(plan)).length }), [plans]);
  const filtered = useMemo(() => plans.filter(plan => {
    const text = `${plan.title} ${plan.brief ?? ""} ${plan.stack.join(" ")}`.toLocaleLowerCase("id-ID");
    const matches = filter === "all" || (filter === "active" ? working(plan) : filter === "near" ? nearDone(plan) : filter === "done" ? plan.status === "done" : plan.status === "ready" && !working(plan));
    return matches && text.includes(query.trim().toLocaleLowerCase("id-ID"));
  }).sort((a, b) => ((Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0)) * (sortNewest ? 1 : -1)), [plans, query, filter, sortNewest]);
  const selected = filtered.find(plan => plan.id === selectedId) ?? filtered[0] ?? null;
  const selectedPlanId = !loading && !error ? selected?.id : undefined;
  useEffect(() => {
    if (!selectedPlanId || preview) return;
    const controller = new AbortController();
    fetch(`/api/plans/${encodeURIComponent(selectedPlanId)}/overview${userEmail ? `?userId=${encodeURIComponent(userEmail)}` : ""}`, { signal: controller.signal, cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error("Detail belum tersedia"); return response.json(); })
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
        if (!response.ok) throw new Error(result?.error || "Catatan belum bisa disimpan.");
        setOverview(previous => previous?.id === id ? { ...previous, notes: result.notes, lastActivityAt: result.updatedAt } : previous);
      }
      setDrafts(previous => { const next = { ...previous }; delete next[id]; return next; });
      setNoteMessage({ id, text: preview ? "Tersimpan untuk pratinjau ini." : "Catatan tersimpan di proyek.", error: false });
    } catch (cause) { setNoteMessage({ id, text: cause instanceof Error ? cause.message : "Catatan belum bisa disimpan.", error: true }); }
    finally { setSavingNotes(false); }
  }
  async function exportPlan(format: "zip" | "md" | "json") {
    if (!selected || exporting) return;
    if (preview) { setNotice("Ini data contoh. Ekspor tersedia pada proyek milik akun Anda."); return; }
    setExporting(true); setNotice(null);
    try {
      const response = await fetch(`/api/plans/${encodeURIComponent(selected.id)}/export?format=${format}&userId=${encodeURIComponent(userEmail ?? "")}`);
      if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error || "Ekspor belum bisa dibuat."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `scratch-agent-${selected.id}.${format}`; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice(`Ekspor ${format.toUpperCase()} siap diunduh.`);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Ekspor belum bisa dibuat."); }
    finally { setExporting(false); }
  }
  const detailState = !detail ? <div className={s.detailState}>{detailErrorId === selectedPlanId ? <><p role="alert">Detail belum bisa dimuat.</p><button onClick={() => { setDetailErrorId(null); setDetailRevision(value => value + 1); }}>Coba lagi</button></> : <p role="status"><Loader2 size={16} className={s.spin}/> Memuat detail proyek…</p>}</div> : null;
  return <section className={`${s.ledger} ${compact ? s.compact : ""}`} aria-labelledby="project-title">
    <div className={s.mainColumn}>
      <header className={s.header}><div><h1 id="project-title">Proyek</h1><p>Rencanakan, kembangkan, dan lacak progres produk Anda dengan bantuan AI.</p></div><Link className={s.create} href="/new"><Plus size={20}/> Buat plan</Link></header>
      {preview && <p className={s.previewLabel}>Data contoh untuk meninjau desain nomor 2</p>}
      <div className={s.metrics} aria-label="Ringkasan proyek">{[{ key: "all", Icon: FolderOpen, label: "Total proyek", help: "Seluruh proyek di workspace ini" }, { key: "active", Icon: RefreshCw, label: "Sedang dikerjakan", help: "Proyek dalam progres aktif" }, { key: "near", Icon: Flag, label: "Hampir selesai", help: "Minimal 80% tugas selesai" }, { key: "done", Icon: CheckCircle2, label: "Selesai", help: "Proyek yang sudah selesai" }].map(({ key, Icon, label, help }) => <div key={key}><Icon size={24}/><strong>{loading ? "…" : counts[key as keyof typeof counts]}</strong><span>{label}</span><small>{help}</small></div>)}</div>
      <div className={s.toolbar}><label className={s.search}><Search size={20}/><span className="sr-only">Cari proyek</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari proyek, deskripsi, atau teknologi…"/></label><div className={s.filters} role="group" aria-label="Filter status proyek">{(["all", "active", "near", "done", "ready"] as const).map(item => <button key={item} className={filter === item ? s.filterActive : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{({ all: "Semua", active: "Dikerjakan", near: "Hampir selesai", done: "Selesai", ready: "Siap" })[item]} <span>({counts[item]})</span></button>)}</div></div>
      <div className={s.tableHeading}><span>Nama proyek</span><span>Progres fase / tugas</span><button aria-label={`Urutkan tanggal dibuat ${sortNewest ? "terlama" : "terbaru"} dahulu`} onClick={() => setSortNewest(!sortNewest)}>Dibuat <ArrowDown size={15} style={{ transform: sortNewest ? "none" : "rotate(180deg)" }}/></button><span>Status</span><span>Aksi</span></div>
      {loading ? <div className={s.empty} role="status"><Loader2 className={s.spin} size={24}/><strong>Memuat proyek…</strong><p>Daftar akan muncul sebentar lagi.</p></div> : error ? <div className={s.empty} role="alert"><FolderOpen size={28}/><strong>Proyek belum bisa dimuat</strong><p>Periksa koneksi lalu coba lagi.</p><button onClick={onRetry}>Coba lagi <ArrowRight size={16}/></button></div> : filtered.length === 0 ? <div className={s.empty}><FolderOpen size={28}/><strong>{plans.length === 0 ? "Belum ada proyek" : "Tidak ada hasil"}</strong><p>{plans.length === 0 ? "Mulai dengan membuat plan pertama Anda." : "Coba kata kunci atau filter yang lain."}</p>{plans.length === 0 && <Link href="/new">Buat plan <ArrowRight size={16}/></Link>}</div> : <div className={s.rows}>{filtered.map((plan, index) => {
        const status = statusInfo(plan);
        return <article key={plan.id} className={`${s.row} ${selected?.id === plan.id ? s.selected : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
          <button className={s.rowSelect} onClick={() => { setSelectedId(plan.id); setNotice(null); }} aria-label={`Lihat detail ${plan.title}`} aria-pressed={selected?.id === plan.id}><ProjectIcon project={plan} className={s.planIcon}/><span className={s.planName}><strong>{plan.title}</strong><small>{plan.brief || `${plan.featureCount} fase · ${plan.stack.join(", ") || "Teknologi belum ditentukan"}`}</small></span></button>
          <div className={s.progressCell}><span>{plan.featureCount} fase · {plan.tasksDone} dari {plan.taskCount} tugas</span><div><progress aria-label={`Progres ${plan.title}`} value={plan.tasksDone} max={Math.max(1, plan.taskCount)}/><b>{percent(plan)}%</b></div></div>
          <time className={s.date} dateTime={plan.createdAt}>{dateLabel(plan.createdAt)}{plan.createdAt && Number.isFinite(Date.parse(plan.createdAt)) && <small>{new Date(plan.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</small>}</time>
          <span className={`${s.status} ${s[status.tone]}`}><i/>{status.label}</span>
          <div className={s.actions}>{preview ? <button onClick={() => { setSelectedId(plan.id); setInspectorTab("phases"); }}>Buka <ArrowUpRight size={15}/></button> : <Link href={`/project/${plan.id}`}>Buka <ArrowUpRight size={15}/></Link>}<DropdownMenu.Root><DropdownMenu.Trigger asChild><button className={s.more} aria-label={`Opsi ${plan.title}`}><MoreVertical size={19}/></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content data-motion={reducedMotion ? "reduced" : "system"} className={s.menu} align="end" sideOffset={7}><DropdownMenu.Item className={s.menuItem} onSelect={() => { setSelectedId(plan.id); setInspectorTab("notes"); }}>Catatan proyek</DropdownMenu.Item>{!preview && <DropdownMenu.Item className={`${s.menuItem} ${s.danger}`} onSelect={() => onDelete(plan)}><Trash2 size={15}/> Hapus proyek</DropdownMenu.Item>}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></div>
        </article>;
      })}</div>}
      <p className={s.resultCount}>{loading || error ? "" : `${filtered.length} dari ${plans.length} proyek`}</p>
    </div>
    <aside className={s.detail} aria-label="Detail proyek terpilih">{selected && !loading && !error ? <div key={selected.id} className={s.detailInner}>
      <header className={s.detailHeading}><ProjectIcon project={selected} className={s.detailIcon} size={29}/><div><h2>{selected.title}</h2><p>{selected.brief || detail?.brief || "Ringkasan plan yang dipilih"}</p></div></header>
      <div className={s.detailTabs} role="tablist" aria-label="Bagian detail proyek" onKeyDown={event => {
        const current = tabs.indexOf(inspectorTab), next = event.key === "ArrowRight" ? (current + 1) % tabs.length : event.key === "ArrowLeft" ? (current + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
        if (next < 0) return; event.preventDefault(); setInspectorTab(tabs[next]); (event.currentTarget.querySelectorAll("button")[next] as HTMLButtonElement).focus();
      }}>{tabs.map(item => <button key={item} id={`ledger-tab-${item}-${selected.id}`} role="tab" tabIndex={inspectorTab === item ? 0 : -1} aria-selected={inspectorTab === item} aria-controls={`ledger-panel-${selected.id}`} onClick={() => setInspectorTab(item)}>{item === "detail" ? "Detail" : item === "phases" ? "Fase & Tugas" : "Catatan"}</button>)}</div>
      <div className={s.inspectorPanel} role="tabpanel" id={`ledger-panel-${selected.id}`} aria-labelledby={`ledger-tab-${inspectorTab}-${selected.id}`} tabIndex={0}>
        {inspectorTab === "detail" && <><dl className={s.facts}><div><dt><SlidersHorizontal size={17}/> Status</dt><dd><span className={`${s.status} ${s[statusInfo(selected).tone]}`}><i/>{statusInfo(selected).label}</span></dd></div><div><dt><CalendarDays size={17}/> Dibuat</dt><dd>{dateLabel(selected.createdAt, true)}</dd></div><div><dt><RefreshCw size={17}/> Aktivitas terakhir</dt><dd>{dateLabel(detail?.lastActivityAt, true)}</dd></div><div><dt><UserRound size={17}/> Pemilik</dt><dd>{userName || userEmail || "Akun Anda"}</dd></div><div><dt><Tag size={17}/> Teknologi</dt><dd className={s.tags}>{selected.stack.length ? selected.stack.map(tag => <span key={tag}>{tag}</span>) : "Belum ditentukan"}</dd></div></dl>{detailState || (detail && <>
          <section className={s.phases} aria-label="Progres fase"><h3>Progres fase</h3><div className={s.progressSummary}><span>{detail.phases.filter(phase => phase.total > 0 && phase.done === phase.total).length} dari {detail.phases.length} fase selesai</span><strong>{percent(selected)}%</strong></div><progress className={s.overallProgress} aria-label="Progres tugas proyek terpilih" value={selected.tasksDone} max={Math.max(1, selected.taskCount)}/>{!detail.phases.length ? <p className={s.muted}>Fase belum tersedia. Plan masih disusun.</p> : <ol className={s.timeline}>{detail.phases.map((phase, index) => {
            const done = phase.total > 0 && phase.done === phase.total;
            return <li key={phase.slug}><button onClick={() => { setFocusedPhase(phase.slug); setInspectorTab("phases"); }} className={done ? s.phaseDone : phase.active > 0 ? s.phaseActive : s.phasePending} aria-label={`Lihat tugas fase ${phase.title}`}><span className={s.phaseNumber}>{done ? <Check size={17}/> : index + 1}</span><span className={s.phaseText}><strong>{phase.title}</strong>{done ? <small>Selesai</small> : <span className={s.phaseProgress}><small>{phase.done} dari {phase.total} tugas{phase.failed > 0 ? ` · ${phase.failed} gagal` : ""}</small><progress aria-label={`Progres fase ${phase.title}`} value={phase.done} max={Math.max(1, phase.total)}/><small>{phase.total ? Math.round(phase.done / phase.total * 100) : 0}%</small></span>}</span>{done && <ChevronRight size={15}/>}</button></li>;
          })}</ol>}</section><section className={s.nextTask}><h3><Sparkles size={17}/> Langkah berikutnya</h3>{detail.nextTask ? <button onClick={() => setInspectorTab("phases")}><span className={s.taskSquare}/><span>{detail.nextTask.title}<small>{detail.nextTask.status === "in_progress" ? "Sedang dikerjakan" : "Dependensi sudah selesai"}</small></span><ChevronRight size={16}/></button> : <p>{detail.blocked ? "Menunggu dependensi tugas selesai." : selected.taskCount > 0 && selected.tasksDone === selected.taskCount ? "Semua tugas selesai." : "Belum ada tugas yang siap."}</p>}</section>
        </>)}</>}
        {inspectorTab === "phases" && (detailState || (detail && <section className={s.taskList}><h3>Fase &amp; tugas <span>{selected.taskCount} tugas</span></h3>{detail.phases.length ? detail.phases.map(phase => <details key={phase.slug} open={focusedPhase === phase.slug || phase.active > 0 || undefined}><summary>{phase.title}<span>{phase.done}/{phase.total}</span><ChevronDown size={16}/></summary><ul>{phase.tasks.map(task => <li key={task.ref}><span className={task.status === "done" ? s.taskDone : s.taskSquare}>{task.status === "done" && <Check size={12}/>}</span><div><strong>{task.title}</strong><small>{task.ref} · {task.layer} · {task.status === "done" ? "Selesai" : task.status === "in_progress" ? "Dikerjakan" : task.status === "failed" ? "Gagal" : "Menunggu"}</small></div></li>)}</ul></details>) : <p>Belum ada fase atau tugas.</p>}</section>))}
        {inspectorTab === "notes" && (detailState || (detail && <form className={s.notes} onSubmit={event => { event.preventDefault(); void saveNotes(); }}><label htmlFor={`project-notes-${selected.id}`}>Catatan proyek</label><p>Catat keputusan dan hal yang perlu ditinjau kembali.</p><textarea id={`project-notes-${selected.id}`} rows={8} maxLength={3000} disabled={savingNotes} value={drafts[selected.id] ?? detail.notes} onChange={event => { setDrafts(previous => ({ ...previous, [selected.id]: event.target.value })); setNoteMessage(null); }} placeholder="Tulis catatan untuk proyek ini…"/><div><span>{(drafts[selected.id] ?? detail.notes).length}/3.000</span><button disabled={savingNotes || (drafts[selected.id] ?? detail.notes) === detail.notes}>{savingNotes ? "Menyimpan…" : "Simpan catatan"}</button></div>{noteMessage?.id === selected.id && <p role={noteMessage.error ? "alert" : "status"}>{noteMessage.text}</p>}{drafts[selected.id] !== undefined && drafts[selected.id] !== detail.notes && <p role="status">Ada catatan yang belum disimpan.</p>}</form>))}
      </div>
      <footer className={s.detailBottom}><button className={s.export} disabled={exporting} onClick={() => void exportPlan("zip")}>{exporting ? <Loader2 className={s.spin} size={18}/> : <Download size={18}/>} {exporting ? "Menyiapkan…" : "Ekspor plan"}<ArrowRight size={17}/></button><DropdownMenu.Root><DropdownMenu.Trigger asChild><button className={s.other}>Lainnya <ChevronDown size={16}/></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content data-motion={reducedMotion ? "reduced" : "system"} className={s.menu} align="end" sideOffset={7}><DropdownMenu.Item className={s.menuItem} disabled={exporting} onSelect={() => void exportPlan("md")}>Ekspor Markdown</DropdownMenu.Item><DropdownMenu.Item className={s.menuItem} disabled={exporting} onSelect={() => void exportPlan("json")}>Ekspor JSON</DropdownMenu.Item>{!preview && <><DropdownMenu.Item className={s.menuItem} asChild><Link href={`/project/${selected.id}`}>Buka proyek</Link></DropdownMenu.Item><DropdownMenu.Item className={`${s.menuItem} ${s.danger}`} onSelect={() => onDelete(selected)}><Trash2 size={15}/> Hapus proyek</DropdownMenu.Item></>}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>{notice && <p className={s.notice} role="status">{notice}</p>}</footer>
    </div> : <div className={s.detailEmpty}><FolderOpen size={28}/><p>Pilih proyek untuk melihat detailnya.</p></div>}</aside>
  </section>;
}
