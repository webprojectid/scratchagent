"use client";

import { useEffect, useRef } from "react";

type Decoder = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } };
  decode(options: { frameIndex: number }): Promise<{ image: VideoFrame }>;
  close(): void;
};

/** Render the original GIF with only edge-connected black background removed.
 * Dark pixels enclosed by the badge remain opaque, preserving its printed art. */
export function CreatorBadge({ running, className }: { running: boolean; className: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let decoder: Decoder | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    async function start() {
      const DecoderClass = (window as unknown as { ImageDecoder?: new (options: { data: ArrayBuffer; type: string }) => Decoder }).ImageDecoder;
      const context = canvas.current?.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      if (!DecoderClass) {
        const fallback = new Image();
        fallback.src = "/creator/teguh-badge-still.png";
        await fallback.decode();
        if (!stopped) context.drawImage(fallback, 0, 0, 372, 450);
        return;
      }
      const response = await fetch("/creator/teguh-adhi-wibowo-animated.gif", { signal: controller.signal });
      decoder = new DecoderClass({ data: await response.arrayBuffer(), type: "image/gif" });
      await decoder.tracks.ready;
      const width = 372, height = 450;
      const queue = new Int32Array(width * height);
      const seen = new Uint8Array(width * height);
      let index = 0;
      async function draw() {
        if (stopped || !decoder) return;
        const { image } = await decoder.decode({ frameIndex: index });
        if (stopped) { image.close(); return; }
        context!.clearRect(0, 0, width, height);
        // The supplied GIF rotates around its top centre by 2.15 * sin(phase).
        // Undo that baked-in sway while retaining each animated facial frame.
        const phase = 2 * Math.PI * index / decoder!.tracks.selectedTrack.frameCount;
        const angle = 2.15 * Math.sin(phase) * Math.PI / 180;
        const sourceRatio = image.displayWidth / image.displayHeight;
        context!.save();
        context!.scale(width / (height * sourceRatio), 1);
        context!.translate(height * sourceRatio / 2, 0);
        context!.rotate(angle);
        context!.translate(-height * sourceRatio / 2, 0);
        context!.drawImage(image, 0, 0, height * sourceRatio, height);
        context!.restore();
        const delay = Math.max(20, (image.duration ?? 50000) / 1000);
        image.close();
        const pixels = context!.getImageData(0, 0, width, height);
        const data = pixels.data;
        seen.fill(0);
        let head = 0, tail = 0;
        const visit = (p: number) => {
          if (seen[p]) return;
          seen[p] = 1;
          const offset = p * 4;
          if (Math.max(data[offset], data[offset + 1], data[offset + 2]) > 3) return;
          queue[tail++] = p;
          data[offset + 3] = 0;
        };
        for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
        for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
        while (head < tail) {
          const p = queue[head++];
          if (p % width) visit(p - 1);
          if (p % width < width - 1) visit(p + 1);
          if (p >= width) visit(p - width);
          if (p < width * (height - 1)) visit(p + width);
        }
        context!.putImageData(pixels, 0, 0);
        index = (index + 1) % decoder!.tracks.selectedTrack.frameCount;
        if (running) timer = setTimeout(() => { void draw().catch(() => {}); }, delay);
      }
      await draw();
    }
    void start().catch(() => {});
    return () => { stopped = true; controller.abort(); clearTimeout(timer); decoder?.close(); };
  }, [running]);
  return <canvas ref={canvas} width={372} height={450} role="img" aria-label="Name tag Teguh Adhi Wibowo" className={className} />;
}
