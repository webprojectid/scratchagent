"use client";

import { useEffect, useRef } from "react";

export function TaskFokusGlitch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const w1Ref = useRef<HTMLSpanElement>(null);
  const w2Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    type P = { x: number; y: number; vx: number; vy: number; life: number; decay: number; size: number; color: string; bolt?: boolean; drip?: boolean; len?: number; fork?: boolean };
    let particles: P[] = [];

    const resize = () => {
      W = canvas.width = scene.offsetWidth;
      H = canvas.height = scene.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(scene);

    const spawnBurst = (el: HTMLElement | null) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const sr = scene.getBoundingClientRect();
      const cx = r.left - sr.left + r.width * 0.5;
      const cy = r.top - sr.top + r.height * 0.5;
      const count = 18 + Math.floor(Math.random() * 14);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
        const speed = 2.5 + Math.random() * 5.5;
        const isBolt = Math.random() > 0.55;
        particles.push({
          x: cx + (Math.random() - 0.5) * r.width * 0.6,
          y: cy + (Math.random() - 0.5) * r.height * 0.4,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          life: 1,
          decay: 0.022 + Math.random() * 0.03,
          size: isBolt ? 1 + Math.random() * 1.5 : 2 + Math.random() * 3,
          color: Math.random() > 0.4 ? "#74FA6A" : Math.random() > 0.5 ? "#fff" : "#ffee44",
          bolt: isBolt,
          len: 6 + Math.random() * 14,
          fork: Math.random() > 0.6,
        });
      }
    };

    const spawnDrip = (el: HTMLElement | null) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const sr = scene.getBoundingClientRect();
      for (let i = 0; i < 3; i++) {
        particles.push({ x: r.left - sr.left + Math.random() * r.width, y: r.top - sr.top + r.height * 0.8, vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2, life: 1, decay: 0.015 + Math.random() * 0.02, size: 2 + Math.random() * 2, color: "#74FA6A", drip: true });
      }
    };

    const intervals = [w1Ref.current, w2Ref.current].map((el, i) => {
      return setInterval(() => { spawnBurst(el); if (Math.random() > 0.5) spawnDrip(el); }, 350 + i * 180 + Math.random() * 200);
    });

    const drawBolt = (x: number, y: number, len: number, angle: number, life: number, fork?: boolean) => {
      ctx.save();
      ctx.strokeStyle = `rgba(116,250,106,${life * 0.85})`;
      ctx.lineWidth = 1.2 * life;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#74FA6A";
      ctx.beginPath();
      ctx.moveTo(x, y);
      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      const mx = (x + ex) / 2 + (Math.random() - 0.5) * len * 0.5;
      const my = (y + ey) / 2 + (Math.random() - 0.5) * len * 0.5;
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
      if (fork && Math.random() > 0.5) {
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + (Math.random() - 0.5) * len * 0.6, my + Math.random() * len * 0.6);
        ctx.globalAlpha *= 0.5;
        ctx.stroke();
      }
      ctx.restore();
    };

    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        ctx.globalAlpha = p.life;
        if (p.bolt) {
          const angle = Math.atan2(p.vy, p.vx);
          drawBolt(p.x, p.y, (p.len ?? 8) * p.life, angle, p.life, p.fork);
        } else {
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * Math.sqrt(p.life), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.drip ? 0.08 : 0.25;
        p.vx *= p.drip ? 0.98 : 0.93;
        p.life -= p.decay;
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      intervals.forEach((id) => clearInterval(id));
    };
  }, []);

  return (
    <div ref={sceneRef} className="scratch-electric-scene relative overflow-hidden bg-[#080808] px-6 py-10 md:px-10">
      <style>{`.scratch-electric-scene .scanline{position:absolute;inset:0;background:repeating-linear-gradient(to bottom,transparent 0px,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px);pointer-events:none;z-index:10}.scratch-electric-scene .line{display:block;font-family:var(--font-display),sans-serif;font-size:clamp(36px,6vw,72px);color:#fff;letter-spacing:-.055em;line-height:.9;font-weight:600;position:relative;text-transform:uppercase}.scratch-electric-scene .word{display:inline-block;position:relative}.scratch-electric-scene .word.electric{animation:scratch-jitter .08s infinite}.scratch-electric-scene .word.electric .ghost1{position:absolute;inset:0;font-family:inherit;font-size:inherit;letter-spacing:inherit;font-weight:inherit;color:#74FA6A;mix-blend-mode:screen;animation:scratch-ghost1 .06s infinite;clip-path:polygon(0 15%,100% 15%,100% 45%,0 45%)}.scratch-electric-scene .word.electric .ghost2{position:absolute;inset:0;font-family:inherit;font-size:inherit;letter-spacing:inherit;font-weight:inherit;color:#ff1744;mix-blend-mode:screen;animation:scratch-ghost2 .07s infinite;clip-path:polygon(0 55%,100% 55%,100% 85%,0 85%)}.scratch-electric-scene .word.electric .ghost3{position:absolute;inset:0;font-family:inherit;font-size:inherit;letter-spacing:inherit;font-weight:inherit;color:#fff;animation:scratch-ghost3 .09s infinite;clip-path:polygon(0 0,100% 0,100% 12%,0 12%);opacity:.6}@keyframes scratch-jitter{0%{transform:translate(0,0) skewX(0deg)}10%{transform:translate(-3px,1px) skewX(-1deg)}20%{transform:translate(2px,-1px) skewX(0.5deg)}30%{transform:translate(-1px,2px) skewX(1deg)}40%{transform:translate(3px,0px) skewX(-0.5deg)}50%{transform:translate(-2px,-2px) skewX(0deg)}60%{transform:translate(1px,1px) skewX(1.5deg)}70%{transform:translate(-3px,0px) skewX(-1deg)}80%{transform:translate(2px,2px) skewX(0deg)}90%{transform:translate(0px,-1px) skewX(0.5deg)}100%{transform:translate(0,0) skewX(0deg)}}@keyframes scratch-ghost1{0%{transform:translate(-6px,0);opacity:.9}25%{transform:translate(4px,-1px);opacity:.7}50%{transform:translate(-2px,1px);opacity:1}75%{transform:translate(6px,0);opacity:.8}100%{transform:translate(-4px,0);opacity:.9}}@keyframes scratch-ghost2{0%{transform:translate(5px,0);opacity:.8}33%{transform:translate(-6px,1px);opacity:1}66%{transform:translate(3px,-1px);opacity:.7}100%{transform:translate(5px,0);opacity:.8}}@keyframes scratch-ghost3{0%{transform:translate(0,-3px);opacity:.5;clip-path:polygon(0 0,100% 0,100% 12%,0 12%)}50%{transform:translate(-8px,-1px);opacity:.8;clip-path:polygon(0 0,100% 0,100% 20%,0 20%)}100%{transform:translate(0,-3px);opacity:.5;clip-path:polygon(0 0,100% 0,100% 12%,0 12%)}}`}</style>
      <div className="scanline" />
      <span className="line">
        SATU&nbsp;
        <span ref={w1Ref} className="word electric">
          TASK.
          <span className="ghost1">TASK.</span>
          <span className="ghost2">TASK.</span>
          <span className="ghost3">TASK.</span>
        </span>
      </span>
      <span className="line">
        SATU&nbsp;
        <span ref={w2Ref} className="word electric">
          FOKUS.
          <span className="ghost1">FOKUS.</span>
          <span className="ghost2">FOKUS.</span>
          <span className="ghost3">FOKUS.</span>
        </span>
      </span>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
    </div>
  );
}
