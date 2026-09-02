import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config.js";

function agentsMd(serverUrl: string): string {
 const serverLine = serverUrl
  ? `Server Scratch Agent: ${serverUrl}`
  : `Server Scratch Agent: (lihat output 'scratch-agent login' di bawah)`;
 return `# Scratch Agent Agent

Kamu akan mengerjakan task dari Scratch Agent lewat CLI scratch-agent (package npm: @notdeadlysins/scratch-agent).
Prasyarat: Node.js + Python 3.x.

${serverLine}
Scratch Agent hanyalah CLI client: PRD, task, dan progress hidup di server Scratch Agent (cloud).
JANGAN menjalankan server/dev server Scratch Agent sendiri (npm run dev, next dev, dsb).
JANGAN mengarahkan atau memproyeksikan server Scratch Agent ke localhost.
Jika koneksi ke server gagal, laporkan error koneksi ke user, lalu berhenti.

## Install Skill Scratch Agent v2.4 (penting)
Cek apakah sudah terpasang: \\\`uipro --version\\\`.
- Jika SUDAH: lanjut.
- Jika BELUM: install sekali lalu lanjut (TIDAK perlu restart):
\\\`\\\`\\\`
npm install -g ui-ux-pro-max-cli
uipro init --ai opencode --global
\\\`\\\`\\\`
Saat mengerjakan task UI/frontend: CEK apakah Skill Scratch Agent aktif otomatis.
Jika aktif, terapkan rekomendasinya (warna, tipografi, layout, best practice).
Jika tidak aktif, beri tau user (mungkin perlu sesi baru agar ter-load), lalu
tetap lanjutkan dengan best practice UI umum.

## Langkah 1 — Install CLI, login & init (sekali saja)
\\\`\\\`\\\`
npm install -g @notdeadlysins/scratch-agent
scratch-agent login --token <TOKEN> --url <URL_SERVER>
scratch-agent init --agent opencode
\\\`\\\`\\\`
Gunakan URL server Scratch Agent yang diberikan user (mis. https://www.scratchagent.web.id).
Jangan arahkan --url ke localhost.

## Langkah 2 — Baca PRD (sekali)
\\\`\\\`\\\`
scratch-agent plan get <PLAN_ID>
\\\`\\\`\\\`

## Langkah 3 — LOOP kerjakan SATU task per siklus
\\\`\\\`\\\`
scratch-agent task next --plan <PLAN_ID> --json
scratch-agent task start <REF>
# ...kerjakan task ini (eksplor kode dulu, ikuti pola project)...
scratch-agent task complete <REF>
\\\`\\\`\\\`

Jika ke-block:
\\\`\\\`\\\`
scratch-agent task fail <REF> "alasan singkat"
\\\`\\\`\\\`

Ulangi sampai done=true.

## Aturan
- Jika task next menyertakan last_fail_reason: BACA dulu, ganti pendekatan.
- Jika respons blocked=true: berhenti, lapor daftar task gagal, tunggu perintah.
- Jika respons checkpoint=true: JANGAN mulai task. Berhenti, lapor, tunggu "lanjut".
- Jangan borong task; percayakan urutan ke server.
- Server Scratch Agent BUKAN bagian dari project yang kamu kerjakan. Project-mu
  (Vite/Next.js/dst) dan server Scratch Agent itu dua hal berbeda.

## Langkah 4 — Setelah done=true
Jalankan aplikasi sekali lagi, verifikasi semua alur utama melawan "selesai bila"
tiap fitur. Lampirkan checklist di laporan akhir. Jika ada rusak, lapor jujur.
`;
}

const CURSOR_RULES = `# Scratch Agent Cursor Rules

${agentsMd(loadConfig()?.baseUrl ?? "")}

## Mode
Kerjakan satu task per sesi. Ikuti urutan server. Berhenti di checkpoint.
`;

export function initAgent(agent: string): void {
 const cwd = process.cwd();
 const md = agentsMd(loadConfig()?.baseUrl ?? "");

 if (agent === "opencode" || agent === "codex" || agent === "auto") {
  writeFileSync(join(cwd, "AGENTS.md"), md);
  console.log("✓ AGENTS.md ditulis");
 }

 if (agent === "claude" || agent === "auto") {
  writeFileSync(join(cwd, "CLAUDE.md"), md);
  const skillsDir = join(cwd, ".claude", "skills");
  if (!existsSync(skillsDir)) mkdirSync(skillsDir, { recursive: true });
  writeFileSync(join(skillsDir, "Scratch Agent.md"), md);
  console.log("✓ CLAUDE.md + .claude/skills/ ditulis");
 }

 if (agent === "cursor" || agent === "auto") {
  const cursorDir = join(cwd, ".cursor");
  if (!existsSync(cursorDir)) mkdirSync(cursorDir, { recursive: true });
  writeFileSync(join(cursorDir, "rules"), CURSOR_RULES);
  console.log("✓ .cursor/rules ditulis");
 }
}

