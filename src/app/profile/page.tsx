"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Shell } from "@/components/brand";
import { KeyRound, LogOut, Eye, EyeOff, FolderKanban, ShieldCheck, ArrowUpRight } from "lucide-react";
import { getCurrentUser, refreshCurrentUser, supabaseConfigured } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/client";

type User = { email: string; name: string; role?: string };
type PlanItem = { id: string; title: string; status: string; createdAt?: string; taskCount: number };

const statusDot: Record<string, string> = {
  generating: "bg-amber-400",
  ready: "bg-[#74FA6A]",
  implementing: "bg-blue-400",
  done: "bg-emerald-400",
};
const statusLabel: Record<string, string> = {
  generating: "menyusun",
  ready: "siap",
  implementing: "berjalan",
  done: "selesai",
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function ProfilePage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<PlanItem[] | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "success">("error");

  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => {
      if (!active) return;
      if (!u) {
        router.push("/login");
        return;
      }
      setUser({ email: u.email, name: u.name, role: u.role });
      fetch(`/api/plans/list?userId=${encodeURIComponent(u.email || "shared")}`)
        .then((r) => r.json())
        .then((d) => {
          if (active) setPlans(Array.isArray(d.plans) ? d.plans : []);
        })
        .catch(() => {
          if (active) setPlans([]);
        });
    });
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
              {plans === null ? "..." : `${plans.length} project`}
            </span>
          </div>
        </motion.section>

        {/* Plans */}
        <motion.section
          initial={enter}
          animate={visible}
          transition={{ duration: 0.5, ease, delay: reduce ? 0 : 0.04 }}
          className="mt-4 rounded-2xl border border-white/[.08] bg-[#101417] p-6"
        >
          <div>
            <h2 className="!m-0 !text-[15px] !font-semibold !leading-tight !tracking-[-.01em] text-white">Plan Kamu</h2>
            <p className="mt-1 text-[12.5px] leading-5 text-slate-500">Semua project yang pernah kamu buat.</p>
          </div>

          <div className="mt-4 space-y-2">
            {plans === null && (
              <p className="rounded-[10px] border border-white/[.06] bg-[#0C0E10] px-4 py-3 text-[12.5px] text-slate-500">Memuat plan…</p>
            )}
            {plans !== null && plans.length === 0 && (
              <p className="rounded-[10px] border border-white/[.06] bg-[#0C0E10] px-4 py-3 text-[12.5px] text-slate-500">
                Belum ada plan. Mulai dari <Link href="/new" className="text-[#74FA6A] underline-offset-2 hover:underline">buat plan baru</Link>.
              </p>
            )}
            {plans?.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                className="group flex items-center gap-3 rounded-[10px] border border-white/[.06] bg-[#0C0E10] px-4 py-3 transition hover:border-[#74FA6A]/40 hover:bg-[#0E1113]"
              >
                <span className={`size-2 shrink-0 rounded-full ${statusDot[p.status] ?? "bg-slate-500"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-white group-hover:text-[#74FA6A]">{p.title}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {statusLabel[p.status] ?? p.status} · {p.taskCount} task{p.createdAt ? ` · ${timeAgo(p.createdAt)}` : ""}
                  </span>
                </span>
                <ArrowUpRight size={14} className="shrink-0 text-slate-600 transition group-hover:text-[#74FA6A]" />
              </Link>
            ))}
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
