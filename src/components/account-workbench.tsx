import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import s from "./account-workbench.module.css";

export function AccountWorkbench({ active, title, description, preview = false, admin = false, children }: {
  active: "settings" | "users" | "security"; title: string; description: string;
  preview?: boolean; admin?: boolean; children: ReactNode;
}) {
  const href = (path: string) => preview ? `/preview${path}` : path;
  return <div className={s.page}><div className={s.frame}>
    <nav className={s.nav} aria-label="Navigasi akun">
      <p>WORKSPACE</p>
      <Link href={href("/profile")}>Profil</Link>
      <Link href={href("/settings")} aria-current={active === "settings" ? "page" : undefined}>Pengaturan</Link>
      {admin && <><p>ADMINISTRASI</p><Link href={href("/admin/users")} aria-current={active === "users" ? "page" : undefined}>Pengguna</Link><Link href={href("/admin/security")} aria-current={active === "security" ? "page" : undefined}>Keamanan</Link></>}
      <Link className={s.docs} href="/docs">Dokumentasi <ArrowUpRight size={14}/></Link>
    </nav>
    <div className={s.content}>
      {preview && <div className={s.preview}><strong>PREVIEW LOKAL</strong> Data contoh · semua aksi disimulasikan, tanpa perubahan ke server.</div>}
      <header className={s.header}><p>{active === "settings" ? "AKUN / PENGATURAN" : `ADMIN / ${active === "users" ? "PENGGUNA" : "KEAMANAN"}`}</p><h1>{title}</h1><div>{description}</div></header>
      <div className={s.body}>{children}</div>
      <footer className={s.footer}><span>Scratch Agent / Workspace</span><span>{preview ? "Lingkungan preview" : "Akses sesuai izin akun"}</span></footer>
    </div>
  </div></div>;
}
