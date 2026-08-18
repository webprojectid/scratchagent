import type { Lang } from "./lang";

/** Semua copy halaman utama dalam dua bahasa. */
export function homeCopy(lang: Lang) {
  const en = lang === "en";
  return {
    banner: en
      ? "Scratch Agent is free forever. Need more? Upgrade to Pro"
      : "Scratch Agent selamanya gratis. Jika membutuhkan lebih silahkan upgrade ke Pro",

    heroA: en ? "A clear plan." : "Rencana yang jelas.",
    heroB: en ? "An agent that keeps moving." : "Agent yang terus bergerak.",
    heroSub: en
      ? "Turn a brief into ordered tasks, ready-to-use context, and a next step your agent can act on right away."
      : "Ubah brief menjadi task terurut, konteks siap pakai, dan langkah berikutnya yang bisa langsung dikerjakan agent.",
    heroStart: en ? "Start" : "Mulai",
    heroDemo: en ? "Watch the demo" : "Lihat demo",

    // Mission control mock
    mockPlanLabel: "plan",
    mockPlanItems: en ? ["Structure", "PRD", "Tasks", "Checkpoint"] : ["Struktur", "PRD", "Task", "Checkpoint"],
    mockPhase: "PHASE",
    mockProjectTitle: "PROJECT",
    mockProjectName: "FutsalGo",
    mockPhaseOrder: en ? ["Search", "Booking", "Payment"] : ["Pencarian", "Booking", "Pembayaran"],
    mockSubFeatureTitle: "SUB-FITUR",
    mockSubFeatures: en ? ["Daily schedule", "Slot selection", "Realtime check"] : ["Jadwal harian", "Pemilihan slot", "Verifikasi realtime"],
    mockTaskTitle: "TASK",
    mockTasks: en ? ["Build schedule page", "Slot booking API", "Payment integration"] : ["Buat halaman jadwal", "API booking slot", "Integrasi payment"],
    mockAgentLabel: en ? "active agent" : "agent aktif",
    mockAgentTask: en ? "Add nearby court search." : "Tambah pencarian lapangan terdekat.",
    mockNextTask: en ? "next task" : "task berikutnya",
    mockDepsReady: en ? "dependencies ready" : "dependensi ready",
    mockPlanProgress: en ? "plan progress 39 percent, context saved on the server" : "progress plan 39 persen, konteks tersimpan di server",

    // Product section
    productEyebrow: "the planning cloud for agents",
    productTitle: en ? "Full context for your agent, in one flow." : "Konteks penuh untuk agent dalam satu alur.",
    features: en
      ? [
          { label: "PRD ENGINE", title: "Brief \u2192 ordered graph.", copy: "Assumptions enriched. Features, sub-features, tasks, deps." },
          { label: "AGENT-NATIVE RUNTIME", title: "Built for focused execution.", copy: "One active task. Status, layer, checkpoint all readable." },
          { label: "TASK GRAPH", title: "Deterministic ordering.", copy: "Frontend, backend, QA. The server decides the order." },
          { label: "LIVE PROGRESS", title: "Watch the agent move.", copy: "Five second polling. Telemetry stays visible." },
        ]
      : [
          { label: "PRD ENGINE", title: "Brief \u2192 graph terurut.", copy: "Asumsi diperkaya. Feature, sub-feature, task, deps." },
          { label: "AGENT-NATIVE RUNTIME", title: "Built untuk eksekusi fokus.", copy: "Satu task aktif. Status, layer, checkpoint terbaca." },
          { label: "TASK GRAPH", title: "Ordering deterministik.", copy: "Frontend, backend, QA. Server menentukan urutan." },
          { label: "LIVE PROGRESS", title: "Lihat agent bergerak.", copy: "Polling lima detik. Telemetry tetap terlihat." },
        ],

    // Terminal mini copy
    termBrief: en ? "brief: \u201Cmusic studio booking\u201D" : "brief: \u201Cbooking studio musik\u201D",
    termPhases: en ? "\u2713 03 phases \u00b7 09 sub-features" : "\u2713 03 fase \u00b7 09 sub-fitur",
    termReadingPrd: en ? "Reading the PRD" : "Membaca PRD",
    termBuildingGraph: en ? "Building the graph" : "Menyusun graph",
    termWaitingAgent: en ? "Waiting for the agent" : "Menunggu agent",
    termNext: "next",
    termDone: "done",
    termActiveLine: en ? "active \u00b7 03 \u00a0 done today \u00b7 08 \u00a0 checkpoint false" : "active \u00b7 03 \u00a0 done today \u00b7 08 \u00a0 checkpoint false",

    // Solutions section
    solutionsEyebrow: "solutions",
    solutionsTitle: en ? "One flow, many ways of working." : "Satu alur, berbagai cara kerja.",
    solutionsSub: en
      ? "From side projects to client briefs, Scratch Agent turns ideas into plans your agent can execute right away."
      : "Dari side project sampai brief klien, Scratch Agent mengubah ide jadi rencana yang bisa langsung dieksekusi agent.",
    solutions: en
      ? [
          { label: "SOLO DEV", title: "Side projects never stall.", copy: "Write a short brief, get a complete plan. The agent works through the tasks one by one, you just review the results.", points: ["A 5 minute brief becomes an execution-ready plan", "Agent progress is visible live on the web", "Resume anytime without losing context"] },
          { label: "FREELANCER / AGENCY", title: "Client briefs become professional PRDs.", copy: "Turn a client brief into a structured PRD with features, acceptance criteria, and a clear scope before coding starts.", points: ["PRD + task graph ready to present", "Measurable scope from features & sub-features", "Execution can be handed to a coding agent"] },
          { label: "AGENT OPERATOR", title: "A coding agent that never gets confused.", copy: "Using OpenCode, Claude Code, or Cursor? Give them an ordered plan with dependencies and checkpoints, not guesses.", points: ["Deterministic task order from the server", "Checkpoints for manual verification", "Automatic retry when a task fails"] },
        ]
      : [
          { label: "SOLO DEV", title: "Side project gak mangkrak.", copy: "Tulis brief singkat, dapatkan rencana lengkap. Agent mengerjakan task satu per satu, kamu tinggal review hasilnya.", points: ["Brief 5 menit jadi plan siap eksekusi", "Progress agent kelihatan live di web", "Lanjut kapan saja tanpa kehilangan konteks"] },
          { label: "FREELANCER / AGENCY", title: "Brief klien jadi PRD profesional.", copy: "Ubah brief klien menjadi PRD terstruktur dengan feature, kriteria selesai, dan scope yang jelas sebelum coding dimulai.", points: ["PRD + task graph siap dipresentasikan", "Scope terukur dari feature & sub-feature", "Eksekusi bisa diserahkan ke agent coding"] },
          { label: "AGENT OPERATOR", title: "Agent coding yang gak bingung.", copy: "Pakai OpenCode, Claude Code, atau Cursor? Beri mereka plan terurut dengan dependensi dan checkpoint, bukan tebakan.", points: ["Urutan task deterministik dari server", "Checkpoint untuk verifikasi manual", "Retry otomatis saat task gagal"] },
        ],

    // Agents section
    agentsEyebrow: en ? "prompt agent" : "prompt agent",
    agentsTitleA: en ? "Hire an agent." : "Sewa agent.",
    agentsTitleB: en ? "Send the mission." : "Kirim misinya.",
    agentsSub: en
      ? "Copy one prompt, paste it into your favorite AI agent. The agent connects to the plan automatically, reads the PRD, and works through tasks one by one. Order, dependencies, and checkpoints are managed by the server."
      : "Salin satu prompt, tempel ke AI agent favoritmu. Agent otomatis terhubung ke plan, membaca PRD, dan mengerjakan task satu per satu. Urutan, dependensi, dan checkpoint diatur server.",

    // Prompt showcase
    promptReadyBadge: en ? "ready to paste" : "siap tempel",
    promptAgentAny: en ? "agent: any" : "agent: apa saja",
    promptSteps: en
      ? [
          { label: "Connect to the plan & read the PRD" },
          { label: "Pick up the next task, order set by the server" },
          { label: "Do the task, then mark it done" },
          { label: "Repeat until every task is done" },
        ]
      : [
          { label: "Terhubung ke plan & membaca PRD" },
          { label: "Ambil task berikutnya, urutan diatur server" },
          { label: "Kerjakan task, lalu tandai selesai" },
          { label: "Ulangi sampai semua task done" },
        ],
    promptFoot: en
      ? "Stop & report when a task fails or hits a checkpoint. Copy the prompt from the \u201CStart implementation\u201D button, paste it into OpenCode, Claude Code, Cursor, etc."
      : "Berhenti & lapor jika ada task gagal atau checkpoint. Salin prompt dari tombol \u201CMulai implementasi\u201D, tempel ke OpenCode, Claude Code, Cursor, dll.",

    footerTagline: en ? "Hire your AI agent. Start with the Free plan." : "Hire your AI agent. Mulai dari paket Free.",
    footerCreate: en ? "create plan" : "buat plan",
  };
}
