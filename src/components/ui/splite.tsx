"use client";

import { lazy, Suspense, useState } from "react";
import type { Application } from "@splinetool/runtime";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
}

// Watermark "Built with Spline" digambar runtime sebagai texture WebGL
// di canvas lewat logoOverlayPass (scene free-plan), jadi TIDAK bisa
// dihapus dengan CSS. Dimatikan lewat pipeline setelah scene selesai
// load (react-spline memanggil onLoad setelah `await app.load(scene)`,
// yaitu setelah watermark di-set runtime).
type SplineAppInternals = {
  _renderer?: {
    pipeline?: {
      setWatermark?: (texture: null) => void;
    };
  };
};

function handleSplineLoad(app: Application) {
  const pipeline = (app as unknown as SplineAppInternals)._renderer?.pipeline;
  pipeline?.setWatermark?.(null);
  // Fallback: scene free-plan bisa men-set watermark secara async setelah
  // onLoad; ulang disable beberapa kali lalu berhenti.
  if (typeof window !== "undefined") {
    (window as unknown as { __splineWatermark?: string }).__splineWatermark =
      pipeline ? "disabled" : "pipeline-not-found";
    const timers = [250, 1000, 2500].map((ms) =>
      window.setTimeout(() => pipeline?.setWatermark?.(null), ms)
    );
    window.setTimeout(() => timers.forEach(clearTimeout), 3000);
  }
}

export function SplineFallback() {
  return <div className="size-full min-h-[420px] md:min-h-[560px] bg-transparent" aria-hidden="true" />;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex size-full items-center justify-center bg-[#0F1113]">
        <div className="text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-full border border-white/10 bg-white/[.04] font-mono text-[11px] text-white/45">〰</div>
          <p className="mt-3 max-w-[18ch] font-mono text-[10px] leading-4 text-white/35">3D disabled. check adblock / canvas access.</p>
          <button onClick={() => setFailed(false)} className="mt-3 rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] text-white/55 hover:border-[#74FA6A]/40 hover:text-white">retry</button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<SplineFallback />}>
      <div
        className={`spline-host ${className} overflow-visible bg-transparent [&_canvas]:!h-full [&_canvas]:!min-h-[inherit] [&_canvas]:!w-full`}
        onErrorCapture={() => setFailed(true)}
      >
        <Spline scene={scene} onLoad={handleSplineLoad} className="size-full !min-h-[inherit] bg-transparent [&_canvas]:!bg-transparent" />
      </div>
    </Suspense>
  );
}
