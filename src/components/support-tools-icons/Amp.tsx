"use client";
import Image from "next/image";

export function AmpIcon() {
  return (
    <Image
      src="/support-tools/amp.png"
      alt="Amp"
      width={40}
      height={40}
      className="object-contain"
    />
  );
}
