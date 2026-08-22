"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

interface AiTool {
  name: string;
  icon: React.ReactNode;
  containerBg?: string;
}

/* ─── 12 Exact SVGs from support tools ────────────────────────────────── */

// 1. Claude Code
const ClaudeCodeIcon = () => (
  <svg
    fill="#D97757"
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6"
  >
    <title>Claude Code</title>
    <path d="M21 10.5h3v3h-3v3h-1.5v3H18v-3h-3v-1.5H9v1.5H6v3H4.5v-3H3v-3h3v-3H4.5V9H3V6h1.5V3H6v3h3V4.5h6V6h3v1.5h1.5V9H21v1.5z" />
  </svg>
);

// 2. Cline
const ClineIcon = () => (
  <svg
    fill="currentColor"
    fillRule="evenodd"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6 text-[#E2E8F0]"
  >
    <title>Cline</title>
    <path d="M20.25 15.5H23V8.5h-2.75V3.75H3.75V8.5H1v7h2.75v4.75h16.5V15.5zm-5.75-.75h-5v-1.5h5v1.5zm3.75-4.25v-2h-3v2h3zm-10.5-2h-3v2h3v-2z" />
  </svg>
);

// 3. Codex
const CodexIcon = () => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6 text-[#E2E8F0]"
  >
    <title>Codex</title>
    <path
      d="M19.98 12.33a4.7 4.7 0 0 0-.41-3.87 4.75 4.75 0 0 0-5.12-2.3 4.77 4.77 0 0 0-3.93-1.99c-2.3 0-4.26 1.6-4.67 3.86a4.72 4.72 0 0 0-3.15 2.29 4.76 4.76 0 0 0 .59 5.58 4.7 4.7 0 0 0 .4 3.87 4.75 4.75 0 0 0 5.13 2.3 4.76 4.76 0 0 0 3.93 1.99c2.3 0 4.26-1.6 4.67-3.86a4.71 4.71 0 0 0 3.15-2.29 4.76 4.76 0 0 0-.59-5.58zm-7.98 9.53a3.52 3.52 0 0 1-2.26-.82l.11-.06 3.76-2.17a.62.62 0 0 0 .31-.54v-5.3l1.59.92v4.4a3.55 3.55 0 0 1-3.51 3.57zm-7.6-3.25a3.52 3.52 0 0 1-.42-2.37l.11.07 3.76 2.17c.19.11.43.11.62 0l4.6-2.65v1.83a.06.06 0 0 1-.03.05l-3.83 2.21a3.54 3.54 0 0 1-4.81-1.31zm-1-8.19a3.53 3.53 0 0 1 1.86-1.55v4.57c0 .22.12.43.31.53l4.57 2.64-1.59.92a.06.06 0 0 1-.06 0l-3.83-2.21a3.54 3.54 0 0 1-1.26-4.9zm13.06 3.03l-4.6-2.65 1.59-.92a.06.06 0 0 1 .06 0l3.75 2.17a3.54 3.54 0 0 1-.54 6.39v-4.46a.63.63 0 0 0-.26-.53zm1.58-2.38l-.11-.07-3.76-2.17a.62.62 0 0 0-.62 0L9.98 9.5V7.66a.06.06 0 0 1 .03-.05l3.83-2.21a3.54 3.54 0 0 1 5.27 3.67zm-9.95 3.25l-1.59-.91a.06.06 0 0 1-.03-.05V4.78a3.54 3.54 0 0 1 5.8-2.72l-.11.06-3.76 2.17a.62.62 0 0 0-.31.54zm.86-1.86l2.05-1.18 2.05 1.18v2.36l-2.05 1.18-2.05-1.18z"
      fill="currentColor"
    />
  </svg>
);

// 4. Cursor
const CursorIcon = () => (
  <svg
    fill="currentColor"
    fillRule="evenodd"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6 text-[#E2E8F0]"
  >
    <title>Cursor</title>
    <path d="M21.503 2.497L2.497 21.503v-8.49L13.013 2.497h8.49zM2.497 2.497l8.49 8.49H2.497V2.497zM13.013 21.503l8.49-8.49v8.49h-8.49z" />
  </svg>
);

// 5. Hermes Agent
const HermesAgentIcon = () => (
  <svg
    fill="currentColor"
    fillRule="evenodd"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6 text-[#74FA6A]"
  >
    <title>Hermes Agent</title>
    <path d="M20.978 2.973c-.024.168-.13.315-.285.394-.469.24-.954.449-1.45.626-2.072.738-4.321.737-6.393 0a13.3 13.3 0 01-1.45-.626.47.47 0 00-.285-.394.46.46 0 00-.472.133 13.1 13.1 0 00-1.854 2.87 13.5 13.5 0 00-1.077 3.264c-.035.195.05.392.215.497a13.3 13.3 0 003.54 1.48c.187.047.382-.027.49-.187.35-.516.744-1.002 1.176-1.452a.466.466 0 01.53-.1.472.472 0 01.272.435c.038 1.492-.224 2.978-.77 4.368a.47.47 0 01-.4.298c-.732.062-1.467.062-2.2 0a.47.47 0 01-.4-.298 12.3 12.3 0 01-.77-4.368.472.472 0 01.272-.435.466.466 0 01.53.1c.432.45.826.936 1.176 1.452.108.16.303.234.49.187a13.3 13.3 0 003.54-1.48.473.473 0 00.215-.497 13.5 13.5 0 00-1.077-3.264 13.1 13.1 0 00-1.854-2.87.46.46 0 00-.472-.133z" />
    <path d="M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm-1 2.5a1 1 0 112 0 1 1 0 01-2 0z" />
    <path d="M5.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm13 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 16.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
  </svg>
);

// 6. Kilo Code
const KiloCodeIcon = () => (
  <svg
    fill="currentColor"
    fillRule="evenodd"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6 text-[#E2E8F0]"
  >
    <title>KiloCode</title>
    <path d="M12.825 21.05H4.15V2.95h8.675v2.85h-5.6v4.675h5.45v2.85h-5.45v4.875h5.6v2.85zm7.025 0h-3.075l-4.125-6.625 4.125-6.625h3.075l-4.125 6.625 4.125 6.625z" />
  </svg>
);

// 7. Open Claw
const OpenClawIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className="size-6"
  >
    <defs>
      <linearGradient
        id="claw_grad_a"
        x1="-694.696"
        x2="-690.195"
        y1="793.943"
        y2="789.442"
        gradientTransform="matrix(90 0 0 -100 62582 79427)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#ff4d4d" />
        <stop offset="1" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient
        id="claw_grad_b"
        x1="-672.565"
        x2="-668.064"
        y1="777.351"
        y2="772.849"
        gradientTransform="matrix(23.0719 0 0 -21.7808 15519.697 17119.95)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#ff4d4d" />
        <stop offset="1" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient
        id="claw_grad_c"
        x1="-658.669"
        x2="-654.168"
        y1="777.486"
        y2="772.985"
        gradientTransform="matrix(23.0719 0 0 -21.7808 15610.38 17119.95)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#ff4d4d" />
        <stop offset="1" stopColor="#991b1b" />
      </linearGradient>
    </defs>
    <path
      d="M256 39.3c-135 0-202.5 112.5-202.5 202.5s67.5 180 135 202.5v45h45v-45s22.5 9 45 0v45h45v-45c67.5-22.5 135-112.5 135-202.5S391 39.3 256 39.3"
      fill="url(#claw_grad_a)"
    />
    <path
      d="M76 196.8c-67.5-22.5-90 22.5-67.5 67.5s67.5 22.5 90-22.5c13.5-31.5 0-45-22.5-45"
      fill="url(#claw_grad_b)"
    />
    <path
      d="M436 196.8c67.5-22.5 90 22.5 67.5 67.5s-67.5 22.5-90-22.5c-13.5-31.5 0-45 22.5-45"
      fill="url(#claw_grad_c)"
    />
    <path
      d="M188.5 66.3c-1.2 0-2.3-.4-3.2-1.3-27.8-27.8-49.3-38.5-62-30.8-2.1 1.3-4.9.6-6.2-1.5s-.6-4.9 1.5-6.2c17.2-10.3 41.1.2 73 32.2 1.8 1.8 1.8 4.6 0 6.4-.8.7-2 1.2-3.1 1.2M326.7 65c27.8-27.8 49.3-38.5 62-30.8 2.1 1.3 4.9.6 6.2-1.5s.6-4.9-1.5-6.2c-17.2-10.3-41.1.2-73 32.2-1.8 1.8-1.8 4.6 0 6.4.9.9 2 1.3 3.2 1.3s2.2-.6 3.1-1.4"
      fill="#ff4d4d"
    />
    <path
      d="M188.5 124.8c14.9 0 27 12.1 27 27s-12.1 27-27 27-27-12.1-27-27 12.1-27 27-27m135 0c14.9 0 27 12.1 27 27s-12.1 27-27 27-27-12.1-27-27 12.1-27 27-27"
      fill="#050810"
    />
    <path
      d="M193 138.3c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9m135 0c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9"
      fill="#00e5cc"
    />
  </svg>
);

// 8. Open Code
const OpenCodeIcon = () => (
  <svg
    fill="currentColor"
    fillRule="evenodd"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6 text-[#E2E8F0]"
  >
    <title>OpenCode</title>
    <path d="M19.5 4.5h-15v15h15v-15zM3 3h18v18H3V3z" />
  </svg>
);

// 9. Open Hands
const OpenHandsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className="size-6"
  >
    <path
      d="M491.8 187.7c-16.4-9.8-27.3 5.2-25.9 25.6l-.1.2c0-21.3-2.9-44.8-12.7-63.8-3.5-6.7-10.5-17.8-24.4-12.6-6.1 2.3-11.7 9.2-8.8 27 0 0 3.2 18.7 2.6 42.1v.3c-4-64.7-19-84.4-40.4-83.1-6.9 1.2-16.2 4.1-13.1 24 0 0 3.4 20.7 4.5 37.3l.1.8h-.1c-10.1-35.7-23.7-36.1-33.5-34.8-8.9 1.3-18.7 10.3-13.7 28.1 15.5 55.8 12.4 122.9 11.3 132.6-3.2-6.6-4.1-11.8-8.5-19-17.6-29-26-31.1-36.3-31.5-10.2-.4-21.3 5.7-20.5 17.4.7 11.7 6.9 13.6 15.5 29.9 6.8 12.7 8.7 29.3 22.3 59.5 11.3 25 40.8 52.4 94.5 49.2 43.5-1.4 108.6-16.2 97.2-113.6-2.8-16.9-.7-31.1.8-45.6 2.3-22.9 5.6-60.2-10.8-70M220 261.4c-10.3.6-18.6 2.9-35.7 32.2-4.2 7.3-5.1 12.5-8.2 19.1-1.3-9.6-5.6-76.7 8.8-132.7 4.6-17.8-5.3-26.7-14.3-27.8-9.9-1.2-23.5-.5-32.9 35.5h-.1l.1-1c.8-16.5 3.8-37.3 3.8-37.3 2.7-20-6.7-22.7-13.5-23.7-21.4-.9-36 18.9-38.8 83.1-1-23.2 1.8-41.7 1.8-41.7 2.5-17.8-3.2-24.6-9.3-26.8-14-5-20.8 6.2-24.2 13-9.4 19.2-12 42.7-11.5 64l-.1-.2c.9-20.4-10.3-35.2-26.4-25.1-16.2 10-12.1 47.3-9.4 69.8 1.8 14.5 4.1 28.6 1.6 45.6-9.4 97.6 55.8 111.2 99.4 111.9 53.8 2.3 82.8-25.7 93.6-50.8 13-30.4 14.7-47.1 21.2-59.8 8.4-16.4 14.4-18.5 15-30.2.5-11.8-10.6-17.8-20.9-17.1"
      fill="#ffe165"
    />
    <path
      d="M241.5 261.5c-5.5-5.2-13.6-7.9-22-7.4-13.4.8-22.8 5.5-37.4 28.6-.4-26.4 1.1-66.1 10.1-101 3.4-13.1 0-21.7-3.5-26.5-4-5.7-10.3-9.4-17.2-10.3-6.3-.8-14.5-.8-22.5 5.6v-.2c2.6-18.7-4.1-29.5-19.8-31.9l-.9-.1c-9.7-.4-18 2.7-24.7 9.1-3.6 3.5-6.7 7.9-9.4 13.4-3-4.3-6.9-6.5-10-7.6-18.7-6.7-29.1 7.6-33.6 16.7-5.2 10.6-8.5 22.5-10.3 34.6-.4-.2-.7-.5-1.1-.7-4.1-2.3-12.7-5.1-23.9 1.8-18.9 11.8-16.5 45.9-12.8 76.8.2 1.6.4 3.3.6 4.9 1.6 12.7 3.1 24.7 1 38.8v.4C.4 345.9 8 376 26.8 396.3c18.1 19.5 46.4 29.7 83.9 30.3 2.7.1 5.4.2 8 .1 64.1-.6 87.1-42.3 92.8-55.5 7.3-17.1 11.1-29.8 14.1-40.1 2.3-7.9 4.2-14.2 6.8-19.4 3-5.9 5.6-9.7 7.9-13.1 4-5.8 7.4-10.7 7.8-20 .5-6.6-1.9-12.5-6.6-17.1"
      fill="#A855F7"
    />
  </svg>
);

// 10. Qoder
const QoderIcon = () => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6 text-[#74FA6A]"
  >
    <title>Qoder</title>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

// 11. Qwen
const QwenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="27.55 17.52 147.28 145.51"
    className="size-6"
  >
    <defs>
      <radialGradient
        id="qwen_grad_a"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(100 100) rotate(90) scale(100)"
      >
        <stop stopColor="#665CEE" />
        <stop offset="1" stopColor="#332E91" />
      </radialGradient>
      <radialGradient
        id="qwen_grad_b"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(100 100) rotate(90) scale(100)"
      >
        <stop stopColor="#665CEE" />
        <stop offset="1" stopColor="#332E91" />
      </radialGradient>
    </defs>
    <path
      d="M174.82 108.75L155.38 75L165.64 57.75C166.46 56.31 166.46 54.53 165.64 53.09L155.38 35.84C154.86 34.91 153.87 34.33 152.78 34.33H114.88L106.14 19.03C105.62 18.1 104.63 17.52 103.54 17.52H83.3C82.21 17.52 81.22 18.1 80.7 19.03L61.26 52.77H41.02C39.93 52.77 38.94 53.35 38.42 54.28L28.16 71.53C27.34 72.97 27.34 74.75 28.16 76.19L45.52 107.5L36.78 122.8C35.96 124.24 35.96 126.02 36.78 127.46L47.04 144.71C47.56 145.64 48.55 146.22 49.64 146.22H87.54L96.28 161.52C96.8 162.45 97.79 163.03 98.88 163.03H119.12C120.21 163.03 121.2 162.45 121.72 161.52L141.16 127.78H158.52C159.61 127.78 160.6 127.2 161.12 126.27L171.38 109.02C172.2 107.58 172.2 105.8 171.38 104.36L174.82 108.75Z"
      fill="url(#qwen_grad_a)"
    />
    <path
      d="M119.12 163.03H98.88L87.54 144.71H49.64L61.26 126.39H80.7L38.42 55.29H61.26L83.3 19.03L93.56 37.35L83.3 55.29H161.58L151.32 72.54L170.76 106.28H151.32L141.16 88.34L101.18 163.03H119.12Z"
      fill="white"
    />
    <path
      d="M127.86 79.83H76.14L101.18 122.11L127.86 79.83Z"
      fill="url(#qwen_grad_b)"
    />
  </svg>
);

// 12. Roo Code
const RooCodeIcon = () => (
  <svg
    fill="currentColor"
    fillRule="evenodd"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="size-6 text-[#E2E8F0]"
  >
    <title>RooCode</title>
    <path d="M20.113 5.5l-.442 1.557a.157.157 0 01-.196.106l-7.414-2.157a.16.16 0 00-.143.028l-7.342 5.74a.159.159 0 01-.074.032l-4.37.656a.154.154 0 00-.132.162l.02.245c.005.078.071.14.152.141l5.074.128.058.002 3.75-1.953a.16.16 0 01.164.01l2.657 1.847a.152.152 0 01.066.125l-.023 2.45c0 .032.01.063.028.089l3.737 5.227c.03.04.077.065.129.065h1.182a.153.153 0 00.14-.224l-2.664-4.919a.15.15 0 01.005-.152l1.389-2.169a.156.156 0 01.062-.055l4.965-2.456a.16.16 0 01.158.01l1.418.921a.16.16 0 00.087.026h1.289c.125 0 .2-.136.13-.237l-3.578-5.29c-.074-.109-.246-.082-.282.044z" />
  </svg>
);

const AI_TOOLS: AiTool[] = [
  { name: "Claude Code",   icon: <ClaudeCodeIcon />,   containerBg: "bg-[#D97757]/15 border-[#D97757]/30" },
  { name: "Cline",         icon: <ClineIcon />,        containerBg: "bg-white/[0.06] border-white/15" },
  { name: "Codex",         icon: <CodexIcon />,        containerBg: "bg-white/[0.06] border-white/15" },
  { name: "Cursor",        icon: <CursorIcon />,       containerBg: "bg-white/[0.06] border-white/15" },
  { name: "Hermes Agent",  icon: <HermesAgentIcon />,  containerBg: "bg-[#74FA6A]/15 border-[#74FA6A]/30" },
  { name: "Kilo Code",     icon: <KiloCodeIcon />,     containerBg: "bg-white/[0.06] border-white/15" },
  { name: "Open Claw",     icon: <OpenClawIcon />,     containerBg: "bg-[#EF4444]/15 border-[#EF4444]/30" },
  { name: "Open Code",     icon: <OpenCodeIcon />,     containerBg: "bg-white/[0.06] border-white/15" },
  { name: "Open Hands",    icon: <OpenHandsIcon />,    containerBg: "bg-[#A855F7]/15 border-[#A855F7]/30" },
  { name: "Qoder",         icon: <QoderIcon />,        containerBg: "bg-[#74FA6A]/15 border-[#74FA6A]/30" },
  { name: "Qwen",          icon: <QwenIcon />,         containerBg: "bg-[#6366F1]/15 border-[#6366F1]/30" },
  { name: "Roo Code",      icon: <RooCodeIcon />,      containerBg: "bg-white/[0.06] border-white/15" },
];

export function SupportedAiTools() {
  return (
    <section className="relative mx-auto max-w-[1360px] px-5 py-20 md:px-10 md:py-28" aria-label="Supported AI Tools">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[640px] rounded-full bg-[radial-gradient(circle_at_center,rgba(116,250,106,0.06),transparent_70%)] blur-3xl" />

      <div className="relative mx-auto flex max-w-[840px] flex-col items-center text-center">
        <h2 className="text-balance text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.05] tracking-[-.05em] text-[#F0F3F5]">
          Supported AI Tools
        </h2>
        <p className="mt-3.5 max-w-[62ch] text-[14px] leading-relaxed text-[#8C97A5] md:text-[15px]">
          Token Plan works with mainstream tools that support OpenAI and Anthropic protocols{" "}
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 font-medium text-[#74FA6A] underline-offset-4 transition-all hover:text-[#A8FF9B] hover:underline"
          >
            Learn More <ArrowUpRight size={14} className="inline" />
          </Link>
        </p>
      </div>

      <div className="relative mt-14 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {AI_TOOLS.map((tool, idx) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.45, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex items-center gap-3.5 overflow-hidden rounded-[20px] border border-white/[0.12] bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] px-4 py-3.5 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_12px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.28] hover:bg-white/[0.09] hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.35),0_18px_45px_-10px_rgba(0,0,0,0.65)]"
          >
            {/* Top Gloss Highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:via-white/60" />

            {/* Brand Icon Container */}
            <div
              className={`relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-105 ${
                tool.containerBg ?? "border-white/[0.15] bg-white/[0.08]"
              }`}
            >
              {tool.icon}
            </div>

            {/* Tool Name */}
            <span className="flex-1 truncate text-[14.5px] font-semibold tracking-[-0.01em] text-[#F1F5F9] transition-colors group-hover:text-white">
              {tool.name}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
