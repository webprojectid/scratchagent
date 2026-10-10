"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, CheckCheck, FolderOpen, CalendarDays, Loader2 } from "lucide-react";
import { uiText as ui, useUiLanguage, uiLocale } from "@/lib/ui-text";
import { dashboardDays, type DashboardDay } from "@/lib/account-dashboard";
import s from "./profile-dashboard.module.css";
type Plan = { id: string; title: string; taskCount: number; tasksDone: number; tasksActive: number; tasksFailed: number; status: string };
export function ProfileDashboard({ email, name, plans, loading, error, preview, timezone, onProjects }: { email: string; name: string; plans: Plan[]; loading: boolean; error: boolean; preview: boolean; timezone: string; onProjects: () => void }) {
  useUiLanguage();
  const [days, setDays] = useState<DashboardDay[]>([]);
  const [busy, setBusy] = useState(true), [failed, setFailed] = useState(false), [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      setBusy(true); setFailed(false);
      try {
        if (preview) { setDays(dashboardDays([], timezone)); return; }
        const response = await fetch(`/api/account/dashboard?userId=${encodeURIComponent(email)}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) setDays(data.days);
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    });
    return () => controller.abort();
  }, [email, timezone, preview, revision]);
  const total = plans.reduce((sum, plan) => sum + plan.taskCount, 0);
  const done = plans.reduce((sum, plan) => sum + plan.tasksDone, 0);
  const active = plans.reduce((sum, plan) => sum + plan.tasksActive, 0);
  const blocked = plans.reduce((sum, plan) => sum + plan.tasksFailed, 0);
  const remaining = Math.max(0, total - done - active - blocked);
  const percentage = total ? Math.round(done / total * 100) : 0;
  const visits = days.reduce((sum, day) => sum + day.visits, 0);
  const activeDays = days.filter(day => day.visits > 0).length;
  const peak = Math.max(1, ...days.map(day => day.visits));
  const selectedDay = days.find(day => day.date === selected);
  const unavailable = loading || error;
  const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(uiLocale(), { month: "short", day: "numeric", timeZone: "UTC" });
  const visitsLabel = (count: number) => count === 1 ? ui("1 kunjungan") : ui("{0} kunjungan", count);
  const actionsLabel = (count: number) => count === 1 ? ui("1 aktivitas kerja") : ui("{0} aktivitas kerja", count);
  return <div className={s.dashboard}>
    <header className={s.header}><div><p className={s.eyebrow}>{ui("Profil / Dashboard")}</p><h1>{ui("Dashboard")}</h1><p>{ui("Progres kerja Anda, {0}.", name)}</p></div><button onClick={onProjects}>{ui("Lihat proyek")}<ArrowUpRight size={16}/></button></header>
    {preview && <p className={s.notice}>{ui("Preview: statistik proyek memakai data contoh. Kunjungan tidak direkayasa.")}</p>}
    {error && <p className={s.notice} role="alert">{ui("Progres proyek belum bisa dimuat.")} <button onClick={() => location.reload()}>{ui("Coba lagi")}</button></p>}
    <div className={s.metrics}>
      {[{ label: ui("Proyek"), value: plans.length, icon: FolderOpen, note: ui("Seluruh proyek akun") }, { label: ui("Tugas selesai"), value: done, icon: CheckCheck, note: ui("Dari {0} tugas", total) }, { label: ui("Progres keseluruhan"), value: `${percentage}%`, icon: Activity, note: ui("Berdasarkan tugas selesai") }, { label: ui("Hari aktif"), value: busy || failed ? "…" : activeDays, icon: CalendarDays, note: ui("Dalam 30 hari terakhir") }].map((metric, index) => <section key={metric.label} className={s.metric}><span><metric.icon size={17}/>{metric.label}</span><strong>{index < 3 && unavailable ? "…" : metric.value}</strong><small>{metric.note}</small></section>)}
    </div>
    <section className={s.calendar} aria-labelledby="activity-calendar">
      <div className={s.sectionHeader}><div><h2 id="activity-calendar">{ui("Aktivitas 30 hari")}</h2><p>{ui("Semakin pekat warnanya, semakin sering Anda berkunjung.")}</p></div><span>{busy || failed ? "…" : visitsLabel(visits)}</span></div>
      {busy ? <p className={s.notice} role="status"><Loader2 size={17} className="animate-spin"/>{ui("Memuat aktivitas…")}</p> : failed ? <p className={s.notice} role="alert">{ui("Aktivitas belum bisa dimuat.")} <button onClick={() => setRevision(value => value + 1)}>{ui("Coba lagi")}</button></p> : <>
        <div className={s.heatmap}>{days.map(day => {
          const level = day.visits ? Math.min(4, Math.ceil(day.visits / peak * 4)) : 0;
          const label = `${dateLabel(day.date)}: ${visitsLabel(day.visits)}, ${actionsLabel(day.actions)}`;
          return <button key={day.date} data-level={level} aria-label={label} title={label} aria-pressed={day.date === selected} onClick={() => setSelected(day.date)}><span>{Number(day.date.slice(-2))}</span></button>;
        })}</div>
        <div className={s.calendarFooter}><span>{selectedDay ? `${dateLabel(selectedDay.date)} · ${visitsLabel(selectedDay.visits)} · ${actionsLabel(selectedDay.actions)}` : ui("Pilih tanggal untuk melihat aktivitas.")}</span><div aria-label={ui("Intensitas kunjungan")}>{ui("Jarang")}{[0, 1, 2, 3, 4].map(level => <i key={level} data-level={level}/>)}{ui("Sering")}</div></div>
        <p className={s.footnote}>{ui("Kunjungan akun tercatat mulai pembaruan ini, maksimal sekali per 30 menit saat website terlihat. Hari kosong berarti belum ada kunjungan tercatat.")}</p>
      </>}
    </section>
    <div className={s.charts}>
      <section className={s.chart}><div className={s.sectionHeader}><div><h2>{ui("Ritme kunjungan")}</h2><p>{ui("Kunjungan per hari, 30 hari terakhir")}</p></div></div>{busy || failed ? <p className={s.notice}>{busy ? ui("Memuat aktivitas…") : ui("Aktivitas belum bisa dimuat.")}</p> : <><svg className={s.visitChart} viewBox="0 0 600 150" role="img" aria-label={ui("Grafik kunjungan harian")}><line x1="0" y1="128" x2="600" y2="128" stroke="#343d40"/>{days.map((day, index) => <rect key={day.date} x={index * 20 + 3} y={128 - day.visits / peak * 110} width="13" height={day.visits / peak * 110} rx="2" fill="var(--primary)"><title>{dateLabel(day.date)}: {day.visits}</title></rect>)}</svg><div className={s.axis}><span>{days[0] && dateLabel(days[0].date)}</span><span>{visits === 0 ? ui("Belum ada kunjungan tercatat") : ui("Puncak: {0} per hari", peak)}</span><span>{days[29] && dateLabel(days[29].date)}</span></div></>}</section>
      <section className={s.chart}><div className={s.sectionHeader}><div><h2>{ui("Distribusi tugas")}</h2><p>{ui("Status pekerjaan saat ini")}</p></div></div>{unavailable ? <p className={s.notice}>{ui("Progres proyek belum tersedia.")}</p> : <><div className={s.completion}><strong>{percentage}<small>%</small></strong><span>{ui("selesai")}</span></div><div className={s.distribution}>{[{ label: ui("Selesai"), count: done }, { label: ui("Dikerjakan"), count: active }, { label: ui("Terhambat"), count: blocked }, { label: ui("Belum dimulai"), count: remaining }].map(item => <div key={item.label}><span>{item.label}</span><progress aria-label={item.label} value={item.count} max={Math.max(1, total)}/><strong>{item.count}</strong></div>)}</div></>}</section>
    </div>
    <section className={s.chart}><div className={s.sectionHeader}><div><h2>{ui("Progres per proyek")}</h2><p>{ui("Proyek dengan pekerjaan tersisa ditampilkan lebih dulu.")}</p></div><button onClick={onProjects}>{ui("Semua proyek")}<ArrowUpRight size={15}/></button></div>{unavailable ? <p className={s.notice}>{ui("Progres proyek belum tersedia.")}</p> : !plans.length ? <p className={s.notice}>{ui("Buat proyek pertama untuk melihat progres di sini.")}</p> : <div className={s.projects}>{[...plans].sort((a, b) => (b.taskCount - b.tasksDone) - (a.taskCount - a.tasksDone)).slice(0, 6).map(plan => <Link href={preview ? "/profile?tab=plans&preview=1" : `/project/${plan.id}`} key={plan.id}><span>{plan.title}<small>{ui("{0} dari {1} tugas selesai", plan.tasksDone, plan.taskCount)}</small></span><progress aria-label={plan.title} value={plan.tasksDone} max={Math.max(1, plan.taskCount)}/><strong>{plan.taskCount ? Math.round(plan.tasksDone / plan.taskCount * 100) : 0}%</strong><ArrowUpRight size={15}/></Link>)}</div>}</section>
  </div>;
}
