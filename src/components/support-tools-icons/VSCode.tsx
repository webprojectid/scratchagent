"use client";
import Image from "next/image";

export function VsCodeIcon() {
  return (
    <Image
      src="/support-tools/vscode.png"
      alt="VS Code"
      width={40}
      height={40}
      className="object-contain"
    />
  );
}
