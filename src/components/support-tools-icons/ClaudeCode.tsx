"use client";
import Image from "next/image";

export function ClaudeCodeIcon() {
  return (
    <Image
      src="/support-tools/claude-code.png"
      alt="Claude Code"
      width={40}
      height={40}
      className="object-contain"
    />
  );
}
