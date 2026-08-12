"use client";

import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { AuthForm } from "@/components/ui/premium-auth";
import { Shell } from "@/components/brand";
import { LoginBackdrop } from "@/components/login-backdrop";

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  return (
    <Shell back="/" sidebar={false}>
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#050505] px-4 py-8">
        <LoginBackdrop />
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[420px] rounded-[14px] border border-white/[.12] bg-[#121212]/95 p-1 shadow-[0_20px_70px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl"
        >
          <div className="rounded-[10px] border border-white/[.05] bg-[#121212]">
            <AuthForm onSuccess={() => router.push("/new")} />
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}
