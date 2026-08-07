"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/brand";
import { User, Settings, Key, LogOut, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string; role?: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const data = localStorage.getItem("scratch_user");
    if (!data) { router.push("/login"); return; }
    setUser(JSON.parse(data));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("scratch_user");
    router.push("/login");
  };

  const handleChangePass = () => {
    if (!user || newPass.length < 6) {
      setMsg("Password minimal 6 karakter");
      return;
    }
    const storedUsers = JSON.parse(localStorage.getItem("scratch_users") || "{}");
    const userKey = user.email.toLowerCase();
    if (storedUsers[userKey]) {
      storedUsers[userKey].password = newPass;
      localStorage.setItem("scratch_users", JSON.stringify(storedUsers));
      setMsg("Password berhasil diubah");
      setNewPass("");
      setTimeout(() => setMsg(""), 3000);
    }
  };

  if (!user) return null;

  return (
    <Shell back="/">
      <div className="mx-auto max-w-lg px-5 py-16">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={12} /> Kembali
        </button>

        <div className="rounded-[24px] border border-white/10 bg-[#101417] p-1 shadow-[0_28px_90px_#000A]">
          <div className="rounded-[calc(24px-4px)] border border-white/[.06] bg-[#141A22] p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="grid size-14 place-items-center rounded-full bg-[#74FA6A]/10 text-[#74FA6A]">
                <User size={24} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">{user.name}</h1>
                <p className="text-xs text-slate-400">{user.email}</p>
                {user.role === "admin" && (
                  <span className="mt-1 inline-block rounded bg-[#74FA6A]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#74FA6A]">Admin</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => setShowSettings(!showSettings)}
                className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-xs text-slate-400 transition hover:border-[#74FA6A]/40 hover:text-white">
                <Settings size={14} /> Pengaturan
              </button>

              {showSettings && (
                <div className="space-y-2 rounded-lg border border-white/[.06] bg-[#0C0E10] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/30">Ganti Password</p>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Password baru (min 6 karakter)"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-9 text-xs text-white placeholder:text-slate-500 focus:border-[#74FA6A]/40 focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                  <button onClick={handleChangePass}
                    className="w-full rounded-lg bg-[#74FA6A]/10 py-2 text-[10px] font-semibold text-[#74FA6A] transition hover:bg-[#74FA6A]/20">
                    Simpan Password
                  </button>
                  {msg && <p className="text-center text-[10px] text-[#74FA6A]">{msg}</p>}
                </div>
              )}

              <button onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg border border-red-500/20 px-4 py-3 text-xs text-red-400 transition hover:border-red-500/40 hover:bg-red-500/5">
                <LogOut size={14} /> Keluar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}