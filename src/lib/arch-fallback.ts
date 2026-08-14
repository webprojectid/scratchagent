import type { Plan } from "./types";

/**
 * Fallback deterministik untuk architecture & database schema.
 * Dipakai kalau LLM gagal/kosong, supaya PRD tidak pernah tampil kosong.
 * ponytail: template generik berbasis stack + fitur. Upgrade path: ganti dengan
 * hasil LLM begitu model yang dipakai konsisten mengisi kedua field ini.
 */

function slugToEntity(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase().slice(0, 24) || "ENTITY";
}

const MERMAID_RE = /```mermaid/i;

/** Ambil blok ```mermaid ... ``` pertama dari sebuah teks (null kalau gak ada). */
function extractMermaid(text: string): string | null {
  const m = text.match(/```mermaid[\s\S]*?```/i);
  return m ? m[0] : null;
}

export function buildFallbackArchitecture(title: string, stack: string[], featureTitles: string[]): string {
  const frontend = stack.find((s) => /next|react|vue|svelte|nuxt/i.test(s)) ?? "Next.js";
  const backend = stack.find((s) => /node|express|nest|fastify|django|laravel|go|rust/i.test(s)) ?? "API Routes";
  const database = stack.find((s) => /postgre|mysql|mongo|sqlite|supabase|planetscale/i.test(s)) ?? "PostgreSQL";

  const featureNodes = featureTitles
    .slice(0, 6)
    .map((f, i) => `    API --> F${i + 1}[${f.replace(/[[\]|]/g, "")}]`)
    .join("\n");

  return `## Ringkasan Arsitektur

${title} dibangun sebagai aplikasi web dengan pemisahan jelas antara lapisan presentasi, lapisan aplikasi, dan lapisan data. Lapisan presentasi memakai ${frontend} dengan rendering hybrid: halaman publik di-render statis untuk kecepatan dan SEO, sedangkan halaman yang bergantung pada sesi pengguna di-render di server per request. Pendekatan ini dipilih karena mayoritas trafik membaca konten, bukan menulis.

Lapisan aplikasi ditangani ${backend}. Semua mutasi data melewati satu titik validasi sebelum menyentuh database, sehingga aturan bisnis tidak tersebar di banyak tempat. Autentikasi memakai session berbasis cookie httpOnly. Endpoint yang menerima input publik dilindungi rate limiting untuk meredam abuse.

Lapisan data memakai ${database} sebagai sumber kebenaran tunggal. Data yang sering dibaca dan jarang berubah di-cache di lapisan aplikasi dengan invalidasi berbasis event, bukan berbasis waktu, supaya tidak ada data basi setelah mutasi.

## Trade-off yang Diambil

- **Monolith modular, bukan microservices.** Tim kecil dan domain masih berubah cepat. Microservices menambah biaya operasional tanpa manfaat nyata pada skala ini. Konsekuensi: perlu disiplin menjaga batas modul agar tidak jadi big ball of mud.
- **Relational, bukan document store.** Relasi antar entitas di produk ini cukup padat sehingga join lebih murah daripada denormalisasi manual.
- **Server-side rendering untuk halaman publik.** Menambah beban server, tapi menang di SEO dan first paint.

## Penanganan Error dan Skalabilitas

Kegagalan dependensi eksternal ditangani dengan timeout eksplisit dan retry terbatas dengan exponential backoff, bukan retry tak terbatas. Error tak terduga ditangkap di error boundary dan dicatat dengan konteks request. Untuk skala, titik jenuh pertama biasanya database, sehingga connection pooling dan indeks pada kolom filter utama disiapkan sejak awal.

\`\`\`mermaid
flowchart TD
    U[Pengguna] --> CDN[CDN / Edge Cache]
    CDN --> FE[${frontend}]
    FE --> API[${backend}]
    API --> AUTH[Autentikasi & Session]
    API --> CACHE[Cache Layer]
    API --> DB[(${database})]
${featureNodes}
    API --> LOG[Logging & Monitoring]
\`\`\``;
}

