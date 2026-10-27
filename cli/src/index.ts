#!/usr/bin/env node

import { Command } from "commander";
import { saveConfig, loadConfig } from "./config.js";
import { api } from "./api.js";
import { initAgent } from "./init.js";

const program = new Command();

program.name("scratch-agent").description("Hire your AI agent.").version("0.1.0");

program
  .command("login")
  .description("Simpan token akses")
  .requiredOption("--token <token>", "Token akses (rv_...)")
  .option("--url <url>", "URL server Scratch Agent (mis. https://www.scratchagent.web.id)")
  .action((opts: { token: string; url?: string }) => {
    const prev = loadConfig();
    const baseUrl = opts.url ?? prev?.baseUrl ?? "";
    saveConfig({ token: opts.token, baseUrl });
    console.log(`✓ Token disimpan · Server: ${baseUrl || "(belum diset)"}`);
    if (!baseUrl) {
      console.error("⚠ URL server belum diset. Jalankan ulang dengan --url, contoh:");
      console.error("  scratch-agent login --token <token> --url https://www.scratchagent.web.id");
    }
  });

program
  .command("init")
  .description("Tulis file skill untuk AI agent")
  .option("--agent <agent>", "opencode | claude | cursor | auto", "auto")
  .option("--domain <domain>", "software | physical", "software")
  .action((opts: { agent: string; domain: string }) => {
    initAgent(opts.agent, opts.domain);
    const config = loadConfig();
    if (config?.planId) console.log(`\nPlan aktif: ${config.planId}`);
  });

program
  .command("plan")
  .description("Operasi plan")
  .command("get <planId>")
  .description("Ambil PRD lengkap")
  .action(async (planId: string) => {
    const config = loadConfig();
    if (config) { config.planId = planId; saveConfig(config); }
    const data = (await api(`/api/v1/plans/${planId}?protocol=2`)) as { physical?: unknown; document?: string; agentHandoff?: string; title: string; brief: string; stack: string[]; asumsi: string[]; features: { title: string; description: string; tujuan: string; selesaiBila: string[] }[] };
    if (data.physical) { console.log(data.document); console.log(data.agentHandoff); return; }
    console.log(`\n# ${data.title}\n`);
    console.log(`Brief: ${data.brief}`);
    console.log(`Stack: ${data.stack.join(", ")}\n`);
    if (data.asumsi?.length) {
      console.log("Asumsi:");
      for (const a of data.asumsi) console.log(`  - ${a}`);
    }
    for (const f of data.features ?? []) {
      console.log(`\n## ${f.title}`);
      console.log(`  ${f.description}`);
      console.log(`  Tujuan: ${f.tujuan}`);
      console.log(`  Selesai bila: ${f.selesaiBila.join("; ")}`);
    }
  });

program
  .command("task")
  .description("Operasi task")
  .command("next")
  .description("Ambil task berikutnya")
  .requiredOption("--plan <planId>", "Plan ID")
  .option("--json", "Output JSON")
  .action(async (opts: { plan: string; json?: boolean }) => {
    const config = loadConfig();
    if (config) { config.planId = opts.plan; saveConfig(config); }
    const data = (await api(`/api/v1/plans/${opts.plan}/next?protocol=2`)) as { done: boolean; blocked: boolean; waiting?: { ref: string; reason: string }[]; failedTasks: { ref: string; title: string; failReason: string | null }[]; task: { ref: string; title: string; layer: string; phase: number } | null; progress: { phase: { current: number; total: number }; checkpoint: boolean; lastFailReason?: string | null } };
    if (opts.json) {
      console.log(JSON.stringify(data));
    } else {
      if (data.done) { console.log("✓ Semua task selesai"); return; }
      if (data.blocked && data.waiting?.length) {
        console.log("Waiting for prerequisites:");
        for (const task of data.waiting) console.log(`  ${task.ref}: ${task.reason}`);
        return;
      }
      if (data.blocked) {
        console.log("⛔ Blocked — task gagal:");
        for (const t of data.failedTasks) console.log(`  ${t.ref}: ${t.title} — ${t.failReason}`);
        return;
      }
      if (data.progress?.checkpoint) console.log("🛑 CHECKPOINT — verifikasi dulu, lalu perintah 'lanjut'");
      console.log(`\nTask: ${data.task?.ref}\n  ${data.task?.title}\n  Layer: ${data.task?.layer} · Phase: ${data.task?.phase}`);
    }
  });

const taskCmd = program.commands.find((c) => c.name() === "task")!;

taskCmd.command("evidence <ref>").description("Record actual digital verification for a hardware task")
  .requiredOption("--report <report>", "Observed result, not a planned result")
  .requiredOption("--revision <revision>", "Task revision from task next")
  .requiredOption("--outcome <outcome>", "pass | fail | inconclusive")
  .action(async (ref: string, opts: { report: string; revision: string; outcome: string }) => {
    const config = loadConfig();
    if (!config?.planId) throw new Error("Select a plan with plan get first.");
    await api(`/api/plans/${encodeURIComponent(config.planId)}/hardware-tasks/${encodeURIComponent(ref)}`, { method: "POST", body: JSON.stringify({ action: "evidence", outcome: opts.outcome, report: opts.report, revision: Number(opts.revision), requestId: crypto.randomUUID() }) });
    console.log("Verification result recorded; completion remains subject to review requirements.");
  });

// planId wajib untuk semua operasi task (tidak ada lagi fallback pencarian global).
function planQs(): string {
  const config = loadConfig();
  if (!config?.planId) {
    console.error("Plan aktif belum diset. Jalankan dulu: scratch-agent plan get <planId>");
    process.exit(1);
  }
  return `?planId=${encodeURIComponent(config.planId)}`;
}

taskCmd.command("start <ref>").description("Mulai task").action(async (ref: string) => { await api(`/api/v1/tasks/${encodeURIComponent(ref)}/start${planQs()}`, { method: "POST" }); console.log(`▶ ${ref} dimulai`); });
taskCmd.command("complete <ref>").description("Selesaikan task").action(async (ref: string) => { await api(`/api/v1/tasks/${encodeURIComponent(ref)}/complete${planQs()}`, { method: "POST" }); console.log(`✓ ${ref} selesai`); });
taskCmd.command("fail <ref> [reason...]").description("Tandai task gagal").action(async (ref: string, reason: string[]) => { const r = Array.isArray(reason) ? reason.join(" ") : "Tanpa alasan"; await api(`/api/v1/tasks/${encodeURIComponent(ref)}/fail${planQs()}`, { method: "POST", body: JSON.stringify({ reason: r }) }); console.log(`✕ ${ref} gagal: ${r}`); });
taskCmd.command("retry <ref>").description("Reset task gagal ke pending").action(async (ref: string) => { await api(`/api/v1/tasks/${encodeURIComponent(ref)}/retry${planQs()}`, { method: "POST" }); console.log(`↻ ${ref} direset ke pending`); });

program.parse();
