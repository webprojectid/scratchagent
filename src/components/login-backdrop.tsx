"use client";

import { useEffect, useRef } from "react";

export function LoginBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let width = 0;
    let height = 0;
    let time = 0;
    let dots: { x: number; y: number; phase: number; speed: number }[] = [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = 18; y < height; y += 21) {
        for (let x = 18; x < width; x += 21) dots.push({ x, y, phase: Math.random() * 6.28, speed: 0.45 + Math.random() * 0.7 });
      }
    };

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);
      for (const dot of dots) {
        const pulse = (Math.sin(time * dot.speed + dot.phase) + 1) / 2;
        ctx.fillStyle = `rgba(225,235,228,${0.035 + pulse * 0.12})`;
        ctx.fillRect(dot.x, dot.y, 1, 1);
      }
      if (!reduce) raf = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    render();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}
