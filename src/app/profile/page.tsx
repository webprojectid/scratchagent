"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Shell } from "@/components/brand";
import { KeyRound, LogOut, Eye, EyeOff, FolderKanban, ShieldCheck } from "lucide-react";

type User = { email: string; name: string; role?: string };

export default function ProfilePage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [user, setUser] = useState<User | null>(null);
  const [planCount, setPlanCount] = useState<number | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "success">("error");

  useEffect(() => {
    const data = localStorage.getItem("scratch_user");
    if (!data) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(data) as User;
    const t = setTimeout(() => setUser(parsed), 0);

    fetch(`/api/plans/list?userId=${encodeURIComponent(parsed.email || "shared")}`)
      .then((r) => r.json())
      .then((d) => setPlanCount(Array.isArray(d.plans) ? d.plans.length : 0))
      .catch(() => setPlanCount(0));

    return () => clearTimeout(t);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("scratch_user");
    router.push("/login");
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

  const enter = reduce ? {} : { opacity: 0, y: 12 };
  const visible = reduce ? {} : { opacity: 1, y: 0 };
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <Shell back="/" sidebar={false}>
      <div className="mx-auto w-full max-w-[560px] px-5 py-12 md:py-16">
        {/* Identity */}
        <motion.section
          initial={enter}
          animate={visible}
          transition={{ duration: 0.5, ease }}
          className="rounded-2xl border border-white/[.08] bg-[#101417] p-6 shadow-[0_18px_60px_#0009,inset_0_1px_0_#FFFFFF08]"
        >
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#74FA6A]/25 bg-[#74FA6A]/[.08] text-[17px] font-semibold tracking-tight text-[#74FA6A]">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <h1 className="!m-0 truncate !text-[21px] !font-semibold !leading-tight !tracking-[-.02em] text-white">
                {user.name}
              </h1>
              <p className="mt-0.5 truncate text-[13px] text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[.06] pt-4">
            {user.role === "admin" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#74FA6A]/25 bg-[#74FA6A]/[.07] px-2.5 py-1 text-[11px] font-medium text-[#74FA6A]">
                <ShieldCheck size={13} /> Admin
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] bg-white/[.03] px-2.5 py-1 font-mono text-[11px] tabular-nums text-slate-300">
              <FolderKanban size={13} className="text-white/40" />
              {planCount === null ? "..." : `${planCount} project`}
            </span>
          </div>
        </motion.section>

        {/* Security */}
        <motion.section
          initial={enter}
          animate={visible}
          transition={{ duration: 0.5, ease, delay: reduce ? 0 : 0.06 }}
          className="mt-4 rounded-2xl border border-white/[.08] bg-[#101417] p-6"
        >
          <h2 className="!m-0 !text-[15px] !font-semibold !leading-tight !tracking-[-.01em] text-white">Keamanan</h2>
          <p className="mt-1 text-[12.5px] leading-5 text-slate-500">Ganti password akun kamu. Minimal 6 karakter.</p>

          <div className="mt-4">
            <label htmlFor="new-pass" className="mb-1.5 block text-[12px] font-medium text-slate-300">
              Password baru
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="new-pass"
                type={showPass ? "text" : "password"}
                placeholder="Tulis password baru"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full rounded-[10px] border border-white/10 bg-[#0C0E10] py-2.5 pl-10 pr-11 text-[13px] text-white placeholder:text-slate-600 focus:border-[#74FA6A]/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
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
              className="mt-4 w-full rounded-full bg-[#74FA6A] py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#67E85E] active:scale-[.985]"
            >
              Simpan password
            </button>
          </div>
        </motion.section>

        {/* Session */}
        <motion.section
          initial={enter}
          animate={visible}
          transition={{ duration: 0.5, ease, delay: reduce ? 0 : 0.12 }}
          className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-[#101417] p-6"
        >
          <div>
            <h2 className="!m-0 !text-[15px] !font-semibold !leading-tight !tracking-[-.01em] text-white">Sesi</h2>
            <p className="mt-1 text-[12.5px] leading-5 text-slate-500">Keluar dari akun di perangkat ini.</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-[12.5px] font-medium text-red-400 transition hover:border-red-500/60 hover:bg-red-500/[.06] active:scale-[.985]"
          >
            <LogOut size={14} /> Keluar
          </button>
        </motion.section>
      </div>
    </Shell>
  );
}
