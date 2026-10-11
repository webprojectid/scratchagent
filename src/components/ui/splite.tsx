"use client";

import { useEffect, useRef, useState } from "react";
import type { Application } from "@splinetool/runtime";

interface SplineSceneProps {
  scene: string;
  className?: string;
}

// Cache satu Promise per scene. React StrictMode me-mount effect dua kali di dev;
// tanpa cache, .splinecode ikut di-fetch dua kali. Effect kedua sekarang memakai
// ArrayBuffer yang sama, sementara effect pertama dibatalkan sebelum membuat app.
const sceneBufferCache = new Map<string, Promise<ArrayBuffer>>();

function getSceneBuffer(scene: string) {
  let promise = sceneBufferCache.get(scene);
  if (!promise) {
    promise = fetch(scene, { cache: "force-cache" }).then((response) => {
      if (!response.ok) throw new Error(`Spline scene failed: ${response.status}`);
      return response.arrayBuffer();
    });
    sceneBufferCache.set(scene, promise);
    promise.catch(() => sceneBufferCache.delete(scene));
  }
  return promise;
}

type SplineAppInternals = {
  _renderer?: {
    pipeline?: {
      setWatermark?: (texture: null) => void;
    };
    setPixelRatio?: (ratio: number) => void;
  };
};

function optimizeRenderer(app: Application) {
  const renderer = (app as unknown as SplineAppInternals)._renderer;
  renderer?.pipeline?.setWatermark?.(null);
  renderer?.setPixelRatio?.(1);
}

export function SplineFallback() {
  return <div className="size-full min-h-[420px] md:min-h-[560px] bg-transparent" aria-hidden="true" />;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let cancelled = false;
    let app: Application | null = null;
    const timers: number[] = [];

    const resize = () => {
      if (!app) return;
      app.setSize(host.clientWidth, host.clientHeight);
      // setSize dari runtime bisa mengembalikan pixel ratio ke devicePixelRatio;
      // re-apply 1 setelah setiap resize.
      optimizeRenderer(app);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (!app) return;
        if (entries[0].isIntersecting) app.play();
        else app.stop();
      },
      { threshold: 0.01 }
    );
    intersectionObserver.observe(host);

    void Promise.all([
      import("@splinetool/runtime"),
      getSceneBuffer(scene),
    ])
      .then(([{ Application }, sceneBuffer]) => {
        if (cancelled) return;

        app = new Application(canvas, { renderOnDemand: true });
        appRef.current = app;
        // slice() menjaga cached ArrayBuffer tetap reusable untuk remount.
        app.start(sceneBuffer.slice(0), { interactive: true });
        resize();
        optimizeRenderer(app);

        // Watermark dan resize internal bisa masuk belakangan; re-apply sebentar,
        // lalu berhenti agar tidak menambah timer permanen.
        [100, 500, 1500, 2500].forEach((ms) => {
          timers.push(window.setTimeout(() => app && optimizeRenderer(app), ms));
        });

        const rect = host.getBoundingClientRect();
        const inView =
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth;
        if (!inView) app.stop();

        (window as unknown as { __splineWatermark?: string }).__splineWatermark = "disabled";
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      app?.dispose();
      appRef.current = null;
    };
  }, [scene]);

  if (failed) {
    return (
      <div className="flex size-full items-center justify-center bg-[#0F1113]">
        <div className="text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-full border border-white/10 bg-white/[.04] font-mono text-[11px] text-white/45">〰</div>
          <p className="mt-3 max-w-[18ch] font-mono text-[10px] leading-4 text-white/35">3D disabled. check adblock / canvas access.</p>
          <button onClick={() => { setFailed(false); setLoading(true); }} className="mt-3 rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] text-white/55 hover:border-[#74FA6A]/40 hover:text-white">retry</button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className={`spline-host relative ${className} overflow-hidden bg-transparent`}
    >
      {loading && <SplineFallback />}
      <canvas
        ref={canvasRef}
        className={`${loading ? "hidden" : "block"} size-full bg-transparent`}
        aria-label="Interactive 3D galaxy background"
      />
    </div>
  );
}
