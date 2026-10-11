"use client";

// iPhone 17 frame: titanium finish, kamera baru (horizontal pill kiri atas),
// Dynamic Island (pill horizontal, lebih lebar dari 16), tombol Action + Power.
// Proporsi 9:19.5 mengikuti iPhone 17 standar.

import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/ui/product-card-1";

function IPhone17Frame({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll looping: scroll pelan ke bawah, begitu mentok reset ke atas
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let raf = 0;
    let paused = false;
    const speed = 0.6; // px per frame

    const step = () => {
      if (!paused && el) {
        el.scrollTop += speed;
        // Begitu mentok bawah, langsung balik ke atas (loop seamless)
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          el.scrollTop = 0;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // Pause saat user hover/touch
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[36px] bg-black shadow-[0_20px_60px_color-mix(in_srgb,_var(--theme-shadow)_70%,_transparent),inset_0_0_0_1px_color-mix(in_srgb,_var(--theme-text)_8%,_transparent)]"
        style={{ border: "3px solid var(--theme-border)" }}
      >
        {/* Titanium side sheen — top highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-[36px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

        {/* Action button — kiri atas */}
        <div className="absolute -left-[4px] top-[96px] h-[32px] w-[3px] rounded-l-full bg-secondary" />
        {/* Volume buttons — kiri */}
        <div className="absolute -left-[4px] top-[148px] h-[44px] w-[3px] rounded-l-full bg-secondary" />
        <div className="absolute -left-[4px] top-[200px] h-[44px] w-[3px] rounded-l-full bg-secondary" />
        {/* Power button — kanan */}
        <div className="absolute -right-[4px] top-[164px] h-[64px] w-[3px] rounded-r-full bg-secondary" />

        {/* Status bar */}
        <div className="relative flex shrink-0 items-center justify-between px-6 pt-3 pb-1">
          <span className="text-[8px] font-semibold text-foreground">9:41</span>
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-2 h-[18px] w-[88px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/[.06]" />
          <span className="flex items-center gap-1 text-foreground">
            <svg width="11" height="8" viewBox="0 0 17 12" fill="currentColor">
              <rect x="0" y="4" width="3" height="8" rx="1" />
              <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" />
              <rect x="9" y="0.5" width="3" height="11.5" rx="1" />
              <rect x="13.5" y="0" width="3.5" height="12" rx="1" opacity=".3" />
            </svg>
            <svg width="16" height="8" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="1" width="21" height="10" rx="3" stroke="currentColor" strokeWidth="1" />
              <rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
              <rect x="2" y="2.5" width="14" height="7" rx="1.5" fill="currentColor" />
            </svg>
          </span>
        </div>

        {/* Camera bar — horizontal pill kiri atas (iPhone 17) */}
        <div className="absolute left-5 top-[30px] flex h-[14px] items-center gap-1.5 rounded-full bg-background px-2 ring-1 ring-white/[.06]">
          <span className="size-[8px] rounded-full bg-card ring-1 ring-white/10">
            <span className="block size-full scale-[0.5] rounded-full bg-secondary" />
          </span>
          <span className="size-[6px] rounded-full bg-card ring-1 ring-white/10" />
          <span className="size-[4px] rounded-full bg-secondary/80" />
        </div>

        {/* Scrollable content — auto-scroll via rAF, scrollbar hidden */}
        <div
          ref={scrollRef}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {children}
        </div>

        {/* Home indicator */}
        <div className="flex shrink-0 justify-center py-2">
          <div className="h-[4px] w-[100px] rounded-full bg-foreground/30" />
        </div>
      </div>
    </div>
  );
}

export function IPhone17ShopDemo() {
  return (
    <IPhone17Frame>
      {/* w-full override max-w-sm supaya Card stretch penuh ke sisi kanan-kiri frame */}
      <div className="w-full [&>*]:max-w-none [&>*]:rounded-none [&>*]:border-x-0 [&>*]:shadow-none">
        <ProductCard
          name="Nike Air Force 1"
          price={2099000}
          originalPrice={2699000}
          rating={4.7}
          reviewCount={325}
          discount={25}
          freeShipping
          isNew
          isBestSeller
          autoPlay
          autoPlayInterval={2200}
          currency="Rp "
          colors={["var(--theme-border)", "var(--theme-chart-1)", "var(--theme-chart-2)", "var(--theme-chart-3)"]}
          sizes={["38", "39", "40", "41", "42", "43"]}
          images={[
            "https://images.unsplash.com/photo-1543508282-6319a3e2621f?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1656230259229-aa2634e3352c?q=80&w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1579338559194-a162d19bf842?q=80&w=800&auto=format&fit=crop",
          ]}
        />
      </div>
    </IPhone17Frame>
  );
}
