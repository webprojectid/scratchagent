import type { Lang } from "./lang";

/** Copy untuk interactive workspace demo */
export function workspaceCopy(lang: Lang) {
  const en = lang === "en";
  return {
    // Header & Nav
    searchPlaceholder: en ? "Search features…" : "Cari fitur…",
    projectLabel: en ? "Project features" : "Fitur project",
    openFullPlan: en ? "Open full plan" : "Buka plan lengkap",
    
    // Breadcrumb
    breadcrumbHome: en ? "FutsalGo" : "FutsalGo",
    breadcrumbWorkPlan: en ? "Work plan" : "Rencana kerja",
    
    // Roadmap tab
    roadmapTabTitle: en ? "Roadmap" : "Roadmap",
    roadmapSubFeatureTitle: en ? "Sub-feature" : "Sub-fitur",
    roadmapDescription: en ? "Feature roadmap → sub-feature PRD → ordered agent tasks." : "Rintisan fitur → PRD sub-fitur → task terurut buat agent.",
    
    // PRD tab
    prdTabTitle: en ? "PRD" : "PRD",
    productRequirements: en ? "PRODUCT REQUIREMENTS" : "PERSYARATAN PRODUK",
    acceptanceCriteria: en ? "Acceptance criteria" : "Kriteria penerimaan",
    fromSpecToExec: en ? "From specification to execution" : "Dari spesifikasi ke eksekusi",
    seeTasksInSession: en ? "View session tasks" : "Lihat task sesi ini",
    
    // Tasks tab
    tasksTabTitle: en ? "Tasks" : "Tasks",
    executionQueue: en ? "EXECUTION QUEUE" : "ANTRIAN EKSEKUSI",
    taskExcerptNote: en ? "A task excerpt from the FutsalGo plan. Select a task for details." : "Cuplikan task dari plan FutsalGo. Pilih task buat lihat detail.",
    
    // Agent context panel
    agentContext: en ? "Agent context" : "Konteks agent",
    activeSubFeature: en ? "Active sub-feature" : "Sub-fitur aktif",
    layerOrder: en ? "Layer order" : "Urutan layer",
    
    // Terminal
    terminalTitle: en ? "Terminal · scratch-agent" : "Terminal · scratch-agent",
    pipelineInfo: en ? "Roadmap › PRD › Task active. One task per cycle." : "Roadmap › PRD › Task aktif. Satu task per siklus.",
    commandPrompt: "$",
    pipelineLabel: en ? "pipeline" : "pipeline",
    statusLabel: en ? "status" : "status",
    layerLabel: en ? "layer" : "layer",
    checkpointLabel: en ? "checkpoint" : "checkpoint",
    
    // Progress bar
    remainingTasks: en ? "tasks remaining in demo session" : "task tersisa di sesi demo",
    
    // Decision box
    layerChangeReview: en ? "Layer change. Review the work before continuing." : "Ganti layer. Review hasil sebelum lanjut.",
    taskFailedSim: en ? "Simulated task failure. Reset task to try again." : "Task gagal simulasi. Reset task buat coba lagi.",
    sessionComplete: en ? "Session complete. Explore another feature or replay." : "Sesi selesai. Jelajahi fitur lain atau ulangi.",
    agentWorking: en ? "The agent is working on this task…" : "Agent lagi kerjain task ini…",
    runNextTask: en ? "Run the next task?" : "Jalankan task berikutnya?",
    
    // Buttons
    continueAfterReview: en ? "Continue after review" : "Lanjut setelah review",
    completeTask: en ? "Complete task" : "Selesaikan task",
    startTask: en ? "Start task" : "Mulai task",
    simulateFailure: en ? "Simulate failure" : "Simulasikan gagal",
    replaySession: en ? "Replay session" : "Ulangi sesi",
    retryTask: en ? "Retry task" : "Coba lagi",
    
    // Footer
    localSimulation: en ? "Local simulation · no code execution" : "Simulasi lokal · tanpa jalankan kode",
    resetDemo: en ? "Reset demo" : "Reset demo",
    playDemo: en ? "Play demo" : "Putar demo",
    pauseDemo: en ? "Pause demo" : "Jeda demo",
    
    // Caption
    captionText: en ? "Try it: choose a feature, read the PRD, then run a task in the terminal." : "Coba: pilih fitur, baca PRD, lalu jalanin task di terminal.",
    viewFutsalGoPlan: en ? "View the FutsalGo plan" : "Lihat plan FutsalGo",
    
    // Labels
    phaseLabel: en ? "Phase" : "Phase",
    tasksCount: en ? "tasks" : "task",
    subFeaturesCount: en ? "sub-features" : "sub-fitur",
    sessionSelected: en ? "Selected session" : "Sesi dipilih",
    viewPlan: en ? "View plan" : "Lihat plan",
  };
}
