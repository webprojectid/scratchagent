"use client";

// SaaS landing template — diadaptasi dari referensi `saa-s-template.tsx`.
// Keputusan adaptasi:
// - Icon inline SVG (ArrowRight, Menu, X) -> lucide-react, path sama persis
//   (guideline: pakai lucide-react untuk svg).
// - `<style>` referensi memuat `@import` Google Fonts (Poppins) + aturan global
//   `* { font-family }` — dibuang: aturan global bocor ke seluruh situs.
//   Font mengikuti Geist milik situs (font-sans); bobot visual setara.
// - Navigasi `fixed` -> `sticky`: di dalam SafariFrame, `fixed` akan menempel
//   ke viewport page utama, bukan ke frame. `sticky` tetap di atas frame.
// - Keyframes fadeIn/slideDown dipindah ke globals.css (saas-fade /
//   saas-slide-down) + guard prefers-reduced-motion.
// - Gambar referensi (postimg.cc) diganti stock image Unsplash yang stabil
//   (guideline langkah 2): nebula sebagai glow, dashboard analytics.
// - Button `gradient` tetap putih (identitas template netral); aksen lime
//   situs sengaja tidak dipakai di sini.

import React from "react";
import { ArrowRight, Menu, X } from "lucide-react";

// Inline Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

const TemplateButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default: "bg-white text-black hover:bg-gray-100",
      secondary: "bg-gray-800 text-white hover:bg-gray-700",
      ghost: "hover:bg-gray-800/50 text-white",
      gradient: "bg-gradient-to-b from-white via-white/95 to-white/60 text-black hover:scale-105 active:scale-95",
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base",
    };

    return (
      <button ref={ref} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);

TemplateButton.displayName = "TemplateButton";

// Navigation Component
// Catatan: `sticky`, bukan `fixed` milik referensi — lihat komentar di atas.
const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
      <nav className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-white">Logo</div>

          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-8 md:flex">
            <a href="#getting-started" className="text-sm text-white/60 transition-colors hover:text-white">
              Getting started
            </a>
            <a href="#components" className="text-sm text-white/60 transition-colors hover:text-white">
              Components
            </a>
            <a href="#documentation" className="text-sm text-white/60 transition-colors hover:text-white">
              Documentation
            </a>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <TemplateButton type="button" variant="ghost" size="sm">
              Sign in
            </TemplateButton>
            <TemplateButton type="button" variant="default" size="sm">
              Sign Up
            </TemplateButton>
          </div>

          <button
            type="button"
            className="text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="saas-slide-down border-t border-gray-800/50 bg-black/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-4 px-6 py-4">
            <a
              href="#getting-started"
              className="py-2 text-sm text-white/60 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Getting started
            </a>
            <a
              href="#components"
              className="py-2 text-sm text-white/60 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Components
            </a>
            <a
              href="#documentation"
              className="py-2 text-sm text-white/60 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Documentation
            </a>
            <div className="flex flex-col gap-2 border-t border-gray-800/50 pt-4">
              <TemplateButton type="button" variant="ghost" size="sm">
                Sign in
              </TemplateButton>
              <TemplateButton type="button" variant="default" size="sm">
                Sign Up
              </TemplateButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navigation.displayName = "Navigation";

// Hero Component
const Hero = React.memo(() => {
  return (
    <section className="saas-fade relative flex min-h-screen flex-col items-center justify-start px-6 py-20 md:py-24">
      <aside className="mb-8 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-4 py-2 backdrop-blur-sm">
        <span className="whitespace-nowrap text-center text-xs text-gray-400">New version of template is out!</span>
        <a
          href="#new-version"
          className="flex items-center gap-1 whitespace-nowrap text-xs text-gray-400 transition-all hover:text-white active:scale-95"
          aria-label="Read more about the new version"
        >
          Read more
          <ArrowRight size={12} aria-hidden="true" />
        </a>
      </aside>

      <h1
        className="mb-6 max-w-3xl px-6 text-center text-4xl font-medium leading-tight md:text-5xl lg:text-6xl"
        style={{
          background: "linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.05em",
        }}
      >
        Give your big idea <br />
        the website it deserves
      </h1>

      <p className="mb-10 max-w-2xl px-6 text-center text-sm text-gray-400 md:text-base">
        Landing page kit template with React, Shadcn/ui and Tailwind <br />
        that you can copy/paste into your project.
      </p>

      <div className="relative z-10 mb-16 flex items-center gap-4">
        <TemplateButton
          type="button"
          variant="gradient"
          size="lg"
          className="flex items-center justify-center rounded-lg"
          aria-label="Get started with the template"
        >
          Get started
        </TemplateButton>
      </div>

      <div className="relative w-full max-w-5xl pb-20">
        {/* Glow: stock image Unsplash (pengganti glows.png referensi), diblur
            supaya berfungsi sebagai cahaya lembut di belakang dashboard */}
        <div className="pointer-events-none absolute left-1/2 top-[-23%] z-0 w-[90%] -translate-x-1/2" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80&auto=format"
            alt=""
            className="h-auto w-full opacity-50 blur-2xl"
            loading="eager"
          />
        </div>

        <div className="relative z-10">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80&auto=format"
            alt="Dashboard preview showing analytics and metrics interface"
            className="h-auto w-full rounded-lg shadow-2xl"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

// Main Component
export default function SaasTemplate() {
  return (
    <main className="min-h-screen bg-black font-sans text-white">
      <Navigation />
      <Hero />
    </main>
  );
}
