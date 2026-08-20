"use client";

import { motion, useReducedMotion } from "motion/react";
import { SignIn } from "@/components/ui/sign-in";
import { Shell } from "@/components/brand";
import { LoginBackdrop } from "@/components/login-backdrop";

export default function LoginPage() {
  const reduce = useReducedMotion();

  return (
    <Shell back="/" sidebar={false}>
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#050505] px-4 py-8">
        <LoginBackdrop />
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          <SignIn className="shadow-[0_20px_70px_rgba(0,0,0,.55)]" />
        </motion.div>
      </div>
    </Shell>
  );
}