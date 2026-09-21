"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ArrowRight, Terminal, Shield } from "lucide-react";
import s from "./profile-overview.module.css";

type Props = {
  user: { name: string; email: string; tier?: string; createdAt?: string | null };
  quota: { remaining: number; limit: number; unlimited?: boolean; resetAt?: string } | null;
  onSave: (name: string) => void;
  onNavigate: (tab: "plans" | "security" | "settings") => void;
  preview?: boolean;
};

export function ProfileOverview({ user, quota, onSave, onNavigate, preview = false }: Props) {
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const dirty = name.trim() !== user.name;
  const pro = user.tier === "pro";
  const unlimited = quota?.unlimited === true;
  const initials = (user.name || user.email).split(/\s+/).slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const remaining = quota ? Math.max(0, Math.min(quota.limit, quota.remaining)) : 0;
  const joined = user.createdAt ? new Date(user.createdAt) : null;
  return <div className={s.overview}>
    {preview && <div className={s.preview}>PREVIEW LOKAL <span>Data contoh · perubahan tidak menyentuh akun asli</span></div>}
    <header className={s.heading}><div><p className={s.eyebrow}>AKUN / PROFIL</p><h1>Ruang personal Anda.</h1><p>Identitas dan pemakaian, dalam satu tempat.</p></div><button className={s.quiet} onClick={() => onNavigate("plans")}>Lihat project <ArrowUpRight size={16} /></button></header>
    <div className={s.identity}><div className={s.avatar}>{initials}</div><div><h2>{user.name || "Developer"}</h2><p>{user.email}</p></div><span className={s.badge}>{pro ? "Scratch Pro" : "Scratch Free"}</span></div>
    <div className={s.columns}>
      <section className={s.details} aria-labelledby="account-details"><div className={s.sectionTitle}><h2 id="account-details">Informasi akun</h2><p>Bagaimana Anda dikenali di Scratch Agent.</p></div>
        <form onSubmit={e => { e.preventDefault(); if (!name.trim() || !dirty) return; onSave(name.trim()); setName(name.trim()); setSaved(true); }}>
          <label htmlFor="profile-name">Nama tampilan</label><input id="profile-name" autoComplete="name" maxLength={80} value={name} onChange={e => { setName(e.target.value); setSaved(false); }} required aria-describedby="name-help" /><p id="name-help" className={s.help}>Gunakan nama yang ingin ditampilkan pada profil.</p>
          <label htmlFor="profile-email">Alamat email <span>Hanya baca</span></label><input id="profile-email" type="email" value={user.email} readOnly /><p className={s.help}>Email yang terhubung dengan akun Anda.</p>
          <div className={s.formFooter}><span role="status">{saved ? <><Check size={15} /> {preview ? "Tersimpan untuk preview ini" : "Nama diperbarui di sesi ini"}</> : dirty ? "Ada perubahan yang belum disimpan" : "Tidak ada perubahan"}</span><div>{dirty && <button type="button" className={s.quiet} onClick={() => { setName(user.name); setSaved(false); }}>Batal</button>}<button type="submit" className={s.primary} disabled={!dirty || !name.trim()}>Simpan perubahan</button></div></div>
        </form>
        <div className={s.accountMeta}><span>Akun pribadi</span>{joined && !Number.isNaN(joined.getTime()) && <span>Bergabung {joined.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</span>}</div>
      </section>
      <aside className={s.rightRail}>
        <section className={s.usage} aria-labelledby="plan-title"><div className={s.usageTop}><span className={s.eyebrow}>PAKET SAAT INI</span><span className={s.dot} /></div><h2 id="plan-title">Scratch {pro ? "Pro" : "Free"}<span>{pro ? "Untuk alur kerja lebih luas." : "Dari ide ke rencana pertama."}</span></h2><div className={s.quota}><span>Generate tersedia</span><strong>{unlimited ? "Tanpa batas" : quota ? <>{remaining}<small> / {quota.limit}</small></> : "—"}</strong></div>{quota && !unlimited && <progress aria-label="Kuota generate tersisa" value={remaining} max={Math.max(1, quota.limit)} /> }<p className={s.help}>{!quota ? "Kuota belum tersedia." : unlimited ? "Paket Anda tidak memiliki batas generate." : quota.resetAt && !Number.isNaN(Date.parse(quota.resetAt)) ? `Reset ${new Date(quota.resetAt).toLocaleString("id-ID", {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}.` : "Kuota mengikuti periode pemakaian akun."}</p><Link href="/pricing" className={s.planLink}>Lihat pilihan paket <ArrowUpRight size={16}/></Link></section>
        <div className={s.shortcuts}><button onClick={() => onNavigate("security")}><Shield size={18}/><span>Keamanan akun<small>Kelola password Anda</small></span><ArrowRight size={16}/></button><button onClick={() => onNavigate("settings")}><Terminal size={18}/><span>Hubungkan CLI<small>Kelola token untuk agent</small></span><ArrowRight size={16}/></button></div>
      </aside>
    </div>
    <footer className={s.footer}><span>Scratch Agent <span>/</span> Build with a plan.</span><Link href="/docs">Butuh bantuan? Buka dokumentasi <ArrowUpRight size={13}/></Link></footer>
  </div>;
}
