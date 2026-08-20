import type { Lang } from "./lang";

/** Semua copy halaman /docs (termasuk visual dan TOC) dalam dua bahasa. */
export function docsCopy(lang: Lang) {
  const en = lang === "en";
  return {
    badge: en ? "Documentation" : "Dokumentasi",
    heroTitle: en ? "Start from a brief, let the agent move." : "Mulai dari brief, biarkan agent bergerak.",
    heroSub: en
      ? "Scratch Agent turns a brief into a PRD and ordered tasks, then your AI agent executes it through one prompt, one task per cycle. A Free plan is available to start, no credit card."
      : "Scratch Agent mengubah brief menjadi PRD dan task terurut, lalu agent AI kamu mengeksekusinya lewat satu prompt, satu task per siklus. Tersedia paket Free untuk mulai, tanpa kartu kredit.",
    heroQuickstart: en ? "Start the quickstart" : "Mulai quickstart",
    heroConcepts: en ? "Read the concepts" : "Baca konsep",

    quickstartLabel: "01 · Quickstart",
    quickstartTitle: en ? "Five minutes to your first task." : "Lima menit sampai task pertama.",
    quickstartLead: en
      ? "Three steps, no extra setup. Each step below shows exactly what you see in the product."
      : "Tiga langkah, tanpa setup tambahan. Setiap langkah di bawah menunjukkan persis apa yang kamu lihat di produk.",

    conceptsLabel: en ? "02 · Concepts" : "02 · Konsep",
    conceptsTitle: en ? "How Scratch Agent thinks." : "Cara Scratch Agent berpikir.",
    conceptsLead: en
      ? "Every plan follows the same structure. Once you understand the pipeline, reading any plan becomes instant."
      : "Semua plan mengikuti satu struktur yang sama. Begitu kamu paham pipeline-nya, membaca plan apa pun jadi instan.",
    concepts: en
      ? [
          { t: "Plan structure", d: "Plan \u2192 Feature \u2192 Sub-feature \u2192 Task. Every task has a unique ref like F01-S02-T03." },
          { t: "Phase", d: "One feature = one phase. The agent finishes every task in that phase first before moving on, and the web progress moves with it." },
          { t: "Layer", d: "Tasks have a frontend, backend, or qa layer. Within one phase, the natural order is frontend \u2192 backend \u2192 qa." },
          { t: "Dependencies", d: "A task can depend on another task. The server always picks a task whose dependencies are done, so the agent is never out of order." },
          { t: "Checkpoint", d: "When switching phase or layer, the agent is asked to stop and report first. You verify, then tell it to continue." },
          { t: "Status", d: "Task: pending \u2192 in_progress \u2192 done | failed. Plan: generating \u2192 ready \u2192 implementing \u2192 done. A failed task blocks the plan until retried." },
        ]
      : [
          { t: "Struktur plan", d: "Plan \u2192 Feature \u2192 Sub-feature \u2192 Task. Setiap task punya ref unik seperti F01-S02-T03." },
          { t: "Fase", d: "Satu feature = satu fase. Agent menuntaskan seluruh task fase itu dulu sebelum pindah, dan progress di web ikut bergerak." },
          { t: "Layer", d: "Task punya layer frontend, backend, atau qa. Dalam satu fase, urutan alamiahnya frontend \u2192 backend \u2192 qa." },
          { t: "Dependensi", d: "Task bisa bergantung pada task lain. Server selalu memilih task yang dependensinya sudah selesai, jadi agent tidak pernah salah urutan." },
          { t: "Checkpoint", d: "Saat berpindah fase atau layer, agent diminta berhenti dan melapor dulu. Kamu verifikasi, lalu bilang lanjut." },
          { t: "Status", d: "Task: pending \u2192 in_progress \u2192 done | failed. Plan: generating \u2192 ready \u2192 implementing \u2192 done. Task gagal memblokir plan sampai di-retry." },
        ],

    promptLabel: "03 · Prompt Agent",
    promptTitle: en ? "One prompt, the agent gets to work." : "Satu prompt, agent langsung kerja.",
    promptLead: en
      ? "Every plan has an auto generated mission prompt, already containing the plan identity and full instructions. You never need to write instructions yourself or memorize any commands."
      : "Setiap plan punya prompt misi yang dibuat otomatis, sudah berisi identitas plan dan instruksi lengkap. Kamu tidak perlu menulis instruksi sendiri atau menghafal perintah apa pun.",
    promptCards: en
      ? [
          { t: "How to get it", d: "Open a plan that is ready, click the Start implementation button, and copy the prompt that appears. Your access token is already included in it." },
          { t: "What the prompt contains", d: "Instructions to connect to the plan, read the PRD, then loop: pick up the next task \u2192 do the work \u2192 mark it done. Order and dependencies are managed by the server." },
          { t: "Supported agents", d: "OpenCode, Claude Code, Cursor, Codex, and any other agent that accepts text instructions. Paste the prompt and let the agent work." },
          { t: "Safety mechanism", d: "If a task fails, the plan is blocked and the agent stops and reports. At a checkpoint, the agent waits for your verification before continuing." },
        ]
      : [
          { t: "Cara mendapatkannya", d: "Buka plan yang sudah ready, klik tombol Mulai implementasi, lalu salin prompt yang muncul. Token aksesmu sudah termasuk di dalamnya." },
          { t: "Isi prompt-nya", d: "Perintah untuk terhubung ke plan, membaca PRD, lalu loop: ambil task berikutnya \u2192 kerjakan \u2192 tandai selesai. Urutan dan dependensi diatur server." },
          { t: "Agent yang didukung", d: "OpenCode, Claude Code, Cursor, Codex, dan agent lain yang bisa menerima instruksi teks. Tempel prompt-nya, biarkan agent bekerja." },
          { t: "Mekanisme aman", d: "Jika task gagal, plan terblokir dan agent berhenti lalu melapor. Saat checkpoint, agent menunggu verifikasi darimu sebelum lanjut." },
        ],

    faqLabel: "04 · FAQ",
    faqTitle: en ? "Frequently asked." : "Yang sering ditanyakan.",
    faqs: en
      ? [
          {
            q: "Is Scratch Agent paid?",
            a: "There is a Free plan you can use without paying: 3 plan generates per 24 hours, no credit card. If you need more, the Pro plan offers unlimited generates, a priority queue, the premium AI model, and professional workflow features. The full comparison is on the Pricing page.",
          },
          {
            q: "Which AI agents are supported?",
            a: "OpenCode, Claude Code, Cursor, Codex, and any other agent that accepts text instructions. The easiest way: copy the prompt from the Start implementation button on the plan page, paste it into your agent, and let the agent run the rest.",
          },
          {
            q: "How do I get an access token?",
            a: "Log in to the website, open the Profile page, and create a new access token. The token is shown only once, so keep it safe.",
          },
          {
            q: "What happens when a task fails?",
            a: "The plan gets blocked and no further tasks are handed out until the issue is handled. The agent (or you) can read the failure reason, fix it, and retry that task to continue.",
          },
          {
            q: "Do I need a complicated setup?",
            a: "No. Just create a plan from a brief, copy the prompt, and paste it into your agent. There is no extra configuration. Everything runs from that one prompt.",
          },
          {
            q: "Where is my plan data stored?",
            a: "In the cloud (Supabase), tied to your account. Plans are private and can only be accessed with your login or your token.",
          },
        ]
      : [
          {
            q: "Apakah Scratch Agent berbayar?",
            a: "Ada paket Free yang bisa dipakai tanpa bayar: 3 generate plan per 24 jam, tanpa kartu kredit. Kalau butuh lebih, tersedia paket Pro dengan generate unlimited, antrean prioritas, premium AI model, dan fitur kerja profesional. Perbandingan lengkapnya ada di halaman Pricing.",
          },
          {
            q: "AI agent apa saja yang didukung?",
            a: "OpenCode, Claude Code, Cursor, Codex, dan agent lain yang bisa menerima instruksi teks. Cara paling mudah: salin prompt dari tombol Mulai implementasi di halaman plan, tempel ke agent kamu, sisanya agent yang jalankan.",
          },
          {
            q: "Bagaimana cara mendapatkan token akses?",
            a: "Login ke website, buka halaman Profile, lalu buat token akses baru. Token hanya ditampilkan sekali, jadi simpan baik-baik.",
          },
          {
            q: "Apa yang terjadi kalau task gagal?",
            a: "Plan akan terblokir dan task berikutnya tidak diberikan sampai masalahnya ditangani. Agent (atau kamu) bisa membaca alasan gagalnya, memperbaiki, lalu mencoba ulang task tersebut untuk melanjutkan.",
          },
          {
            q: "Apakah perlu setup yang rumit?",
            a: "Tidak. Cukup buat plan dari brief, salin prompt, dan tempel ke agent kamu. Tidak ada konfigurasi tambahan. Semuanya berjalan dari satu prompt itu.",
          },
          {
            q: "Di mana data plan saya disimpan?",
            a: "Di cloud (Supabase), terikat ke akun kamu. Plan bersifat privat dan hanya bisa diakses dengan login atau token milikmu.",
          },
        ],

    ctaTitle: en ? "Ready to turn a brief into a plan?" : "Siap mengubah brief jadi plan?",
    ctaSub: en
      ? "Create your first plan now with the Free plan: 3 generates per 24 hours, no credit card."
      : "Buat plan pertamamu sekarang dengan paket Free: 3 generate per 24 jam, tanpa kartu kredit.",
    ctaButton: en ? "Start with the Free plan" : "Mulai dari paket Free",
    footer: en
      ? "© 2026 Scratch Agent. Hire your AI agent, start with the Free plan."
      : "© 2026 Scratch Agent. Hire your AI agent, mulai dari paket Free.",

    // TOC
    tocTitle: en ? "On this page" : "Di halaman ini",
    tocItems: [
      { id: "quickstart", label: "Quickstart" },
      { id: "konsep", label: en ? "Concepts" : "Konsep" },
      { id: "prompt", label: en ? "Prompt Agent" : "Prompt Agent" },
      { id: "faq", label: "FAQ" },
    ],

    // Visuals: quickstart steps
    stepOf: en ? "Step" : "Langkah",
    quickstartSteps: en
      ? [
          { num: "1", title: "Create a plan from a brief", copy: "Log in, open the New Project page, write a short brief. Example: a cashier app for a coffee shop. The AI assembles the structure, PRD, and tasks until the plan status is ready." },
          { num: "2", title: "Copy the prompt, paste it into the agent", copy: "Click Start implementation on the plan page, copy the prompt that appears, paste it into your AI agent. The agent connects to the plan, reads the PRD, then works on its own." },
          { num: "3", title: "Watch the live progress", copy: "The task currently in progress shows a spinner, completed ones get struck through, and the progress bar moves in real time. If a task fails or hits a checkpoint, the agent stops and waits for your call." },
        ]
      : [
          { num: "1", title: "Buat plan dari brief", copy: "Login, buka halaman New Project, tulis brief singkat. Contoh: aplikasi kasir untuk kedai kopi. AI menyusun struktur, PRD, dan task sampai status plan ready." },
          { num: "2", title: "Salin prompt, tempel ke agent", copy: "Klik Mulai implementasi di halaman plan, salin prompt yang muncul, tempel ke AI agent kamu. Agent terhubung ke plan, membaca PRD, lalu bekerja otomatis." },
          { num: "3", title: "Pantau progress live", copy: "Task yang sedang dikerjakan tampil dengan spinner, yang selesai dicoret, progress bar bergerak real time. Kalau ada task gagal atau checkpoint, agent berhenti dan menunggu keputusanmu." },
        ],

    // Visuals: mock brief
    mockNewMission: en ? "New mission" : "Misi baru",
    mockQuestion: en ? "What should we build?" : "Apa yang harus dibangun?",
    mockBriefText: en
      ? "a cashier app for a coffee shop, with tables, orders, and daily reports"
      : "aplikasi kasir untuk kedai kopi, ada meja, pesanan, dan laporan harian",
    mockContinue: en ? "Continue" : "Lanjut",

    // Visuals: mock prompt
    mockMissionPrompt: en ? "Mission prompt" : "Prompt misi",
    mockStartImpl: en ? "Start implementation" : "Mulai implementasi",
    mockPlanReady: en ? "✓ plan ready: 3 phases, 28 tasks" : "✓ plan siap: 3 fase, 28 task",
    mockTokenNote: en ? "› token rv_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 already included" : "› token rv_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 sudah termasuk",
    mockPasteNote: en
      ? "Paste into OpenCode, Claude Code, or Cursor. The agent reads the PRD and then works through the tasks one by one."
      : "Tempel ke OpenCode, Claude Code, atau Cursor. Agent membaca PRD lalu mengerjakan task satu per satu.",

    // Visuals: mock progress
    mockProgressTitle: en ? "Live progress" : "Progress live",
    mockPolling: en ? "polls every 5 seconds" : "polling tiap 5 detik",
    mockTasks: en
      ? ["Create the menu catalog page", "Add search and menu filters", "Integrate the cart API"]
      : ["Buat halaman katalog menu", "Tambah pencarian dan filter menu", "Integrasikan API keranjang"],

    // Visuals: concept pipeline
    pipelineNodes: [
      { label: "Plan", sub: "brief + PRD" },
      { label: "Feature", sub: en ? "phase = feature" : "fase = feature" },
      { label: "Sub-feature", sub: en ? "problem unit" : "unit masalah" },
      { label: "Task", sub: "F01-S02-T03" },
    ],
    pipelineNote: en
      ? "Every task has a unique ref like F01-S02-T03: phase 1, sub-feature 2, task 3. The execution order is decided by the server, not the agent."
      : "Setiap task punya ref unik seperti F01-S02-T03: fase 1, sub-feature 2, task 3. Urutan eksekusi ditentukan server, bukan agent.",

    // Visuals: prompt terminal
    promptComment: en ? "# mission sent once, the agent loops on its own" : "# misi dikirim sekali, agent loop sendiri",
    promptWorking: en ? "...the agent works on this task..." : "...agent mengerjakan task ini...",
    promptFailNote: en ? "task failed \u2192 the plan is blocked, the agent stops and reports." : "task gagal \u2192 plan terblokir, agent berhenti dan lapor.",
    promptCheckpointNote: en
      ? "checkpoint \u2192 the agent waits for your verification before continuing."
      : "checkpoint \u2192 agent menunggu verifikasi darimu sebelum lanjut.",
  };
}
