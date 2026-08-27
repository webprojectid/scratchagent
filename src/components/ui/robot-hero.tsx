// Robot hero SVG murni: 0 JS, 0 network fetch, animasi transform/opacity GPU.
// Menggantikan Spline 3D (~6.5MB runtime + 1.3MB scene) di halaman /new
// supaya halaman render instan dan bebas jank.
"use client";

export function RobotHero() {
  return (
    <div className="robot-hero-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 320 300"
        className="robot-hero-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Orbit ring belakang */}
        <ellipse cx="160" cy="150" rx="128" ry="46" className="robot-orbit robot-orbit-a" />
        <ellipse cx="160" cy="150" rx="128" ry="46" className="robot-orbit robot-orbit-b" transform="rotate(38 160 150)" />
        <ellipse cx="160" cy="150" rx="128" ry="46" className="robot-orbit robot-orbit-c" transform="rotate(-38 160 150)" />

        {/* Titik-titik node di orbit */}
        <circle cx="288" cy="150" r="3.5" className="robot-node robot-node-1" />
        <circle cx="46" cy="132" r="2.5" className="robot-node robot-node-2" />
        <circle cx="238" cy="188" r="2" className="robot-node robot-node-3" />

        {/* Badan robot */}
        <g className="robot-float">
          {/* Antena */}
          <line x1="160" y1="52" x2="160" y2="34" stroke="#3A4A44" strokeWidth="3" strokeLinecap="round" />
          <circle cx="160" cy="28" r="6" className="robot-antenna" />

          {/* Kepala */}
          <rect x="96" y="50" width="128" height="96" rx="28" fill="#131A18" stroke="#2C3A35" strokeWidth="1.5" />
          {/* Visor */}
          <rect x="110" y="66" width="100" height="52" rx="20" fill="#0A0F0D" stroke="#74FA6A33" strokeWidth="1" />
          {/* Mata */}
          <g className="robot-eyes">
            <rect x="128" y="84" width="18" height="10" rx="5" fill="#74FA6A" />
            <rect x="174" y="84" width="18" height="10" rx="5" fill="#74FA6A" />
          </g>
          {/* Mulut waveform */}
          <g className="robot-mouth">
            <line x1="140" y1="104" x2="140" y2="112" stroke="#74FA6A" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="152" y1="101" x2="152" y2="115" stroke="#74FA6A" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="164" y1="104" x2="164" y2="112" stroke="#74FA6A" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="176" y1="101" x2="176" y2="115" stroke="#74FA6A" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Telinga */}
          <rect x="88" y="82" width="8" height="28" rx="4" fill="#2C3A35" />
          <rect x="224" y="82" width="8" height="28" rx="4" fill="#2C3A35" />

          {/* Leher */}
          <rect x="146" y="146" width="28" height="14" fill="#1B2421" />

          {/* Tubuh */}
          <path
            d="M104 172 C104 160 216 160 216 172 L212 236 C212 248 108 248 108 236 Z"
            fill="#131A18"
            stroke="#2C3A35"
            strokeWidth="1.5"
          />
          {/* Panel dada */}
          <rect x="132" y="188" width="56" height="36" rx="10" fill="#0A0F0D" stroke="#74FA6A26" strokeWidth="1" />
          {/* Core berdenyut */}
          <circle cx="160" cy="206" r="10" className="robot-core" />
          <circle cx="160" cy="206" r="10" className="robot-core-pulse" />

          {/* Lengan */}
          <rect x="82" y="178" width="16" height="56" rx="8" fill="#1B2421" stroke="#2C3A35" strokeWidth="1" className="robot-arm-l" />
          <rect x="222" y="178" width="16" height="56" rx="8" fill="#1B2421" stroke="#2C3A35" strokeWidth="1" className="robot-arm-r" />

          {/* Base shadow */}
          <ellipse cx="160" cy="256" rx="64" ry="8" className="robot-shadow" />
        </g>
      </svg>
    </div>
  );
}
