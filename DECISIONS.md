# DECISIONS.md

Keputusan desain & asumsi yang diambil selama build:

1. **In-memory storage** digunakan sebagai default. PostgreSQL+Drizzle schema tersedia (`src/db/`), tapi storage layer (`src/lib/storage.ts`) memakai Map in-memory agar UI dapat diuji tanpa DB. Saat `DATABASE_URL` tersedia, migrasi ke DB tinggal mengganti implementasi storage.

2. **Demo plan** (`/p/demo`) tersedia tanpa login untuk evaluasi UI. Ref task format `F01-S01-T01` tidak mengandung planId; server mencari task berdasarkan ref di semua plan (lihat `findTaskByRef`).

3. **CLI task routes** menerima ref saja (tanpa planId di URL) sesuai kontrak 7a. Plan ID dicari di server side.

4. **Quota & token** disimpan in-memory. Untuk produksi: pindahkan ke tabel `tokens` + `usage_events` di schema.

5. **LLM adapter** OpenAI-compatible. 3 stage, masing-masing 1 call, retry parsing 3x. Fallback: jika env LLM tidak ada, API generate return 503.

6. **Polling 5 detik** untuk progres live (sesuai spec). SSE = v2.

7. **CLI** ditulis sebagai package terpisah di `cli/`. Saat dev: `cd cli && npm install && npm run build`, lalu `node cli/dist/index.js`. Publish npm = v2.

8. **next-auth v5 beta** untuk Auth.js. Middleware melindungi `/new/*`, `/settings/*`, `/p/:planId` (kecuali demo).

9. **ZIP export** memakai implementasi ZIP writer native (no dependency) untuk menghindari tambahan package.

10. **Mindmap** React Flow dengan custom Card node. Panel detail slide-in dengan keyboard nav (Esc, ←/→).

11. **Jumlah sub-fitur dan task tidak dibatasi.** LLM menentukan jumlah berdasarkan kebutuhan produk. UI hanya meringkas tiga item per node untuk keterbacaan; seluruh item tetap tersedia di detail dan Task board.
