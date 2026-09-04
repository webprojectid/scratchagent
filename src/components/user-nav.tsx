"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, Settings, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser, refreshCurrentUser, supabaseConfigured, type CurrentUser } from "@/lib/current-user";

export function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let active = true;
    const sync = () => {
      getCurrentUser().then((u) => {
        if (active) setUser(u);
      });
    };
    sync();

    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("scratch_user");
    refreshCurrentUser();
    if (supabaseConfigured()) {
      createClient()
        .auth.signOut()
        .catch(() => {})
        .finally(() => {
          setUser(null);
          router.push("/login");
        });
    } else {
      setUser(null);
      router.push("/login");
    }
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="font-mono text-[12px] tracking-[0.02em] text-white/80 transition-colors hover:text-[#74FA6A]"
      >
        Masuk
      </Link>
    );
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAdmin = user.role === "admin" || user.email === "teguhends@gmail.com" || user.email?.startsWith("admin");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Menu Akun"
          className="group relative flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/[.06] text-white/80 transition hover:border-[#74FA6A]/50 hover:bg-[#74FA6A]/10 hover:text-white focus:outline-none"
        >
          {initials ? (
            <span className="font-mono text-[11px] font-bold text-[#74FA6A]">{initials}</span>
          ) : (
            <User size={15} />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-[#1D2223] bg-[#74FA6A]" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#121517] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
        >
          <div className="border-b border-white/[.08] px-2.5 py-2">
            <p className="truncate text-[12.5px] font-semibold text-white">{user.name}</p>
            <p className="truncate font-mono text-[10.5px] text-white/40">{user.email}</p>
          </div>

          <div className="py-1">
            <DropdownMenu.Item asChild>
              <Link
                href="/profile"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-white/80 outline-none transition hover:bg-white/[.07] hover:text-[#74FA6A]"
              >
                <User size={14} className="text-white/40" />
                <span>Profile</span>
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/profile"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-white/80 outline-none transition hover:bg-white/[.07] hover:text-[#74FA6A]"
              >
                <Settings size={14} className="text-white/40" />
                <span>Setting</span>
              </Link>
            </DropdownMenu.Item>

            {isAdmin && (
              <DropdownMenu.Item asChild>
                <Link
                  href="/admin/users"
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-white/80 outline-none transition hover:bg-white/[.07] hover:text-[#74FA6A]"
                >
                  <ShieldCheck size={14} className="text-[#74FA6A]" />
                  <span>Developer Setting</span>
                </Link>
              </DropdownMenu.Item>
            )}
          </div>

          <DropdownMenu.Separator className="h-px bg-white/[.08]" />

          <DropdownMenu.Item
            onSelect={handleLogout}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-red-400 outline-none transition hover:bg-red-500/10 focus:bg-red-500/10"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
