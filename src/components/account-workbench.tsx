"use client";
import { uiText as ui, useUiLanguage } from "@/lib/ui-text";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import s from "./account-workbench.module.css";

export function AccountWorkbench({ active, title, description, preview = false, admin = false, embedded = false, children }: {
  active: "settings" | "users" | "security"; title: string; description: string;
  preview?: boolean; admin?: boolean; embedded?: boolean; children: ReactNode;
}) {
  useUiLanguage();
  if (embedded) return <>{children}</>;
  const href = (path: string) => preview ? `/preview${path}` : path;
  return <div className={s.page}><div className={s.frame}>
    <nav className={s.nav} aria-label={ui("Navigasi akun")}>
      <p>WORKSPACE</p>
      <Link href={href("/profile")}>{ui("Profil")}</Link>
      <Link href={href("/settings")} aria-current={active === "settings" ? "page" : undefined}>{ui("Pengaturan")}</Link>
      {admin && <Link href="/developer-settings">Developer Setting</Link>}
      <Link className={s.docs} href="/docs">{ui("Dokumentasi")}<ArrowUpRight size={14}/></Link>
    </nav>
    <div className={s.content}>
      {preview && <div className={s.preview}><strong>{ui("PREVIEW LOKAL")}</strong>{ui("Data contoh · semua aksi disimulasikan, tanpa perubahan ke server.")}</div>}
      <header className={s.header}><p>{active === "settings" ? "AKUN / PENGATURAN" : `ADMIN / ${active === "users" ? ui("PENGGUNA") : ui("KEAMANAN")}`}</p><h1>{title}</h1><div>{description}</div></header>
      <div className={s.body}>{children}</div>
      <footer className={s.footer}><span>Scratch Agent / Workspace</span><span>{preview ? ui("Lingkungan preview") : ui("Akses sesuai izin akun")}</span></footer>
    </div>
  </div></div>;
}
