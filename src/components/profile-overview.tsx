"use client";
import { uiText as ui, useUiLanguage, uiLocale } from "@/lib/ui-text";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ArrowRight, FolderOpen, CreditCard, Loader2, Sprout, Layers, Code2, Orbit, Zap } from "lucide-react";
import { defaultProfile, type ProfileSettings } from "@/lib/account-preferences";
import panelStyles from "./account-panels.module.css";
import s from "./profile-overview.module.css";
import { AccountBadges } from "@/components/account-badges";
import { effectiveAccountTier } from "@/lib/account-membership";

type Props = {
  user: { name: string; email: string; role?: string; tier?: string; proActive?: boolean; createdAt?: string | null; emailVerified?: boolean };
  quota: { remaining: number; limit: number; unlimited?: boolean; resetAt?: string } | null;
  onSave: (name: string, profile: ProfileSettings) => Promise<void>;
  profileSettings?: ProfileSettings; settingsLoading?: boolean; settingsError?: string;
  onNavigate: (tab: "plans" | "billing") => void;
  preview?: boolean;
  reducedMotion?: boolean;
};

export function ProfileOverview({ user, quota, onSave, onNavigate, preview = false, reducedMotion = false, profileSettings = defaultProfile, settingsLoading = false, settingsError = "" }: Props) {
  useUiLanguage();
  const [profile, setProfile] = useState(profileSettings);
  useEffect(() => { setProfile(profileSettings); }, [profileSettings]);
  const AvatarIcon = { initials: null, sprout: Sprout, layers: Layers, code: Code2, orbit: Orbit, bolt: Zap }[profile.avatar];
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = name.trim() !== user.name || JSON.stringify(profile) !== JSON.stringify(profileSettings);
  const tier = effectiveAccountTier(user);
  const pro = tier === "pro" || tier === "max";
  const unlimited = quota?.unlimited === true;
  const initials = (user.name || user.email).split(/\s+/).slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const remaining = quota ? Math.max(0, Math.min(quota.limit, quota.remaining)) : 0;
  const joined = user.createdAt ? new Date(user.createdAt) : null;
  return <div className={s.overview}>
    {preview && <div className={s.preview}>{ui("PREVIEW LOKAL")}<span>{ui("Data contoh · perubahan tidak menyentuh akun asli")}</span></div>}
    <header className={s.heading}><div><p className={s.eyebrow}>{ui("AKUN / PROFIL")}</p><h1>{ui("Ruang personal Anda.")}</h1><p>{ui("Identitas dan pemakaian, dalam satu tempat.")}</p></div><button className={s.quiet} onClick={() => onNavigate("plans")}>{ui("Lihat proyek")}<ArrowUpRight size={16} /></button></header>
    <div className={s.identity}><div className={s.avatar}>{AvatarIcon ? <AvatarIcon size={28}/> : initials}</div><div><h2>{user.name || "Developer"}</h2><p>{user.email}</p></div><span className={s.membershipSlot}><AccountBadges account={user} reducedMotion={reducedMotion}/></span></div>
    <div className={s.columns}>
      <section className={s.details} aria-labelledby="account-details"><div className={s.sectionTitle}><h2 id="account-details">{ui("Informasi akun")}</h2><p>{ui("Bagaimana Anda dikenali di Scratch Agent.")}</p></div>
        <form onSubmit={async e => {
          e.preventDefault();
          if (!name.trim() || !dirty || saving) return;
          setSaving(true); setSaved(false); setError("");
          try { await onSave(name.trim(), profile); setName(name.trim()); setSaved(true); }
          catch (cause) { setError(cause instanceof Error ? cause.message : ui("Profil belum bisa disimpan. Coba lagi.")); }
          finally { setSaving(false); }
        }}>
          <div className={panelStyles.panel}><h3>{ui("Avatar akun")}</h3><p className={panelStyles.hint}>{ui("Pilih simbol personal dengan warna identitas ScratchAgent.")}</p><div className={panelStyles.avatarChoices}>{(["initials", "sprout", "layers", "code", "orbit", "bolt"] as const).map(key => { const Icon = { initials: null, sprout: Sprout, layers: Layers, code: Code2, orbit: Orbit, bolt: Zap }[key]; return <button type="button" key={key} aria-label={`Avatar ${key}`} aria-pressed={profile.avatar === key} disabled={saving || settingsLoading || !!settingsError} onClick={() => setProfile({ ...profile, avatar: key })}>{Icon ? <Icon size={20}/> : initials}</button>; })}</div></div>
          <label htmlFor="profile-name">{ui("Nama tampilan")}</label><input id="profile-name" autoComplete="name" maxLength={80} disabled={saving} value={name} onChange={e => { setName(e.target.value); setSaved(false); setError(""); }} required aria-describedby="name-help" /><p id="name-help" className={s.help}>{ui("Gunakan nama yang ingin ditampilkan pada profil.")}</p>
          <label htmlFor="profile-profession">{ui("Profesi")}<span>{ui("Opsional")}</span></label><input id="profile-profession" maxLength={120} disabled={saving || settingsLoading} value={profile.profession} onChange={event => setProfile({ ...profile, profession: event.target.value })} placeholder={ui("Founder, product manager, developer…")}/><label htmlFor="profile-company">{ui("Perusahaan")}<span>{ui("Opsional")}</span></label><input id="profile-company" autoComplete="organization" maxLength={120} disabled={saving || settingsLoading} value={profile.company} onChange={event => setProfile({ ...profile, company: event.target.value })} placeholder={ui("Nama perusahaan atau tim")}/>
          <label htmlFor="profile-email">{ui("Alamat email")}<span>{ui("Hanya baca")}</span></label><input id="profile-email" type="email" value={user.email} readOnly /><p className={s.help}>{ui("Email yang terhubung dengan akun Anda.")}{user.emailVerified === true ? ui("Terverifikasi.") : user.emailVerified === false ? ui("Belum terverifikasi.") : ui("Status verifikasi belum tersedia.")}</p>
          {settingsError && <p role="alert" className={s.help}>{settingsError}{ui("Muat ulang untuk mencoba lagi.")}</p>}
          <div className={s.formFooter}><span role={error ? "alert" : "status"}>{error || (saving ? ui("Menyimpan profil…") : saved ? <><Check size={15} /> {preview ? ui("Tersimpan untuk preview ini") : ui("Profil berhasil disimpan")}</> : dirty ? ui("Ada perubahan yang belum disimpan") : ui("Tidak ada perubahan"))}</span><div>{dirty && <button type="button" className={s.quiet} disabled={saving} onClick={() => { setName(user.name); setProfile(profileSettings); setSaved(false); setError(""); }}>{ui("Batal")}</button>}<button type="submit" className={s.primary} disabled={saving || settingsLoading || !!settingsError || !dirty || !name.trim()}>{saving && <Loader2 size={14}/>} {saving ? ui("Menyimpan…") : ui("Simpan perubahan")}</button></div></div>
        </form>
        <div className={s.accountMeta}><span>{ui("Akun pribadi")}</span>{joined && !Number.isNaN(joined.getTime()) && <span>{ui("Bergabung")} {joined.toLocaleDateString(uiLocale(), { month: "long", year: "numeric" })}</span>}</div>
      </section>
      <aside className={s.rightRail}>
        <section className={s.usage} aria-labelledby="plan-title">
          <div className={s.usageTop}><span className={s.eyebrow}>{ui("PAKET SAAT INI")}</span><span className={s.dot} /></div>
          <h2 id="plan-title">{tier ? `Scratch ${tier === "max" ? "Max" : pro ? "Pro" : ui("Free")}` : ui("Paket belum terverifikasi")}<span>{tier ? pro ? ui("Untuk alur kerja lebih luas.") : ui("Dari ide ke rencana pertama.") : ui("Status langganan belum tersedia.")}</span></h2>
          <div className={s.quota}><span>{ui("Generate tersedia")}</span><strong>{unlimited ? ui("Tanpa batas") : quota ? <>{remaining}<small> / {quota.limit}</small></> : "…"}</strong></div>
          {quota && !unlimited && <progress aria-label={ui("Kuota generate tersisa")} value={remaining} max={Math.max(1, quota.limit)} />}
          <p className={s.help}>{!quota ? ui("Kuota belum tersedia.") : unlimited ? user.role === "admin" && !pro ? ui("Akses admin bebas kuota generate harian.") : ui("Paket Anda tidak memiliki batas generate.") : quota.resetAt && !Number.isNaN(Date.parse(quota.resetAt)) ? `Reset ${new Date(quota.resetAt).toLocaleString(uiLocale(), {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}.` : ui("Kuota mengikuti periode pemakaian akun.")}</p>
          <button type="button" onClick={() => onNavigate("billing")} className={s.planLink}>{ui("Kelola paket &amp; pemakaian")}<ArrowUpRight size={16}/></button>
        </section>
        <div className={s.shortcuts}><button onClick={() => onNavigate("plans")}><FolderOpen size={18}/><span>{ui("Proyek Anda")}<small>{ui("Lihat plan dan progres pengerjaan")}</small></span><ArrowRight size={16}/></button><button onClick={() => onNavigate("billing")}><CreditCard size={18}/><span>{ui("Billing &amp; Pemakaian")}<small>{ui("Periksa paket dan kuota akun")}</small></span><ArrowRight size={16}/></button></div>
      </aside>
    </div>
    <footer className={s.footer}><span>Scratch Agent <span>/</span> Build with a plan.</span><Link href="/docs">{ui("Butuh bantuan? Buka dokumentasi")}<ArrowUpRight size={13}/></Link></footer>
  </div>;
}