export function buildFallbackDatabaseSchema(featureTitles: string[]): string {
  const entities = featureTitles.slice(0, 5).map((f) => ({
    name: slugToEntity(f),
    label: f,
  }));

  const tableDocs = entities
    .map(
      (e) => `### Tabel ${e.name.toLowerCase()}

Menyimpan data untuk fitur "${e.label}".

- \`id\` (uuid, PK) — kunci utama, uuid dipilih agar id tidak bisa ditebak dan aman untuk diekspos di URL.
- \`user_id\` (uuid, FK -> users.id, INDEX) — pemilik record. Diindeks karena hampir semua query memfilter kolom ini.
- \`title\` (varchar(200), NOT NULL) — dibatasi panjangnya agar tidak menampung payload liar.
- \`status\` (varchar(24), NOT NULL, INDEX) — dipakai untuk filter daftar, sehingga perlu indeks.
- \`created_at\` (timestamptz, NOT NULL, DEFAULT now()) — timestamptz dipakai supaya zona waktu tidak ambigu.
- \`updated_at\` (timestamptz, NOT NULL) — untuk audit dan cache invalidation.`,
    )
    .join("\n\n");

  const erdEntities = entities
    .map(
      (e) => `    ${e.name} {
        uuid id PK
        uuid user_id FK
        varchar title
        varchar status
        timestamptz created_at
    }`,
    )
    .join("\n");

  const erdRelations = entities.map((e) => `    USERS ||--o{ ${e.name} : owns`).join("\n");

  return `### Tabel users

Tabel inti untuk identitas pengguna.

- \`id\` (uuid, PK) — kunci utama.
- \`email\` (varchar(255), UNIQUE, NOT NULL) — unique constraint mencegah duplikasi akun sekaligus berfungsi sebagai indeks lookup saat login.
- \`name\` (varchar(120)) — nama tampilan.
- \`created_at\` (timestamptz, NOT NULL, DEFAULT now()).

${tableDocs}

## Catatan Performa

- **Risiko N+1**: pengambilan daftar entitas beserta relasinya berpotensi memicu query per baris. Mitigasi: gunakan join atau batch loading, bukan query di dalam loop.
- **Hot path**: query berdasarkan \`user_id\` + \`status\` adalah jalur terpanas. Composite index \`(user_id, status)\` lebih efektif daripada dua indeks terpisah.
- **Foreign key**: semua FK memakai \`ON DELETE CASCADE\` supaya tidak meninggalkan record yatim saat pengguna dihapus.

\`\`\`mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email
        varchar name
        timestamptz created_at
    }
${erdEntities}
${erdRelations}
\`\`\``;
}

export function applyArchFallback(
  plan: Pick<Plan, "title" | "stack" | "features">,
  architecture: string,
  databaseSchema: string,
): { architecture: string; databaseSchema: string; usedFallback: string[] } {
  const usedFallback: string[] = [];
  const featureTitles = plan.features.map((f) => f.title);

  let arch = architecture?.trim() ?? "";
  let db = databaseSchema?.trim() ?? "";

  if (!arch) {
    arch = buildFallbackArchitecture(plan.title, plan.stack ?? [], featureTitles);
    usedFallback.push("architecture");
  } else if (!MERMAID_RE.test(arch)) {
    // LLM kasih narasi tapi TANPA diagram → suntikkan diagram dari fallback
    // supaya arsitektur selalu tergambar.
    const diagram = extractMermaid(buildFallbackArchitecture(plan.title, plan.stack ?? [], featureTitles));
    if (diagram) arch = `${arch}\n\n${diagram}`;
    usedFallback.push("architecture:diagram");
  }

  if (!db) {
    db = buildFallbackDatabaseSchema(featureTitles);
    usedFallback.push("databaseSchema");
  } else if (!MERMAID_RE.test(db)) {
    // Sama: narasi ada tapi tanpa ERD → suntikkan ERD dari fallback.
    const diagram = extractMermaid(buildFallbackDatabaseSchema(featureTitles));
    if (diagram) db = `${db}\n\n${diagram}`;
    usedFallback.push("databaseSchema:diagram");
  }

  return { architecture: arch, databaseSchema: db, usedFallback };
}
