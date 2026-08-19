"use client";

// Frame browser Safari dark-mode untuk menampilkan sample web project.
// Alasan keputusan (R-31):
// - Chrome ditiru dari Safari macOS dark: traffic lights kiri, nav arrows,
//   URL pill dengan gembok + "scratchagent.app" sebagai identitas produk.
// - Viewport adalah scroll container sendiri (`overflow-y-auto`), sehingga hero
//   di dalamnya bisa di-scroll + parallax independen dari scroll page utama.
// - `scrollRef` di-expose supaya parent bisa menyambungkan logika scroll
//   (parallax HeroSection) langsung ke viewport frame.
// - `select-none` pada chrome: chrome browser bukan konten yang perlu di-copy.
//
// ratio="desktop": konten di-render pada canvas desktop virtual (ukuran
// viewport / ZOOM px persis, dihitung via ResizeObserver) lalu diperkecil
// dengan CSS `zoom` supaya typography/spacing/navbar terasa seperti website
// desktop asli, bukan layout besar yang dipaksa masuk ke frame kecil.
// `zoom` dipakai (bukan `transform: scale`) karena zoom ikut mengecilkan
// layout box-nya sendiri — ukuran canvas dihitung persis di piksel absolut
// (bukan persentase, yang bisa melar/overflow saat dikombinasikan dengan
// zoom), sehingga tidak pernah overflow dan tidak muncul scrollbar kedua
// di viewport frame.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Lock, PanelLeft, Plus, Share, Shield } from "lucide-react";

const DESKTOP_ZOOM = 0.75;

export const SafariFrame = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string; url?: string; ratio?: "desktop" }
>(function SafariFrame({ children, className = "", url = "scratchagent.app/sample/web-project", ratio }, ref) {
  const viewportRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => viewportRef.current as HTMLDivElement);

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (ratio !== "desktop") return;
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      setCanvasSize({
        width: el.clientWidth / DESKTOP_ZOOM,
        height: el.clientHeight / DESKTOP_ZOOM,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ratio]);

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-[#16161C] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] ${className}`}>
      {/* Toolbar Safari, dark mode */}
      <div className="flex h-11 select-none items-center gap-2 border-b border-white/[.06] bg-[#1F2023] px-3 sm:gap-3 sm:px-4">
        {/* Traffic lights */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="size-[13px] rounded-full bg-[#FF5F57]" aria-hidden="true" />
          <span className="size-[13px] rounded-full bg-[#FEBC2E]" aria-hidden="true" />
          <span className="size-[13px] rounded-full bg-[#28C840]" aria-hidden="true" />
        </div>

        {/* Navigasi */}
        <div className="flex shrink-0 items-center gap-1 text-white/30">
          <ChevronLeft size={15} strokeWidth={2.2} aria-hidden="true" />
          <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" />
        </div>

        {/* URL bar */}
        <div className="mx-auto flex min-w-0 max-w-[400px] flex-1 items-center justify-center gap-1.5 rounded-md border border-white/[.08] bg-white/[.06] px-3 py-1.5">
          <Lock size={11} className="shrink-0 text-white/40" aria-hidden="true" />
          <span className="truncate font-mono text-[11px] tracking-[.02em] text-white/75">{url}</span>
        </div>

        {/* Tools kanan */}
        <div className="flex shrink-0 items-center gap-2 text-white/35">
          <Share size={14} aria-hidden="true" />
          <Plus size={15} className="hidden sm:block" aria-hidden="true" />
          <PanelLeft size={14} className="hidden sm:block" aria-hidden="true" />
        </div>
      </div>

      {/* Viewport: konten sample web project berjalan di sini.
          ratio="desktop" => tinggi layar mengikuti aspect 16:9 (rasio monitor desktop). */}
      <div
        ref={viewportRef}
        className={`relative overscroll-contain bg-[#0D0D18] ${
          ratio === "desktop" ? "aspect-[16/9] w-full overflow-y-auto" : "h-[72vh] overflow-y-auto"
        }`}
      >
        {ratio === "desktop" ? (
          <div
            style={
              canvasSize
                ? {
                    width: `${canvasSize.width}px`,
                    height: `${canvasSize.height}px`,
                    zoom: DESKTOP_ZOOM,
                  }
                : {
                    // Fallback langsung saat mount: jangan pernah kosong sambil
                    // menunggu ResizeObserver menghitung ukuran presisi.
                    width: `${100 / DESKTOP_ZOOM}%`,
                    height: `${100 / DESKTOP_ZOOM}%`,
                    zoom: DESKTOP_ZOOM,
                  }
            }
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>

      {/* Status bar tipis, menguatkan kesan "browser berjalan" */}
      <div className="flex h-6 select-none items-center justify-center border-t border-white/[.06] bg-[#1F2023]">
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[.08em] text-white/30">
          <Shield size={10} aria-hidden="true" />
          SECURE
        </span>
      </div>
    </div>
  );
});
