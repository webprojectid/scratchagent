"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useMotionTemplate } from "framer-motion";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, ArrowLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/lang";
import { createClient } from "@/lib/supabase/client";
import { refreshCurrentUser, supabaseConfigured } from "@/lib/current-user";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

type Mode = "signin" | "signup";

export function SignInCard2() {
  const router = useRouter();
  const lang = useLang();
  const en = lang === "en";

  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [focusedInput, setFocusedInput] = useState<"email" | "password" | "name" | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Efek 3D card: rotasi mengikuti kursor, dibungkus useSpring supaya card
  // meluncur halus (tidak loncat di tiap mousemove). Tilt ±12 derajat, plus:
  // card bergeser ke arah kursor, glare cahaya mengikuti kursor, dan isi card
  // bergerak berlawanan arah (parallax) supaya terasa ada kedalamannya.
  const [hovering, setHovering] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const tiltSpring = { stiffness: 250, damping: 24, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-280, 280], [12, -12]), tiltSpring);
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-12, 12]), tiltSpring);

  // Card bergeser sedikit ke arah kursor: terasa "mengejar" kursor.
  const cardShiftX = useSpring(useTransform(mouseX, [-200, 200], [-4, 4]), tiltSpring);
  const cardShiftY = useSpring(useTransform(mouseY, [-280, 280], [-4, 4]), tiltSpring);

  // Glare: highlight cahaya mengikuti kursor, menjual ilusi kaca 3D
  // (sumber cahaya seolah ada di posisi kursor).
  const glareX = useSpring(useTransform(mouseX, [-200, 200], [15, 85]), tiltSpring);
  const glareY = useSpring(useTransform(mouseY, [-280, 280], [8, 92]), tiltSpring);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.12) 0%, rgba(116,250,106,0.05) 30%, transparent 60%)`;

  // Isi card bergerak berlawanan arah dengan card: dua layer bergerak berbeda
  // menciptakan kedalaman (parallax), sekaligus mengarahkan fokus ke form.
  const contentX = useSpring(useTransform(mouseX, [-200, 200], [6, -6]), tiltSpring);
  const contentY = useSpring(useTransform(mouseY, [-280, 280], [6, -6]), tiltSpring);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    setHovering(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    setError("");
    setInfo("");
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading(null);
      }
    } catch {
      const label = provider === "google" ? "Google" : "GitHub";
      setError(en ? `${label} sign-in failed. Try again.` : `Login ${label} gagal. Coba lagi.`);
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      // Jalan pintas admin dev (fallback lokal, di luar Supabase).
      if (mode === "signin" && email === "admin@scratchagent.com" && password === "scratchagent2024") {
        localStorage.setItem("scratch_user", JSON.stringify({ email, name: "Admin", role: "admin" }));
        refreshCurrentUser();
        router.push("/new");
        return;
      }

      // Jalur utama: Supabase Auth (sama dengan Google/GitHub OAuth).
      if (supabaseConfigured()) {
        const supabase = createClient();

        if (mode === "signin") {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            setError(en ? "Wrong email or password." : "Email atau password salah.");
            return;
          }
          refreshCurrentUser();
          router.push("/new");
          return;
        }

        // Mode daftar: buat user di Supabase, nama disimpan di user_metadata.
        const cleanName = name.trim();
        if (!cleanName || !email.includes("@") || password.length < 6) {
          setError(
            en
              ? "Fill in your name, a valid email, and a password of at least 6 characters."
              : "Isi nama, email yang valid, dan password minimal 6 karakter.",
          );
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: cleanName } },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (!data.user) {
          setError(en ? "Sign up failed. Try again." : "Pendaftaran gagal. Coba lagi.");
          return;
        }
        // Kalau project Supabase minta konfirmasi email, tidak ada session.
        if (!data.session) {
          setInfo(
            en
              ? "Account created. Check your email to confirm your address, then sign in."
              : "Akun dibuat. Cek email kamu untuk konfirmasi alamatnya, lalu masuk.",
          );
          return;
        }
        refreshCurrentUser();
        router.push("/new");
        return;
      }

      // Fallback dev tanpa Supabase: akun lokal di localStorage.
      if (mode === "signin") {
        const storedUsers = JSON.parse(localStorage.getItem("scratch_users") || "{}");
        const userKey = email.toLowerCase();
        if (storedUsers[userKey] && storedUsers[userKey].password === password) {
          localStorage.setItem("scratch_user", JSON.stringify({ email, name: storedUsers[userKey].name }));
          refreshCurrentUser();
          router.push("/new");
          return;
        }
        setError(en ? "Wrong email or password." : "Email atau password salah.");
        return;
      }
      const cleanName = name.trim();
      if (!cleanName || !email.includes("@") || password.length < 6) {
        setError(
          en
            ? "Fill in your name, a valid email, and a password of at least 6 characters."
            : "Isi nama, email yang valid, dan password minimal 6 karakter.",
        );
        return;
      }
      const storedUsers = JSON.parse(localStorage.getItem("scratch_users") || "{}");
      const userKey = email.toLowerCase();
      if (storedUsers[userKey]) {
        setError(en ? "Email is already registered. Try signing in." : "Email sudah terdaftar. Coba masuk.");
        return;
      }
      storedUsers[userKey] = { name: cleanName, password };
      localStorage.setItem("scratch_users", JSON.stringify(storedUsers));
      localStorage.setItem("scratch_user", JSON.stringify({ email, name: cleanName }));
      refreshCurrentUser();
      router.push("/new");
    } catch {
      setError(en ? "Something went wrong. Try again." : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
    title: mode === "signin" ? (en ? "Welcome Back" : "Selamat Datang Kembali") : en ? "Create Your Account" : "Buat Akun Baru",
    sub:
      mode === "signin"
        ? en
          ? "Sign in to continue to Scratch Agent"
          : "Masuk untuk lanjut ke Scratch Agent"
        : en
          ? "Start on the Free plan — no credit card"
          : "Mulai dari paket Free — tanpa kartu kredit",
    emailPlaceholder: en ? "Email address" : "Alamat email",
    passwordPlaceholder: "Password",
    namePlaceholder: en ? "Your name" : "Nama kamu",
    rememberMe: en ? "Remember me" : "Ingat saya",
    forgot: en ? "Forgot password?" : "Lupa password?",
    submit: mode === "signin" ? (en ? "Sign In" : "Masuk") : en ? "Create account" : "Buat akun",
    or: en ? "or" : "atau",
    google: en ? "Sign in with Google" : "Masuk dengan Google",
    github: en ? "Sign in with GitHub" : "Masuk dengan GitHub",
    noAccount: en ? "Don't have an account?" : "Belum punya akun?",
    switchLabel: mode === "signin" ? (en ? "Sign up" : "Daftar") : en ? "Sign in" : "Masuk",
    hasAccount: en ? "Already have an account?" : "Sudah punya akun?",
    forgotInfo: en
      ? "Password reset isn't available yet — try signing in with Google."
      : "Reset password belum tersedia — coba masuk lewat Google.",
    back: en ? "Back to home" : "Kembali ke beranda",
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black">
      {/* Background gradient — lime brand, menggantikan ungu */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#74FA6A]/20 via-[#0f2a12]/60 to-black" />

      {/* Noise halus */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Glow radial atas */}
      <div className="absolute left-1/2 top-0 h-[60vh] w-[120vh] -translate-x-1/2 rounded-b-[50%] bg-[#74FA6A]/15 blur-[80px]" />
      <motion.div
        className="absolute left-1/2 top-0 h-[60vh] w-[100vh] -translate-x-1/2 rounded-b-full bg-[#9AFF82]/15 blur-[60px]"
        animate={{ opacity: [0.15, 0.3, 0.15], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 h-[90vh] w-[90vh] -translate-x-1/2 rounded-t-full bg-[#74FA6A]/15 blur-[60px]"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", delay: 1 }}
      />

      {/* Glow spot animasi */}
      <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-white/5 opacity-40 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse delay-1000 rounded-full bg-white/5 opacity-40 blur-[100px]" />

      {/* Link kembali ke beranda */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-20 flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t.back}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm px-4"
        style={{ perspective: 1100 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY, x: cardShiftX, y: cardShiftY }}
          animate={{ scale: hovering ? 1.02 : 1 }}
          transition={{ scale: { type: "spring", stiffness: 250, damping: 24 } }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="group relative">
            {/* Glow card saat hover */}
            <motion.div
              className="absolute -inset-[1px] rounded-2xl opacity-0 transition-opacity duration-700 group-hover:opacity-70"
              animate={{
                boxShadow: [
                  "0 0 10px 2px rgba(116,250,106,0.05)",
                  "0 0 15px 5px rgba(116,250,106,0.10)",
                  "0 0 10px 2px rgba(116,250,106,0.05)",
                ],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
            />

            {/* Berkas cahaya berjalan di tepi card. Animasi memakai transform (x/y)
                yang jalan di GPU, bukan left/top/right/bottom yang memicu layout
                ulang setiap frame dan bikin gerak tersendat. */}
            <div className="absolute -inset-[1px] overflow-hidden rounded-2xl">
              <motion.div
                className="absolute left-0 top-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-[#74FA6A] to-transparent opacity-70"
                initial={{ filter: "blur(2px)", x: "-100%" }}
                animate={{ x: ["-100%", "200%"], opacity: [0.3, 0.7, 0.3], filter: ["blur(1px)", "blur(2.5px)", "blur(1px)"] }}
                transition={{
                  x: { duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 },
                  opacity: { duration: 1.2, repeat: Infinity, repeatType: "mirror" },
                  filter: { duration: 1.5, repeat: Infinity, repeatType: "mirror" },
                }}
              />
              <motion.div
                className="absolute right-0 top-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-[#74FA6A] to-transparent opacity-70"
                initial={{ filter: "blur(2px)", y: "-100%" }}
                animate={{ y: ["-100%", "200%"], opacity: [0.3, 0.7, 0.3], filter: ["blur(1px)", "blur(2.5px)", "blur(1px)"] }}
                transition={{
                  y: { duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 0.6 },
                  opacity: { duration: 1.2, repeat: Infinity, repeatType: "mirror", delay: 0.6 },
                  filter: { duration: 1.5, repeat: Infinity, repeatType: "mirror", delay: 0.6 },
                }}
              />
              <motion.div
                className="absolute bottom-0 right-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-[#74FA6A] to-transparent opacity-70"
                initial={{ filter: "blur(2px)", x: "200%" }}
                animate={{ x: ["200%", "-100%"], opacity: [0.3, 0.7, 0.3], filter: ["blur(1px)", "blur(2.5px)", "blur(1px)"] }}
                transition={{
                  x: { duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 1.2 },
                  opacity: { duration: 1.2, repeat: Infinity, repeatType: "mirror", delay: 1.2 },
                  filter: { duration: 1.5, repeat: Infinity, repeatType: "mirror", delay: 1.2 },
                }}
              />
              <motion.div
                className="absolute bottom-0 left-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-[#74FA6A] to-transparent opacity-70"
                initial={{ filter: "blur(2px)", y: "200%" }}
                animate={{ y: ["200%", "-100%"], opacity: [0.3, 0.7, 0.3], filter: ["blur(1px)", "blur(2.5px)", "blur(1px)"] }}
                transition={{
                  y: { duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 1.8 },
                  opacity: { duration: 1.2, repeat: Infinity, repeatType: "mirror", delay: 1.8 },
                  filter: { duration: 1.5, repeat: Infinity, repeatType: "mirror", delay: 1.8 },
                }}
              />
              {/* Glow sudut */}
              <motion.div className="absolute left-0 top-0 h-[5px] w-[5px] rounded-full bg-[#74FA6A]/40 blur-[1px]" animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }} />
              <motion.div className="absolute right-0 top-0 h-[8px] w-[8px] rounded-full bg-[#9AFF82]/60 blur-[2px]" animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2.4, repeat: Infinity, repeatType: "mirror", delay: 0.5 }} />
              <motion.div className="absolute bottom-0 right-0 h-[8px] w-[8px] rounded-full bg-[#9AFF82]/60 blur-[2px]" animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2.2, repeat: Infinity, repeatType: "mirror", delay: 1 }} />
              <motion.div className="absolute bottom-0 left-0 h-[5px] w-[5px] rounded-full bg-[#74FA6A]/40 blur-[1px]" animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2.3, repeat: Infinity, repeatType: "mirror", delay: 1.5 }} />
            </div>

            {/* Border glow saat hover */}
            <div className="absolute -inset-[0.5px] rounded-2xl bg-gradient-to-r from-[#74FA6A]/15 via-white/10 to-[#74FA6A]/15 opacity-0 transition-opacity duration-500 group-hover:opacity-70" />

            {/* Glass card */}
            <div className="relative overflow-hidden rounded-2xl border border-[#74FA6A]/15 bg-black/40 p-6 shadow-2xl backdrop-blur-xl">
              {/* Pola diagonal halus */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
                  backgroundSize: "30px 30px",
                }}
              />

              {/* Glare: highlight cahaya mengikuti kursor (pointer-events-none
                  supaya tidak mengganggu klik; hanya efek visual). */}
              <motion.div
                className="pointer-events-none absolute inset-0"
                style={{ background: glareBackground }}
                initial={{ opacity: 0 }}
                animate={{ opacity: hovering ? 1 : 0 }}
                transition={{ duration: 0.4 }}
              />

              {/* Isi card: digeser berlawanan arah card untuk kedalaman parallax */}
              <motion.div className="relative" style={{ x: contentX, y: contentY }}>
              {/* Logo dan header */}
              <div className="mb-5 space-y-1 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="relative mx-auto flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10"
                >
                  {/* Logo Scratch Agent */}
                  <span className="relative grid size-4 place-items-center overflow-hidden" aria-hidden="true">
                    <span className="absolute left-0 top-[5px] h-2 w-1.5 -skew-x-[28deg] rounded-sm bg-[#74FA6A]" />
                    <span className="absolute left-[6px] top-[2px] h-2 w-1.5 -skew-x-[28deg] rounded-sm bg-[#9AFF82]" />
                    <span className="absolute left-[12px] top-[5px] h-2 w-1.5 -skew-x-[28deg] rounded-sm bg-[#4DDC62]" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-clip-text text-xl font-bold text-transparent bg-gradient-to-b from-white to-white/80"
                  // Inline style untuk mengalahkan aturan mentah `h1` di globals.css
                  // (clamp 3rem–5.4rem) yang berada di luar cascade layer Tailwind.
                  style={{ fontSize: "1.25rem", lineHeight: 1.3 }}
                >
                  {t.title}
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-xs text-white/60">
                  {t.sub}
                </motion.p>
              </div>

              {/* Form login */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div className="space-y-3">
                  {/* Nama (mode daftar) */}
                  <AnimatePresence>
                    {mode === "signup" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className={`relative overflow-hidden ${focusedInput === "name" ? "z-10" : ""}`}
                      >
                        <div className="relative flex items-center overflow-hidden rounded-lg">
                          <User className={`absolute left-3 h-4 w-4 transition-all duration-300 ${focusedInput === "name" ? "text-[#74FA6A]" : "text-white/40"}`} />
                          <Input
                            type="text"
                            placeholder={t.namePlaceholder}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onFocus={() => setFocusedInput("name")}
                            onBlur={() => setFocusedInput(null)}
                            className="h-10 w-full border-transparent bg-white/5 pl-10 pr-3 text-white transition-all duration-300 placeholder:text-white/30 focus:border-[#74FA6A]/30 focus:bg-white/10"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email */}
                  {/* Skala hover input dihapus: bikin gerak terasa kasar dan tidak
                      punya tujuan UX; feedback fokus sudah ada lewat warna border
                      dan latar (R-19). */}
                  <div className={`relative ${focusedInput === "email" ? "z-10" : ""}`}>
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Mail className={`absolute left-3 h-4 w-4 transition-all duration-300 ${focusedInput === "email" ? "text-[#74FA6A]" : "text-white/40"}`} />
                      <Input
                        type="email"
                        placeholder={t.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedInput("email")}
                        onBlur={() => setFocusedInput(null)}
                        className="h-10 w-full border-transparent bg-white/5 pl-10 pr-3 text-white transition-all duration-300 placeholder:text-white/30 focus:border-[#74FA6A]/30 focus:bg-white/10"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className={`relative ${focusedInput === "password" ? "z-10" : ""}`}>
                    <div className="relative flex items-center overflow-hidden rounded-lg">
                      <Lock className={`absolute left-3 h-4 w-4 transition-all duration-300 ${focusedInput === "password" ? "text-[#74FA6A]" : "text-white/40"}`} />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput("password")}
                        onBlur={() => setFocusedInput(null)}
                        className="h-10 w-full border-transparent bg-white/5 pl-10 pr-10 text-white transition-all duration-300 placeholder:text-white/30 focus:border-[#74FA6A]/30 focus:bg-white/10"
                      />
                      <div
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 cursor-pointer"
                        role="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <Eye className="h-4 w-4 text-white/40 transition-colors duration-300 hover:text-white" />
                        ) : (
                          <EyeClosed className="h-4 w-4 text-white/40 transition-colors duration-300 hover:text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {(error || info) && (
                  <p className={`text-xs ${error ? "text-red-400" : "text-white/60"}`}>{error || info}</p>
                )}

                {/* Ingat saya & lupa password (mode masuk) */}
                {mode === "signin" && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={() => setRememberMe(!rememberMe)}
                          className="h-4 w-4 appearance-none rounded border border-white/20 bg-white/5 transition-all duration-200 checked:border-[#74FA6A] checked:bg-[#74FA6A] focus:outline-none focus:ring-1 focus:ring-[#74FA6A]/30"
                        />
                        {rememberMe && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center text-black"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                      <label htmlFor="remember-me" className="text-xs text-white/60 transition-colors duration-200 hover:text-white/80">
                        {t.rememberMe}
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setInfo(t.forgotInfo);
                        setError("");
                      }}
                      className="text-xs text-white/60 transition-colors duration-200 hover:text-white"
                    >
                      {t.forgot}
                    </button>
                  </div>
                )}

                {/* Tombol submit */}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} type="submit" disabled={isLoading || oauthLoading !== null} className="group/button relative mt-5 w-full">
                  <div className="absolute inset-0 rounded-lg bg-[#74FA6A]/10 opacity-0 blur-lg transition-opacity duration-300 group-hover/button:opacity-70" />
                  <div className="relative flex h-10 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-[#8CFF80] to-[#54C94A] text-black transition-all duration-300">
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/70 border-t-transparent" />
                        </motion.div>
                      ) : (
                        <motion.span key="button-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-1 text-sm font-bold">
                          {t.submit}
                          <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/button:translate-x-1" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>

                {/* Divider */}
                <div className="relative mb-5 mt-2 flex items-center">
                  <div className="flex-grow border-t border-white/5" />
                  <motion.span
                    className="mx-3 text-xs text-white/40"
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: [0.7, 0.9, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {t.or}
                  </motion.span>
                  <div className="flex-grow border-t border-white/5" />
                </div>

                {/* Google */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={isLoading || oauthLoading !== null}
                  className="group/google relative w-full"
                >
                  <div className="absolute inset-0 rounded-lg bg-white/5 opacity-0 blur transition-opacity duration-300 group-hover/google:opacity-70" />
                  <div className="relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/5 text-white transition-all duration-300 hover:border-white/20">
                    {oauthLoading === "google" ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    )}
                    <span className="text-xs text-white/80 transition-colors group-hover/google:text-white">{t.google}</span>
                  </div>
                </motion.button>

                {/* GitHub */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  type="button"
                  onClick={() => handleOAuth("github")}
                  disabled={isLoading || oauthLoading !== null}
                  className="group/github relative w-full"
                >
                  <div className="absolute inset-0 rounded-lg bg-white/5 opacity-0 blur transition-opacity duration-300 group-hover/github:opacity-70" />
                  <div className="relative flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/5 text-white transition-all duration-300 hover:border-white/20">
                    {oauthLoading === "github" ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white/80 transition-colors group-hover/github:text-white" aria-hidden="true">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                      </svg>
                    )}
                    <span className="text-xs text-white/80 transition-colors group-hover/github:text-white">{t.github}</span>
                  </div>
                </motion.button>

                {/* Link ganti mode masuk/daftar */}
                <motion.p className="mt-4 text-center text-xs text-white/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {mode === "signin" ? t.noAccount : t.hasAccount}{" "}
                  <button type="button" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} className="group/signup relative inline-block">
                    <span className="relative z-10 font-medium text-white transition-colors duration-300 group-hover/signup:text-[#74FA6A]">
                      {t.switchLabel}
                    </span>
                    <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#74FA6A] transition-all duration-300 group-hover/signup:w-full" />
                  </button>
                </motion.p>
              </form>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
