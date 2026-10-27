"use client";

import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Shield } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import styles from "./auth-change-password.module.css";

export interface AuthChangePasswordProps {
  onSubmit: (data: { newPassword: string }) => Promise<boolean>;
  className?: string;
  isLoading?: boolean;
  isSuccess?: boolean;
  error?: string;
  language?: "en" | "id";
  successAction?: ReactNode;
  footer?: ReactNode;
}

export default function AuthChangePassword({
  onSubmit, className, isLoading = false, isSuccess = false,
  error, language = "en", successAction, footer,
}: AuthChangePasswordProps) {
  const en = language === "en";
  const uid = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState({ password: false, confirm: false });
  const [mismatch, setMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const busy = isLoading || submitting;

  return <Card className={cn(styles.card, className)}>
    <CardHeader className={styles.header}>
      <h1 className={styles.title}>{isSuccess
        ? (en ? "Password changed" : "Password berhasil diubah")
        : (en ? "Choose a new password" : "Buat password baru")}</h1>
      <p className={styles.description}>{isSuccess
        ? (en ? "Your password has been updated." : "Password Anda sudah diperbarui.")
        : (en ? "Set a new password for your ScratchAgent account." : "Buat password baru untuk akun ScratchAgent Anda.")}</p>
    </CardHeader>
    <CardContent className={styles.content}>
      {isSuccess ? <div className={styles.success} role="status">
        <CheckCircle2 size={36} aria-hidden="true"/>
        <p>{en ? "Sign in with your new password." : "Login dengan password baru Anda."}</p>
        {successAction}
      </div> : <form className={styles.form} aria-busy={busy} onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        if (password !== confirm) { setMismatch(true); return; }
        setMismatch(false);
        setSubmitting(true);
        try {
          if (await onSubmit({ newPassword: password })) { setPassword(""); setConfirm(""); }
        } finally { setSubmitting(false); }
      }}>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {(["password", "confirm"] as const).map(field => {
          const isConfirm = field === "confirm";
          const label = isConfirm ? (en ? "Confirm new password" : "Konfirmasi password baru") : (en ? "New password" : "Password baru");
          const inputId = `${uid}-${field}`;
          const errorId = mismatch && isConfirm ? `${inputId}-error` : undefined;
          const hintId = !isConfirm ? `${inputId}-hint` : undefined;
          const Icon = isConfirm ? Lock : Shield;
          return <div key={field} className={styles.field}>
            <label htmlFor={inputId}>{label}</label>
            <div className={styles.inputGroup} data-invalid={!!errorId || undefined}>
              <Icon size={18} aria-hidden="true" className={styles.fieldIcon}/>
              <input id={inputId} name={isConfirm ? "confirmPassword" : "newPassword"}
                type={visible[field] ? "text" : "password"} autoComplete="new-password"
                required minLength={8} maxLength={128} disabled={busy}
                value={isConfirm ? confirm : password} aria-invalid={!!errorId}
                aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
                onChange={event => {
                  if (isConfirm) setConfirm(event.target.value); else setPassword(event.target.value);
                  setMismatch(false);
                }}
              />
              <button type="button" className={styles.toggle} disabled={busy}
                aria-label={en ? `${visible[field] ? "Hide" : "Show"} ${label.toLowerCase()}` : `${visible[field] ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`}
                aria-pressed={visible[field]}
                onClick={() => setVisible(previous => ({ ...previous, [field]: !previous[field] }))}
              >{visible[field] ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}</button>
            </div>
            {hintId && <p id={hintId} className={styles.hint}>{en ? "Use 8–128 characters." : "Gunakan 8–128 karakter."}</p>}
            {errorId && <p id={errorId} role="alert" className={styles.error}>{en ? "Passwords do not match." : "Password tidak sama."}</p>}
          </div>;
        })}
        <Button type="submit" disabled={busy} aria-busy={busy} className={styles.submit}>
          {busy ? <Loader2 size={18} aria-hidden="true" className={styles.spinner}/> : <Shield size={18} aria-hidden="true"/>}
          {busy ? (en ? "Updating password…" : "Menyimpan password…") : (en ? "Update password" : "Simpan password")}
        </Button>
        {footer}
      </form>}
    </CardContent>
  </Card>;
}
