"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ArrowRight, FolderOpen, CreditCard, Loader2 } from "lucide-react";
import s from "./profile-overview.module.css";
import { AccountBadges } from "@/components/account-badges";
import { effectiveAccountTier } from "@/lib/account-membership";

type Props = {
  user: { name: string; email: string; role?: string; tier?: string; proActive?: boolean; createdAt?: string | null };
  quota: { remaining: number; limit: number; unlimited?: boolean; resetAt?: string } | null;
  onSave: (name: string) => Promise<void>;
  onNavigate: (tab: "plans" | "billing") => void;
  preview?: boolean;
  reducedMotion?: boolean;
};

export function ProfileOverview({ user, quota, onSave, onNavigate, preview = false, reducedMotion = false }: Props) {
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = name.trim() !== user.name;
  const tier = effectiveAccountTier(user);
  const pro = tier === "pro";
  const unlimited = quota?.unlimited === true;
  const initials = (user.name || user.email).split(/\s+/).slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const remaining = quota ? Math.max(0, Math.min(quota.limit, quota.remaining)) : 0;
  const joined = user.createdAt ? new Date(user.createdAt) : null;
  return <div className={s.overview}>
    {preview && <div className={s.preview}>PREVIEW LOKAL <span>Data contoh · perubahan tidak menyentuh akun asli</span></div>}
    <header className={s.heading}><div><p className={s.eyebrow}>AKUN / PROFIL</p><h1>Ruang personal Anda.</h1><p>Identitas dan pemakaian, dalam satu tempat.</p></div><button className={s.quiet} onClick={() => onNavigate("plans")}>Lihat proyek <ArrowUpRight size={16} /></button></header>
    <div className={s.identity}><div className={s.avatar}>{initials}</div><div><h2>{user.name || "Developer"}</h2><p>{user.email}</p></div><span className={s.membershipSlot}><AccountBadges account={user} reducedMotion={reducedMotion}/></span></div>
    <div className={s.columns}>
      <section className={s.details} aria-labelledby="account-details"><div className={s.sectionTitle}><h2 id="account-details">Informasi akun</h2><p>Bagaimana Anda dikenali di Scratch Agent.</p></div>
        <form onSubmit={async e => {
          e.preventDefault();
          if (!name.trim() || !dirty || saving) return;
          setSaving(true); setSaved(false); setError("");
          try { await onSave(name.trim()); setName(name.trim()); setSaved(true); }
          catch (cause) { setError(cause instanceof Error ? cause.message : "Profil belum bisa disimpan. Coba lagi."); }
          finally { setSaving(false); }
        }}>
          <label htmlFor="profile-name">Nama tampilan</label><input id="profile-name" autoComplete="name" maxLength={80} disabled={saving} value={name} onChange={e => { setName(e.target.value); setSaved(false); setError(""); }} required aria-describedby="name-help" /><p id="name-help" className={s.help}>Gunakan nama yang ingin ditampilkan pada profil.</p>
          <label htmlFor="profile-email">Alamat email <span>Hanya baca</span></label><input id="profile-email" type="email" value={user.email} readOnly /><p className={s.help}>Email yang terhubung dengan akun Anda.</p>
          <div className={s.formFooter}><span role={error ? "alert" : "status"}>{error || (saving ? "Menyimpan profil…" : saved ? <><Check size={15} /> {preview ? "Tersimpan untuk preview ini" : "Profil berhasil disimpan"}</> : dirty ? "Ada perubahan yang belum disimpan" : "Tidak ada perubahan")}</span><div>{dirty && <button type="button" className={s.quiet} disabled={saving} onClick={() => { setName(user.name); setSaved(false); setError(""); }}>Batal</button>}<button type="submit" className={s.primary} disabled={saving || !dirty || !name.trim()}>{saving && <Loader2 size={14}/>} {saving ? "Menyimpan…" : "Simpan perubahan"}</button></div></div>
        </form>
        <div className={s.accountMeta}><span>Akun pribadi</span>{joined && !Number.isNaN(joined.getTime()) && <span>Bergabung {joined.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>}</div>
      </section>
      <aside className={s.rightRail}>
        <section className={s.usage} aria-labelledby="plan-title">
          <div className={s.usageTop}><span className={s.eyebrow}>PAKET SAAT INI</span><span className={s.dot} /></div>
          <h2 id="plan-title">{tier ? `Scratch ${pro ? "Pro" : "Free"}` : "Paket belum terverifikasi"}<span>{tier ? pro ? "Untuk alur kerja lebih luas." : "Dari ide ke rencana pertama." : "Status langganan belum tersedia."}</span></h2>
          <div className={s.quota}><span>Generate tersedia</span><strong>{unlimited ? "Tanpa batas" : quota ? <>{remaining}<small> / {quota.limit}</small></> : "…"}</strong></div>
          {quota && !unlimited && <progress aria-label="Kuota generate tersisa" value={remaining} max={Math.max(1, quota.limit)} />}
          <p className={s.help}>{!quota ? "Kuota belum tersedia." : unlimited ? user.role === "admin" && !pro ? "Akses admin bebas kuota generate harian." : "Paket Anda tidak memiliki batas generate." : quota.resetAt && !Number.isNaN(Date.parse(quota.resetAt)) ? `Reset ${new Date(quota.resetAt).toLocaleString("id-ID", {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}.` : "Kuota mengikuti periode pemakaian akun."}</p>
          <button type="button" onClick={() => onNavigate("billing")} className={s.planLink}>Kelola paket &amp; pemakaian <ArrowUpRight size={16}/></button>
        </section>
        <div className={s.shortcuts}><button onClick={() => onNavigate("plans")}><FolderOpen size={18}/><span>Proyek Anda<small>Lihat plan dan progres pengerjaan</small></span><ArrowRight size={16}/></button><button onClick={() => onNavigate("billing")}><CreditCard size={18}/><span>Billing &amp; pemakaian<small>Periksa paket dan kuota akun</small></span><ArrowRight size={16}/></button></div>
      </aside>
    </div>
    <footer className={s.footer}><span>Scratch Agent <span>/</span> Build with a plan.</span><Link href="/docs">Butuh bantuan? Buka dokumentasi <ArrowUpRight size={13}/></Link></footer>
  </div>;
}
