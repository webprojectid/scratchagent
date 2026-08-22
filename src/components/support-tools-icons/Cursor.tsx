"use client";
import Image from "next/image";

export function CursorIcon() {
  return (
    <Image
      src="/support-tools/cursor.png"
      alt="Cursor"
      width={40}
      height={40}
      className="object-contain"
    />
  );
}
