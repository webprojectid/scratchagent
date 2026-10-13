"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./rolling-price.module.css";

const reelDigits = Array.from({ length: 30 }, (_, index) => index % 10);

function DigitReel({ digit, value, index }: { digit: number; value: string; index: number }) {
  const track = useRef<HTMLSpanElement>(null);
  const [initialDigit] = useState(digit);
  const previousValue = useRef(value);

  useEffect(() => {
    const element = track.current;
    if (!element || previousValue.current === value) return;
    previousValue.current = value;

    const rowHeight = element.firstElementChild!.getBoundingClientRect().height;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => { element.style.transform = `translateY(-${(10 + digit) * 1.15}em)`; };
    if (reducedMotion.matches) {
      settle();
      return;
    }

    // Rebase the visible reel position so rapid toggles continue from the current digit.
    const offset = -new DOMMatrixReadOnly(getComputedStyle(element).transform).m42 / rowHeight;
    const startRow = 10 + ((offset % 10) + 10) % 10;
    const animation = element.animate([
      { transform: `translateY(-${startRow * rowHeight}px)` },
      { transform: `translateY(-${(20 + digit) * rowHeight}px)` },
    ], { duration: 560 + index * 30, easing: "cubic-bezier(.16,.75,.18,1)", fill: "forwards" });

    animation.onfinish = () => { settle(); animation.cancel(); };
    const stopMotion = () => { if (reducedMotion.matches) { settle(); animation.cancel(); } };
    reducedMotion.addEventListener("change", stopMotion);
    return () => {
      element.style.transform = getComputedStyle(element).transform;
      animation.cancel();
      reducedMotion.removeEventListener("change", stopMotion);
    };
  }, [digit, value, index]);

  return <span className={styles.window}>
    <span ref={track} className={styles.track} style={{ transform: `translateY(-${(10 + initialDigit) * 1.15}em)` }}>
      {reelDigits.map((number, row) => <span className={styles.digit} key={row}>{number}</span>)}
    </span>
  </span>;
}

export function RollingPrice({ value }: { value: string }) {
  return <>
    <span className="sr-only">{value}</span>
    <span className={styles.price} aria-hidden="true">
      {Array.from(value).map((character, index) => /[0-9]/.test(character)
        ? <DigitReel key={index} digit={Number(character)} value={value} index={index} />
        : <span key={index}>{character}</span>)}
    </span>
  </>;
}
