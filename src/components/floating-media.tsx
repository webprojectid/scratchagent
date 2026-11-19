import type { CSSProperties } from "react";
import styles from "./floating-media.module.css";

/* Free stock photography from Unsplash (https://unsplash.com/license).
   The two rings orbit in opposite directions; each tile counter-rotates so
   its artwork stays upright. */
const sources = Array.from({ length: 15 }, (_, index) => `/media/orbit/tile-${String(index + 1).padStart(2, "0")}.webp`);

const outer = [
  { angle: 0, size: 112, asset: 0 },
  { angle: 40, size: 96, asset: 1 },
  { angle: 80, size: 124, asset: 2 },
  { angle: 120, size: 104, asset: 3 },
  { angle: 160, size: 118, asset: 4 },
  { angle: 200, size: 90, asset: 5 },
  { angle: 240, size: 108, asset: 6 },
  { angle: 280, size: 122, asset: 7 },
  { angle: 320, size: 98, asset: 8 },
];

const inner = [
  { angle: 20, size: 92, asset: 9 },
  { angle: 80, size: 108, asset: 10 },
  { angle: 140, size: 84, asset: 11 },
  { angle: 200, size: 112, asset: 12 },
  { angle: 260, size: 88, asset: 13 },
  { angle: 320, size: 100, asset: 14 },
];

function orbitStyle(tile: { angle: number; size: number; asset: number }, duration: string): CSSProperties {
  return {
    "--start": `${tile.angle}deg`,
    "--size": `${tile.size}px`,
    "--duration": duration,
    backgroundImage: `url("${sources[tile.asset]}"), linear-gradient(135deg, rgba(31, 46, 34, 0.9), rgba(16, 19, 17, 0.9))`,
  } as CSSProperties;
}

export function FloatingMedia() {
  return (
    <div className={styles.field} aria-hidden="true">
      <div className={`${styles.orbit} ${styles.outer}`}>
        {outer.map((tile) => <span key={tile.asset} className={styles.tile} style={orbitStyle(tile, "150s")} />)}
      </div>
      <div className={`${styles.orbit} ${styles.inner}`}>
        {inner.map((tile) => <span key={tile.asset} className={styles.tile} style={orbitStyle(tile, "110s")} />)}
      </div>
    </div>
  );
}
