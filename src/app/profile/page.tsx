"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Shell } from "@/components/brand";
import { KeyRound, LogOut, Eye, EyeOff, Plus, Settings2, ShieldCheck, Crown } from "lucide-react";
import { getCurrentUser, refreshCurrentUser, supabaseConfigured } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/client";

type User = { email: string; name: string; role?: string; tier?: string };

function SectionTitle({ children }: { children: string }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-white/35">{children}</p>;
}

export default function ProfilePage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [user, setUser] = useState<User | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "success">("error");

  useEffect(() => {
    let active = true;
    // Semua fetch ditembak paralel, bukan berantai. Sebelumnya tombol
    // Settings / Developer setting menunggu getCurrentUser() selesai dulu,
    // baru /api/me dipanggil, sehingga terasa lambat. Session cookie
    // Supabase sudah ikut di setiap fetch, jadi keduanya bisa jalan bareng.

    getCurrentUser().then((u) => {
      if (!active) return;
      if (!u) {
        router.push("/login");
        return;
      }
      setUser((prev) => ({ email: u.email, name: u.name, role: prev?.role, tier: prev?.tier }));
    });

    // Role admin + tier langganan berasal dari server (/api/me),
    // supaya tag Admin dan menu Developer setting akurat.
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        setUser((prev) =>
          prev
            ? { ...prev, email: prev.email || d.email || prev.email, role: d.role ?? prev.role, tier: d.tier ?? prev.tier }
            : { email: d.email ?? "", name: (d.email ?? "").split("@")[0] || "user", role: d.role, tier: d.tier },
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("scratch_user");
    refreshCurrentUser();
    if (supabaseConfigured()) {
      createClient()
        .auth.signOut()
        .catch(() => {})
        .finally(() => router.push("/login"));
    } else {
      router.push("/login");
    }
  };

  const handleChangePass = () => {
    if (!user) return;
    if (newPass.length < 6) {
      setMsg("Password minimal 6 karakter.");
      setMsgType("error");
      return;
    }
    const storedUsers = JSON.parse(localStorage.getItem("scratch_users") || "{}");
    const userKey = user.email.toLowerCase();
    if (storedUsers[userKey]) {
      storedUsers[userKey].password = newPass;
      localStorage.setItem("scratch_users", JSON.stringify(storedUsers));
      setMsg("Password berhasil diubah.");
      setMsgType("success");
      setNewPass("");
      setTimeout(() => setMsg(""), 3000);
    } else {
      setMsg("Akun tidak terdaftar, password tidak bisa disimpan.");
      setMsgType("error");
    }
  };

  if (!user) return null;

  const initials = (user.name || user.email || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const enter = reduce ? {} : { opacity: 0, y: 8 };
  const visible = reduce ? {} : { opacity: 1, y: 0 };
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <Shell back="/" sidebar={false}>
      <div className="mx-auto w-full max-w-[1080px] px-5 pb-12 pt-14 md:pt-16">
        {/* Identitas */}
        <motion.section
          initial={enter}
          animate={visible}
          transition={{ duration: 0.25, ease }}
          className="flex flex-wrap items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-[18px] border border-[#74FA6A]/25 bg-[#74FA6A]/[.08] text-[19px] font-semibold tracking-tight text-[#74FA6A]">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-.02em] text-white">{user.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[#8C97A5]">
                <span className="truncate">{user.email}</span>
                {user.role === "admin" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#74FA6A]/30 bg-[#74FA6A]/[.08] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#74FA6A]">admin</span>
                )}
                {user.tier === "pro" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#74FA6A] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-black">
                    <Crown size={11} /> Pro Eksklusif
                  </span>
                )}
                {user.tier === "free" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[.05] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-white/45">free</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/new" className="inline-flex items-center gap-1.5 rounded-full bg-[#74FA6A] px-4 py-2 text-[12.5px] font-semibold text-black transition hover:bg-[#A8FF9B] active:scale-[.985]">
              <Plus size={14} /> Buat plan baru
            </Link>
            {user.role === "admin" && (
              <>
                <Link href="/settings" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[12.5px] font-medium text-white/80 transition hover:border-[#74FA6A]/50 hover:text-[#74FA6A]" title="Konfigurasi LLM dan pengaturan server">
                  <Settings2 size={14} /> Settings
                </Link>
                <Link href="/admin/users" className="inline-flex items-center gap-1.5 rounded-full border border-[#74FA6A]/40 bg-[#74FA6A]/[.08] px-4 py-2 text-[12.5px] font-semibold text-[#74FA6A] transition hover:bg-[#74FA6A]/[.14] active:scale-[.985]" title="Kelola akun: akses Pro, banned, dan catatan pemakaian">
                  <ShieldCheck size={14} /> Developer setting
                </Link>
              </>
            )}
          </div>
        </motion.section>

        {/* Konten utama: keamanan & sesi */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
            {/* Keamanan */}
            <motion.section
              initial={enter}
              animate={visible}
              transition={{ duration: 0.5, ease, delay: reduce ? 0 : 0.13 }}
              className="rounded-[16px] border border-white/[.08] bg-[#101417] p-6"
            >
              <SectionTitle>keamanan</SectionTitle>
              <p className="mt-2 text-[12.5px] leading-5 text-[#8C97A5]">Ganti password akun kamu. Minimal 6 karakter.</p>

              <div className="mt-4">
                <label htmlFor="new-pass" className="mb-1.5 block font-mono text-[10.5px] font-bold uppercase tracking-[.14em] text-white/40">
                  password baru
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    id="new-pass"
                    type={showPass ? "text" : "password"}
                    placeholder="Tulis password baru"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full rounded-[10px] border border-white/10 bg-[#0C0E10] py-2.5 pl-10 pr-11 text-[13px] text-white placeholder:text-white/25 focus:border-[#74FA6A]/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white"
                    aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {msg && (
                  <p className={`mt-2 text-[12px] ${msgType === "error" ? "text-red-400" : "text-[#74FA6A]"}`}>{msg}</p>
                )}

                <button
                  onClick={handleChangePass}
                  className="mt-4 w-full rounded-full bg-[#74FA6A] py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#A8FF9B] active:scale-[.985]"
                >
                  Simpan password
                </button>
              </div>
            </motion.section>

            {/* Sesi */}
            <motion.section
              initial={enter}
              animate={visible}
              transition={{ duration: 0.5, ease, delay: reduce ? 0 : 0.17 }}
              className="rounded-[16px] border border-white/[.08] bg-[#101417] p-6"
            >
              <SectionTitle>sesi</SectionTitle>
              <p className="mt-2 text-[12.5px] leading-5 text-[#8C97A5]">Keluar dari akun di perangkat ini. Semua plan kamu tetap tersimpan.</p>
              <button
                onClick={handleLogout}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-[12.5px] font-medium text-red-400 transition hover:border-red-500/60 hover:bg-red-500/[.06] active:scale-[.985]"
              >
                <LogOut size={14} /> Keluar
              </button>
            </motion.section>
        </div>
      </div>
    </Shell>
  );
}
