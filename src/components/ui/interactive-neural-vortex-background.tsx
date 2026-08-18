"use client";

// Neural-vortex WebGL background — diadaptasi dari komponen referensi
// `interactive-neural-vortex-background.tsx`. Keputusan adaptasi:
// - TypeScript penuh (ref bertipe, context WebGL1 eksplisit, null-guard).
// - styled-jsx referensi dibuang: Next.js App Router + komponen ui tidak
//   mendukung styled-jsx, jadi semua style dikonversi ke Tailwind v4;
//   aturan agresif referensi (`!important` pada semua tag) dihapus karena
//   akan merusak komponen lain jika bocor.
// - Mode `fill` (default false = full-page seperti referensi). Saat true:
//   canvas `absolute` mengikuti kontainer (bukan `fixed` ke viewport page,
//   yang akan keluar dari frame Safari), dan ukuran canvas mengikuti
//   kontainer via ResizeObserver, bukan window.
// - `scrollRef` menyambungkan progress scroll ke viewport frame (sample
//   berjalan di dalam SafariFrame), fallback ke window.scrollY.
// - Listener `touchmove` anonim di referensi bocor (tidak bisa di-remove);
//   di sini disimpan sebagai handler bernama dan dibersihkan di cleanup.
// - `prefers-reduced-motion`: render satu frame statis, tanpa loop.

import { useEffect, useRef, type RefObject } from "react";

const VS_SOURCE = `
  precision mediump float;
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FS_SOURCE = `
  precision mediump float;
  varying vec2 vUv;
  uniform float u_time;
  uniform float u_ratio;
  uniform vec2 u_pointer_position;
  uniform float u_scroll_progress;

  vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
  }

  float neuro_shape(vec2 uv, float t, float p) {
    vec2 sine_acc = vec2(0.);
    vec2 res = vec2(0.);
    float scale = 8.;
    for (int j = 0; j < 15; j++) {
      uv = rotate(uv, 1.);
      sine_acc = rotate(sine_acc, 1.);
      vec2 layer = uv * scale + float(j) + sine_acc - t;
      sine_acc += sin(layer) + 2.4 * p;
      res += (.5 + .5 * cos(layer)) / scale;
      scale *= (1.2);
    }
    return res.x + res.y;
  }

  void main() {
    vec2 uv = .5 * vUv;
    uv.x *= u_ratio;
    vec2 pointer = vUv - u_pointer_position;
    pointer.x *= u_ratio;
    float p = clamp(length(pointer), 0., 1.);
    p = .5 * pow(1. - p, 2.);
    float t = .001 * u_time;
    vec3 color = vec3(0.);
    float noise = neuro_shape(uv, t, p);
    noise = 1.2 * pow(noise, 3.);
    noise += pow(noise, 10.);
    noise = max(.0, noise - .5);
    noise *= (1. - length(vUv - .5));
    color = vec3(0.5, 0.15, 0.65);
    color = mix(color, vec3(0.02, 0.7, 0.9), 0.32 + 0.16 * sin(2.0 * u_scroll_progress + 1.2));
    color += vec3(0.15, 0.0, 0.6) * sin(2.0 * u_scroll_progress + 1.5);
    color = color * noise;
    gl_FragColor = vec4(color, noise);
  }
