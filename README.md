# Scratch Agent

> Hire your AI Agent. Ngoding vibe, gaya Agent.

Platform web yang mengubah brief/prompt produk menjadi PRD terstruktur (Fitur → Sub-fitur → Task), lalu task dikerjakan oleh AI coding agent eksternal lewat CLI, dengan progres terpantau live.

## Setup

### Prasyarat
- Node.js 18+
- PostgreSQL (opsional untuk dev — ada fallback in-memory)

### 1. Install dependencies
```bash
npm install
```

### 2. Konfigurasi env
```bash
cp .env.example .env
# Isi: DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET, LLM_*
```

### 3. Migrasi database (opsional)
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### 4. Jalankan
```bash
npm run dev
```
Buka http://localhost:3000

## Demo tanpa konfigurasi
- Welcome page + "Lihat contoh plan" → `/p/demo` (read-only, tanpa login)
- Mindmap, panel detail, PRD view, kanban semua bisa diuji dengan demo data

## CLI (untuk AI agent)

### Build CLI lokal
```bash
cd cli
npm install
npm run build
```

### Setup
```bash
# Login (token dari /settings di web)
node dist/index.js login --token rv_xxx

# Init skill file untuk agent
node dist/index.js init --agent opencode
```

### Loop task
```bash
node dist/index.js plan get <planId>
node dist/index.js task next --plan <planId> --json
node dist/index.js task start <ref>
# ...kerjakan task...
node dist/index.js task complete <ref>
```

### Uji dengan OpenCode
1. Login + init di project target
2. `plan get` untuk baca PRD
3. Loop `task next` → `task start` → kerjakan → `task complete`
4. Agent berhenti di checkpoint (layer/phase change) — verifikasi, lalu "lanjut"
5. Jika blocked: periksa failed tasks, `task retry` setelah perbaikan

## Tech Stack
- Next.js (App Router) + TypeScript + Tailwind CSS v4
- React Flow (@xyflow/react) untuk mindmap
- Framer Motion untuk animasi
- PostgreSQL + Drizzle ORM (schema ready, in-memory fallback untuk dev)
- NextAuth/Auth.js v5 (Google provider)
- LLM: OpenAI-compatible adapter

