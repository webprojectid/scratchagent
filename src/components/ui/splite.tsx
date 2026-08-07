"use client";

import { lazy, Suspense, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
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
        className={`${className} overflow-visible bg-transparent [&_canvas]:!h-full [&_canvas]:!min-h-[inherit] [&_canvas]:!w-full`}
        onErrorCapture={() => setFailed(true)}
      >
        <Spline scene={scene} className="size-full !min-h-[inherit] bg-transparent [&_canvas]:!bg-transparent" />
      </div>
    </Suspense>
  );
}
