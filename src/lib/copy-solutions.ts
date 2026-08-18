import type { Lang } from "./lang";

/** Semua copy halaman /solutions dalam dua bahasa. */
export function solutionsCopy(lang: Lang) {
  const en = lang === "en";
  return {
    heroEyebrow: "solutions",
    heroTitle: en ? "One workflow, three ways to build." : "Satu alur kerja, tiga cara membangun.",
    heroSub: en
      ? "Scratch Agent turns a brief into a complete plan: structure, PRD, and ordered tasks. The only thing that changes is how you use it. Pick your profile and follow the flow from start to result."
      : "Scratch Agent mengubah brief menjadi plan lengkap: struktur, PRD, dan task terurut. Yang berbeda cuma cara kamu memakainya. Pilih profil kamu dan lihat alurnya dari awal sampai hasil.",
    personas: [
      { id: "solo-dev", label: "Solo dev" },
      { id: "freelancer", label: en ? "Freelancer / agency" : "Freelancer / agency" },
      { id: "operator", label: en ? "Agent operator" : "Agent operator" },
    ],
    problemLabel: en ? "The problem" : "Masalahnya",
    helpLabel: en ? "How Scratch Agent helps" : "Cara Scratch Agent bantu",

    soloEyebrow: "01 · solo dev",
    soloTitle: en ? "Side projects never stall again." : "Side project gak mangkrak lagi.",
    soloProblem: en
      ? "Side projects usually die not because the idea is bad, but because you burn out on setup and boilerplate first. Leave it for a week, the context in your head is gone, and starting again feels heavy."
      : "Side project biasanya mati bukan karena idenya jelek, tapi karena habis tenaga duluan di setup dan boilerplate. Ditinggal seminggu, konteks di kepala hilang, dan mulai lagi terasa berat.",
    soloHelp: en
      ? "Write a 5 minute brief, Scratch Agent assembles the structure, PRD, and ordered tasks until they are ready to execute. The project context lives in the plan, not in your head, so you can pick it up anytime without losing direction."
      : "Tulis brief 5 menit, Scratch Agent menyusun struktur, PRD, dan task terurut sampai siap dieksekusi. Konteks proyek tinggal di plan, bukan di kepala kamu, jadi bisa lanjut kapan saja tanpa kehilangan arah.",
    soloCta: en ? "Start with the Free plan" : "Mulai dari paket Free",

    freeEyebrow: "02 · freelancer / agency",
    freeTitle: en ? "Client briefs become professional PRDs." : "Brief klien jadi PRD profesional.",
    freeProblem: en
      ? "Client briefs are often ambiguous: lots of wants, few details. Scope negotiation drags, estimates become guesses, and unexpected revisions show up mid project."
      : "Brief klien sering ambigu: keinginan banyak, detail sedikit. Negosiasi scope jadi tarik ulur, estimasi jadi tebakan, dan revisi tak terduga muncul di tengah jalan.",
    freeHelp: en
      ? "Feed in the client brief, Scratch Agent builds a structured PRD with features, acceptance criteria, and a clear scope before coding starts. You can present it straight to the client as a shared reference. Once agreed, hand the execution to a coding agent with the same plan."
      : "Masukkan brief klien, Scratch Agent menyusun PRD terstruktur dengan feature, kriteria selesai, dan scope yang jelas sebelum coding dimulai. Hasilnya bisa langsung dipresentasikan ke klien sebagai acuan bersama. Setelah sepakat, eksekusinya diserahkan ke agent coding dengan plan yang sama.",
    freeCta: en ? "See the Pro plan" : "Lihat paket Pro",

    opEyebrow: "03 · agent operator",
    opTitle: en ? "A coding agent that never gets confused." : "Agent coding yang gak bingung.",
    opProblem: en
      ? "OpenCode, Claude Code, or Cursor work great when the instructions are clear. The moment instructions get ambiguous, the agent starts guessing: the work order falls apart, context gets wasted, and the result has to be torn down and rebuilt."
      : "OpenCode, Claude Code, atau Cursor bekerja bagus kalau instruksinya jelas. Begitu instruksinya ambigu, agent mulai menebak: urutan kerja berantakan, konteks terbuang, dan hasilnya harus dibongkar ulang.",
    opHelp: en
      ? "Scratch Agent gives your agent an ordered plan with dependencies and checkpoints, not guesses. Task order is decided by the server, so the agent never takes a wrong step. When a task fails, the agent stops and reports. At a checkpoint, the agent waits for your verification before continuing."
      : "Scratch Agent memberi agent kamu plan terurut dengan dependensi dan checkpoint, bukan tebakan. Urutan task ditentukan server, jadi agent tidak pernah salah langkah. Saat task gagal, agent berhenti dan melapor. Saat checkpoint, agent menunggu verifikasi darimu sebelum lanjut.",
    opCta: en ? "Read how the prompt works" : "Baca cara kerja prompt",

    closingText: en
      ? "However you build, it all starts with one brief. Try the Free plan: 3 generates per 24 hours, no credit card."
      : "Apa pun cara kamu membangun, semuanya mulai dari satu brief. Coba paket Free: 3 generate per 24 jam, tanpa kartu kredit.",
    closingCta: en ? "Create your first plan" : "Buat plan pertama",
    footer: en
      ? "© 2026 Scratch Agent. Hire your AI agent, start with the Free plan."
      : "© 2026 Scratch Agent. Hire your AI agent, mulai dari paket Free.",

    // Mock visuals
    briefLabel: en ? "your brief" : "brief kamu",
    briefSample: en
      ? "\u201CBuild a simple habit tracker app: add habits, daily checkoffs, streaks, and a weekly chart.\u201D"
      : "\u201CBikin aplikasi habit tracker sederhana, bisa tambah kebiasaan, centang tiap hari, ada streak, dan grafik mingguan.\u201D",
    briefRows: en
      ? [
          { label: "Product structure", detail: "4 features, 12 sub-features", state: "done" },
          { label: "Complete PRD", detail: "goals, user stories, acceptance criteria", state: "done" },
          { label: "Ordered tasks", detail: "18 tasks, dependencies set by server", state: "done" },
          { label: "Agent execution", detail: "task 7 of 18 running", state: "live" },
        ]
      : [
          { label: "Struktur produk", detail: "4 feature, 12 sub-feature", state: "done" },
          { label: "PRD lengkap", detail: "tujuan, user story, kriteria selesai", state: "done" },
          { label: "Task terurut", detail: "18 task, dependensi diatur server", state: "done" },
          { label: "Eksekusi agent", detail: "task 7 dari 18 berjalan", state: "live" },
        ],
    briefReady: en ? "ready" : "siap",
    briefProgress: en ? "plan progress 39 percent, context saved on the server" : "progress plan 39 persen, konteks tersimpan di server",

    prdLabel: en ? "prd · ready to present" : "prd · siap dipresentasikan",
    prdTitle: en ? "Online Coffee Shop" : "Toko Kopi Online",
    prdMeta: en ? "generated from a client brief, 1 brief in" : "dihasilkan dari brief klien, 1 brief masuk",
    prdFeatureLabel: en ? "feature 2 · product ordering" : "feature 2 · pemesanan produk",
    prdFeatureItems: en
      ? [
          "Shopping cart with real time quantity updates",
          "Checkout with order summary and shipping fee",
          "Order confirmation sent to the buyer's email",
        ]
      : [
          "Keranjang belanja dengan update jumlah real time",
          "Checkout dengan ringkasan pesanan dan ongkir",
          "Konfirmasi pesanan dikirim ke email pembeli",
        ],
    prdCriteriaLabel: en ? "acceptance criteria" : "kriteria selesai",
    prdCriteriaItems: en
      ? [
          "Orders are recorded completely and visible in the admin dashboard",
          "Buyers receive confirmation without needing to log in",
        ]
      : [
          "Pesanan tercatat lengkap dan bisa dilihat di dashboard admin",
          "Pembeli menerima konfirmasi tanpa perlu login",
        ],
    prdScope: "scope: 6 feature, 21 task",
    prdAgreed: en ? "shared client reference ✓" : "acuan bersama klien ✓",

    missionLabel: en ? "agent mission" : "misi agent",
    missionLines: en
      ? [
          "copy the mission prompt from your plan, paste it into your favorite agent",
          "agent connects to the plan, reads the PRD, understands full context",
          "pick up task #3 \u201CAuth: login form\u201D",
          "do the work, report the result",
          "checkpoint: waiting for your verification",
          "task failed? agent stops and reports, never guesses",
        ]
      : [
          "salin prompt misi dari plan kamu, tempel ke agent favoritmu",
          "agent terhubung ke plan, membaca PRD, paham konteks penuh",
          "ambil task #3 \u201CAuth: form login\u201D",
          "kerjakan, laporkan hasil",
          "checkpoint: menunggu verifikasi kamu",
          "task gagal? agent berhenti dan melapor, bukan menebak",
        ],
    missionPause: en ? "pause" : "jeda",
    missionSafe: en ? "safe" : "aman",
  };
}