`;

interface InteractiveNeuralVortexProps {
  /** true = mengisi kontainer (untuk dipakai di dalam frame); false = full-page. */
  fill?: boolean;
  /** Sumber scroll untuk progress warna shader; fallback window.scrollY. */
  scrollRef?: RefObject<HTMLDivElement | null>;
}

const InteractiveNeuralVortex = ({ fill = false, scrollRef }: InteractiveNeuralVortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Pointer aktual + target, dihaluskan tiap frame (0.2 lerp, seperti referensi).
  const pointer = useRef({ x: 0, y: 0, tX: 0, tY: 0 });
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const wrapEl = wrapRef.current;
    if (!canvasEl || !wrapEl) return;

    const gl = canvasEl.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(VS_SOURCE, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(FS_SOURCE, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Quad penuh layar (dua segitiga).
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRatio = gl.getUniformLocation(program, "u_ratio");
    const uPointerPosition = gl.getUniformLocation(program, "u_pointer_position");
    const uScrollProgress = gl.getUniformLocation(program, "u_scroll_progress");

    // Ukuran canvas mengikuti window (referensi) atau kontainer (mode fill).
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = fill ? wrapEl.clientWidth : window.innerWidth;
      const height = fill ? wrapEl.clientHeight : window.innerHeight;
      canvasEl.width = Math.max(1, Math.round(width * dpr));
      canvasEl.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvasEl.width, canvasEl.height);
      gl.uniform1f(uRatio, canvasEl.width / canvasEl.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    let resizeObserver: ResizeObserver | null = null;
    if (fill) {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(wrapEl);
    }

    // Progress scroll: viewport frame bila disambungkan, kalau tidak window.
    const getScrollProgress = (): number => {
      const el = scrollRef?.current;
      if (el) {
        const max = el.scrollHeight - el.clientHeight;
        return max > 0 ? el.scrollTop / max : 0;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? window.scrollY / max : 0;
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      // Pointer dihaluskan menuju target (lerp 0.2, sesuai referensi).
      pointer.current.x += (pointer.current.tX - pointer.current.x) * 0.2;
      pointer.current.y += (pointer.current.tY - pointer.current.y) * 0.2;

      const width = fill ? wrapEl.clientWidth : window.innerWidth;
      const height = fill ? wrapEl.clientHeight : window.innerHeight;

      gl.uniform1f(uTime, performance.now());
      gl.uniform2f(
        uPointerPosition,
        width > 0 ? pointer.current.x / width : 0,
        height > 0 ? 1 - pointer.current.y / height : 0
      );
      gl.uniform1f(uScrollProgress, getScrollProgress());
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!reducedMotion) animationRef.current = requestAnimationFrame(render);
    };

    render();

    const handlePointerMove = (e: PointerEvent) => {
      pointer.current.tX = e.clientX;
      pointer.current.tY = e.clientY;
      if (reducedMotion) render(); // mode statis: satu frame per interaksi
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        pointer.current.tX = e.touches[0].clientX;
        pointer.current.tY = e.touches[0].clientY;
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchmove", handleTouchMove);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      resizeObserver?.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [fill, scrollRef]);

  return (
    <div
      ref={wrapRef}
      className={`relative flex flex-col items-center overflow-x-hidden font-sans ${
        fill ? "min-h-full" : "min-h-screen justify-center"
      }`}
    >
      {/* Canvas background vortex.
          referensi: `fixed inset-0` — di dalam frame itu menempel ke viewport
          page utama, jadi mode fill memakai `absolute` di kontainer sendiri. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`inset-0 h-full w-full opacity-95 ${fill ? "absolute" : "fixed"} pointer-events-none`}
      />

      {/* Hero section */}
      <section className="z-10 flex w-full flex-1 flex-col items-center justify-center px-6 pt-16 pb-20">
        <div className="nv-rise w-full max-w-2xl rounded-3xl border-2 border-white/10 px-8 py-14 text-center backdrop-blur-md">
          <h1 className="mb-4 text-[clamp(2.4rem,6vw,4rem)] font-light leading-[1.05] tracking-[-0.02em] text-white">
            Step Into the Future of VR
          </h1>
          <p className="mb-9 text-[clamp(1.05rem,2vw,1.25rem)] font-light leading-[1.35] tracking-[-0.01em] text-white/60">
            ImmersiaVR delivers breathtaking realism, seamless interaction, and endless
            possibilities for gaming, education, and beyond.
          </p>
          <a
            href="#get-started"
            className="inline-block rounded-xl border-2 border-white/10 px-8 py-4 font-semibold text-white transition-colors duration-300 hover:border-[#74FA6A]/60 hover:text-[#74FA6A]"
          >
            Get Started
          </a>
        </div>
      </section>
    </div>
  );
};

export default InteractiveNeuralVortex;
