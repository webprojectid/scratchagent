# DECISIONS.md

Keputusan desain & asumsi yang diambil selama build:

1. **In-memory storage** digunakan sebagai default. PostgreSQL+Drizzle schema tersedia (`src/db/`), tapi storage layer (`src/lib/storage.ts`) memakai Map in-memory agar UI dapat diuji tanpa DB. Saat `DATABASE_URL` tersedia, migrasi ke DB tinggal mengganti implementasi storage.

2. **Demo plan** (`/project/demo`) tersedia tanpa login untuk evaluasi UI, tetapi **read-only**: GET plan/progress/export publik; semua operasi write ke plan demo ditolak (403).

3. **CLI task routes wajib `planId`** (query param). Tidak ada lagi pencarian task global antar-plan (`findTaskByRef` dihapus). CLI menyimpan planId di config saat `plan get`/`task next` dan selalu mengirimnya.

4. **Quota generate** kini berbasis `usage_events` di DB (stage=`generate`, sliding window 24 jam): consume atomik via transaksi (cek jumlah event < limit lalu INSERT), **refund** (hapus event) kalau generate gagal, dan event di-finalize dengan `planId` + jumlah token LLM setelah plan tersimpan. Memory mode (tanpa `DATABASE_URL`) tetap pakai counter in-memory. Token CLI tetap di tabel `tokens`.

5. **LLM adapter** OpenAI-compatible. 3 stage, masing-masing 1 call, retry parsing 3x. Fallback: jika env LLM tidak ada, API generate return 503.

6. **Polling 5 detik** untuk progres live (sesuai spec). SSE = v2.

7. **CLI** ditulis sebagai package terpisah di `cli/`. Saat dev: `cd cli && npm install && npm run build`, lalu `node cli/dist/index.js`. Publish npm = v2.

8. **next-auth v5 beta** untuk Auth.js. Middleware melindungi `/new/*`, `/settings/*`, `/p/:planId` (kecuali demo).

9. **ZIP export** memakai implementasi ZIP writer native (no dependency) untuk menghindari tambahan package.

10. **Mindmap** React Flow dengan custom Card node. Panel detail slide-in dengan keyboard nav (Esc, ←/→).

11. **Jumlah sub-fitur dan task tidak dibatasi.** LLM menentukan jumlah berdasarkan kebutuhan produk. UI hanya meringkas tiga item per node untuk keterbacaan; seluruh item tetap tersedia di detail dan Task board.

12. **Model auth & ownership (Fase 1 hardening).** Identitas di-resolve server-side di `src/lib/api-auth.ts`: (a) Bearer token CLI, lalu (b) session Supabase dari cookie; fallback `?userId=` dari client HANYA diterima di mode dev polos (tanpa `DATABASE_URL` & Supabase, non-production). Semua endpoint plan/task/tokens/generate wajib identitas + ownership (`plan.userId` dibanding `userId`/email user); plan bukan milik user dibalas **404** (bukan 403) agar keberadaan plan orang lain tidak bocor. `/api/test/*` hanya aktif di luar production; `/api/admin/cleanup` hanya untuk email di env **`ADMIN_EMAILS`** (dipisah koma). Konsekuensi: flow login lokal (localStorage `scratch_users`) tidak punya identitas server-side — API hanya melayani user Supabase/token; migrasi penuh session Supabase = TODO #9.

13. **Migration SQL (Fase 2).** `drizzle/0001_bent_blacklash.sql` berisi delta schema vs `0000`: tambah `features.priority`, `sub_features.tujuan`, `sub_features.selesai_bila`, ganti unique global `tasks.ref` → composite `(plan_id, ref)`. **DB live sudah punya perubahan ini** (pernah di-push dari schema.ts), jadi 0001 JANGAN di-`migrate` ke DB yang sudah ada — untuk DB existing pakai `drizzle-kit push` (idempotent); 0001 dipakai oleh deploy fresh (`drizzle-kit migrate`).

14. **Dependency mapping (Fase 3).** LLM (stage 3) kini memberi tiap task `id` sementara (`t1`, `t2`, …) dan menulis `deps` sebagai daftar id tersebut. Route `generate-tasks` memetakan id→ref final saat assignment, lalu `sanitizeDeps()` (di `src/lib/generate.ts`) membuang ref tak dikenal, self-dependency, dan edge pembentuk siklus. Hasilnya scheduler `getNextTask` (yang sudah dependency-aware) kini aktif: task hanya eligible kalau semua deps-nya done.

15. **Auth client = Supabase session (Fase 3).** Identitas client-side disatukan di `src/lib/current-user.ts` (`getCurrentUser()`): baca session Supabase dulu, fallback ke localStorage `scratch_user` hanya untuk dev tanpa Supabase. Semua halaman/komponen (home, new, questions, generate, profile, settings, sidebar, project-switcher, plan-client, agent-modal) kini memakai helper ini, bukan baca localStorage langsung. `/auth/complete` tidak lagi menulis localStorage (cukup verifikasi session lalu redirect). Catatan: gating `/settings` kini cukup login (role `admin` legacy dihapus karena session Supabase tidak membawa role); login lokal email/password (premium-auth) tetap menulis localStorage sebagai fallback dev dan memanggil `refreshCurrentUser()` agar cache identitas fresh.

16. **Automated test (Fase 4).** Suite `tests/*.test.ts` dijalankan lewat `npm test` (Node built-in `node:test` + `tsx --tsconfig`, tanpa framework/dependency baru). Cakupan: `sanitizeDeps`/`buildTaskRef` (deps & ref), quota memory mode (consume/habis/refund), ownership & access isolation (`ownsPlan`, `planOwnerKey`, `accessPlan` termasuk demo read-only + 404-bukan-403), dan isi migration 0001. OAuth callback tidak diuji otomatis (butuh session Supabase riil) — diverifikasi manual di browser.

17. **Lint (Fase 4).** Peringatan lama di `generate.ts` (require→import statis `jsonrepair`, prefer-const, unused `fi`) dan `premium-auth.tsx` (unused `KeyRound`/`Phone`/`onClose`/`registrationStep`) dibersihkan. Sisa temuan lint adalah `no-explicit-any` bawaan di storage/route dan warning visual yang memang di luar scope TODO.

18. **Gate halaman plan (post-TODO).** Halaman `/project/[planId]` dan `/project/[planId]/prd` dulu (saat masih di `/p/[planId]`) memanggil `getPlan()` langsung tanpa ownership, sehingga siapa pun yang tahu ID plan bisa melihat isinya dari HTML/RSC. Kini keduanya memakai `requirePlanForPage()` (`src/lib/api-auth.ts`): demo publik; mode dev polos lolos tanpa gate; selain itu wajib session Supabase — belum login → redirect `/login`, bukan pemilik/tak ditemukan → `notFound()`. Ini menutup lubang terakhir dari hardening ownership Fase 1.

19. **Rename rute plan `/p/` → `/project/`.** Halaman plan pindah dari `/p/[planId]` ke `/project/[planId]` (identitas tetap UUID plan). Semua link internal (generate, profile, sidebar, project-switcher, home/demo) di-update. Redirect `next.config.ts` `/p/:path* → /project/:path*` (307) dijaga supaya link lama/bookmark tidak 404.
