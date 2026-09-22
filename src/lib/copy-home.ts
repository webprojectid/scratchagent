import type { Lang } from "./lang";

/** Semua copy halaman utama dalam dua bahasa. */
export function homeCopy(lang: Lang) {
  const en = lang === "en";
  return {
    banner: en
      ? "Scratch Agent is free forever. Need more? Go Pro"
      : "Scratch Agent gratis selamanya. Butuh lebih? Upgrade ke Pro",

    heroA: en ? "A clear plan." : "Rencana yang jelas.",
    heroB: en ? "An agent that keeps moving." : "Agent yang terus bergerak.",
    heroSub: en
      ? "Write a short brief. Get ordered tasks and ready-to-use context, so your agent can start on the next step right away."
      : "Tulis brief singkat, dapat task terurut dan konteks siap pakai. Agent tinggal jalan.",
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
    mockSubFeatures: en ? ["Daily schedule", "Slot selection", "Real-time check"] : ["Jadwal harian", "Pemilihan slot", "Verifikasi realtime"],
    mockTaskTitle: "TASK",
    mockTasks: en ? ["Build schedule page", "Slot booking API", "Payment integration"] : ["Buat halaman jadwal", "API booking slot", "Integrasi payment"],
    mockAgentLabel: en ? "active agent" : "agent aktif",
    mockAgentTask: en ? "Add nearby court search." : "Tambah pencarian lapangan terdekat.",
    mockNextTask: en ? "next task" : "task berikutnya",
    mockDepsReady: en ? "dependencies ready" : "dependensi ready",
    mockPlanProgress: en ? "plan progress 39 percent, context saved on the server" : "progress plan 39 persen, konteks tersimpan di server",

    // Product section
    productEyebrow: "the planning cloud for agents",
    productTitle: en ? "Full context for your agent, in one flow." : "Konteks penuh untuk agent dalam satu flow.",
    features: en
      ? [
          { label: "PRD ENGINE", title: "Brief → ordered graph.", copy: "Assumptions enriched. Features, sub-features, tasks, deps." },
          { label: "AGENT-NATIVE RUNTIME", title: "Built for focused execution.", copy: "One active task. Status, layer, checkpoint all readable." },
          { label: "TASK GRAPH", title: "Deterministic ordering.", copy: "Frontend, backend, QA. The server decides the order." },
          { label: "LIVE PROGRESS", title: "Watch the agent move.", copy: "Five second polling. Telemetry stays visible." },
        ]
      : [
          { label: "PRD ENGINE", title: "Brief → ordered graph.", copy: "Assumptions diperkaya. Features, sub-features, tasks, deps." },
          { label: "AGENT-NATIVE RUNTIME", title: "Built for focused execution.", copy: "Satu task aktif. Status, layer, checkpoint terbaca." },
          { label: "TASK GRAPH", title: "Deterministic ordering.", copy: "Frontend, backend, QA. Server yang putusin urutan." },
          { label: "LIVE PROGRESS", title: "Lihat agent gerak.", copy: "Polling 5 detik. Telemetry always terlihat." },
        ],

    // Terminal mini copy
    termBrief: en ? "brief: 'music studio booking'" : "brief: 'booking studio musik'",
    termPhases: en ? "✓ 03 phases · 09 sub-features" : "✓ 03 phase · 09 sub-feature",
    termReadingPrd: en ? "Reading the PRD" : "Maca PRD",
    termBuildingGraph: en ? "Building the graph" : "Ngarsain graph",
    termWaitingAgent: en ? "Waiting for the agent" : "Nunggu agent",
    termNext: "next",
    termDone: "done",
    termActiveLine: en ? "active · 03   done today · 08   checkpoint false" : "active · 03   done hari ini · 08   checkpoint false",

    // Solutions section
    solutionsEyebrow: "solutions",
    solutionsTitle: en ? "One flow, many ways of working." : "Satu flow, banyak cara kerja.",
    solutionsSub: en
      ? "From side projects to client briefs, Scratch Agent turns ideas into plans your agent can run right away."
      : "Dari side project sampe brief klien, Scratch Agent ubah ide jadi plan yang bisa langsung dijalanin agent.",
    solutions: en
      ? [
          { label: "SOLO DEV", title: "Side projects never stall.", copy: "Write a short brief, get a complete plan. The agent works through the tasks one by one, you just review the results.", points: ["A 5 minute brief becomes an execution-ready plan", "Agent progress is visible live on the web", "Resume anytime without losing context"] },
          { label: "FREELANCER / AGENCY", title: "Client briefs become professional PRDs.", copy: "Turn a client brief into a structured PRD with features, acceptance criteria, and a clear scope before coding starts.", points: ["PRD + task graph ready to present", "Measurable scope from features & sub-features", "Execution can be handed to a coding agent"] },
          { label: "AGENT OPERATOR", title: "A coding agent that never gets confused.", copy: "Using OpenCode, Claude Code, or Cursor? Give them an ordered plan with dependencies and checkpoints, not guesses.", points: ["Deterministic task order from the server", "Checkpoints for manual verification", "Automatic retry when a task fails"] },
        ]
      : [
          { label: "SOLO DEV", title: "Side project gak mangkrak.", copy: "Tulis brief singkat, dapat plan lengkap. Agent kerjain task satu per satu, kamu tinggal review hasilnya.", points: ["Brief 5 menit jadi plan siap eksekusi", "Progress agent kelihatan live di web", "Lanjut kapan aja tanpa loss konteks"] },
          { label: "FREELANCER / AGENCY", title: "Brief klien jadi PRD profesional.", copy: "Ubah brief klien jadi PRD terstruktur dengan features, acceptance criteria, scope jelas sebelum coding dimulai.", points: ["PRD + task graph siap dipresentasi", "Scope terukur dari features & sub-features", "Eksekusi bisa diserahkan ke coding agent"] },
          { label: "AGENT OPERATOR", title: "Coding agent gak bingung.", copy: "Pakai OpenCode, Claude Code, atau Cursor? Kasih mereka ordered plan dengan dependencies & checkpoint, bukan tebak-tebakan.", points: ["Task order deterministik dari server", "Checkpoint buat verifikasi manual", "Auto retry kalo task gagal"] },
        ],

    // Agents section
    agentsEyebrow: en ? "prompt agent" : "prompt agent",
    agentsTitleA: en ? "Hire an agent." : "Sewa agent.",
    agentsTitleB: en ? "Send the mission." : "Kirim misinya.",
    agentsSub: en
      ? "Copy one prompt, paste it into your favorite AI agent. The agent connects to the plan automatically, reads the PRD, and works through tasks one by one. Order, dependencies, and checkpoints are managed by the server."
      : "Copy satu prompt, paste ke AI agent favoritmu. Agent auto connect ke plan, baca PRD, kerjain task satu per satu. Order, dependencies, checkpoint diatur server.",

    // Prompt showcase
    promptReadyBadge: "ready to paste",
    promptAgentAny: en ? "agent: any" : "agent: apa aja",
    promptSteps: en
      ? [
          { label: "Connect to the plan & read the PRD" },
          { label: "Pick up the next task, order set by the server" },
          { label: "Do the task, then mark it done" },
          { label: "Repeat until every task is done" },
        ]
      : [
          { label: "Connect ke plan & baca PRD" },
          { label: "Ambil task berikutnya, order diatur server" },
          { label: "Kerjain task, tandai done" },
          { label: "Repeat sampe semua task done" },
        ],
    promptFoot: en
      ? "Stop & report when a task fails or hits a checkpoint. Copy the prompt from the 'Start implementation' button, paste it into OpenCode, Claude Code, Cursor, etc."
      : "Stop & lapor kalo ada task gagal atau checkpoint. Copy prompt dari tombol 'Start implementation', paste ke OpenCode, Claude Code, Cursor, dll.",

    footerTagline: en ? "Hire your AI agent. Start with the Free plan." : "Hire AI agent kamu. Mulai dari paket Free.",
    footerCreate: en ? "create plan" : "buat plan",
  };
}
