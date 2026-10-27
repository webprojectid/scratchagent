import { handoffInstructions, type HandoffSettings } from "./account-preferences";

function buildPhysicalAgentPrompt(planId: string, token: string, serverUrl: string, settings: HandoffSettings): string {
  return `${settings.language === "id" ? "Kerjakan bagian digital dari rencana mesin/robot ini sesuai kemampuan tools. Tugas fisik dan review manusia harus menunggu pemilik." : "Work on the digital portions of this machines/robotics plan within your actual tool capabilities. Physical tasks and human review must wait for the owner."}

Use the authenticated server API directly with a tool available in your environment (for example Node.js fetch). Do not assume the published CLI already supports this hardware protocol.
Server: ${serverUrl}
Authorization: Bearer ${token}
Read plan: GET /api/v1/plans/${planId}?protocol=2
Next runnable task: GET /api/v1/plans/${planId}/next?protocol=2
Start: POST /api/v1/tasks/<ref>/start?planId=${planId}
Record digital result: POST /api/plans/${planId}/hardware-tasks/<ref> with JSON {"action":"evidence","outcome":"pass|fail|inconclusive","revision":<task revision>,"report":"actual verification result","requestId":"<new UUID>"}
Complete: POST /api/v1/tasks/<ref>/complete?planId=${planId}
Wait: POST /api/plans/${planId}/hardware-tasks/<ref> with JSON {"action":"wait","revision":<task revision>,"reason":"parts|human|review|tool"}
Resume after your missing digital tool is available: same endpoint with {"action":"resume","revision":<task revision>}. Human/parts/review prerequisites must be resumed by the owner.
Keep the token private. It is scoped to this plan. Never put it in source, logs or exported files.

Read the entire PRD, Foundation, engineering sections, component decisions, open decisions, dependency graph and handoff before working. Task discipline and executor are authoritative. Never impose a web app, cloud, database or deployment on hardware. Check required tools, versions and artifact formats. Report an actual capability inventory (available tools, versions, supported formats, unavailable items) before starting. If a tool is unavailable, mark the task waiting for tool, then ask for the next independent task; never substitute fabricated artifacts. Do not install or operate unavailable physical tools as a shortcut.

For runnable digital tasks, start through the API, perform and verify actual work, then record digital evidence for the task revision. Only then request completion. Follow server review requirements. Never invent physical measurements, simulation results, CAD/PCB files, approvals or compatibility. Preserve the owner's manual selections.

If waiting contains human/parts/review/tool prerequisites, report them and stop when no digital task can run. The owner's browser session must report physical results and human review. Do not treat waiting as provider failure or plan completion. A compiler/simulator pass does not validate physical hardware. Do not buy, fabricate, flash or operate devices without applicable owner authorization.

The Scratch Agent API is separate from the device being built. Final report must distinguish generated documents, verified digital work, and outstanding physical validation. Write the report in ${settings.language === "id" ? "Indonesian" : "English"}.`;
}

export function buildAgentPrompt(planId: string, token: string, serverUrl: string, settings: HandoffSettings, physical = false): string {
  if (physical) return buildPhysicalAgentPrompt(planId, token, serverUrl, settings);
  const agent = ["claude", "cursor", "opencode"].includes(settings.agent) ? settings.agent : "auto";
  const commands = `npm install -g @notdeadlysins/scratch-agent
scratch-agent login --token ${token} --url ${serverUrl}
scratch-agent init --agent ${agent}
scratch-agent plan get ${planId}

scratch-agent task next --plan ${planId} --json
scratch-agent task start <ref>
# Implement and verify this task before marking it complete.
scratch-agent task complete <ref>
# If blocked: scratch-agent task fail <ref> "reason"`;
  const english = `Implement this ScratchAgent plan in the target project. Node.js is required.

Server API: ${serverUrl}
The ScratchAgent API stores the PRD, tasks, and progress. It is separate from the app you are building. Do not start, modify, or invent a local ScratchAgent server. If the API cannot be reached, report the connection error and stop.

Read the target repository's AGENTS.md and relevant documentation first. Follow its conventions and existing design system. Review the full PRD, requirements, acceptance criteria, dependencies, and additional ideas before editing code.

Set up the CLI once, then repeat the task commands one task at a time:
${commands}

Rules:
- Use the server's task order and dependency graph.
- Read last_fail_reason before retrying; change the approach that failed.
- If blocked=true, report the blocked tasks and stop.
- If checkpoint=true, stop before starting another task and wait for the owner.
- Review relevant additional ideas with each task.
- Verify acceptance criteria before marking a task complete. Never invent credentials, test results, or completed work.
- Respect the owner's language, scope, stack, and agent preferences below.

When done=true, run the app, verify its main flows against feature acceptance criteria, and report the evidence and unresolved issues.`;
  const indonesian = `Kerjakan plan ScratchAgent ini di folder proyek tujuan. Node.js diperlukan.

Server API: ${serverUrl}
PRD, tugas, dan progres disimpan di API ScratchAgent. Server ini terpisah dari aplikasi yang Anda bangun. Jangan menjalankan, mengubah, atau membuat server ScratchAgent lokal. Jika API tidak bisa dihubungi, laporkan masalah koneksi dan berhenti.

Baca AGENTS.md dan dokumentasi proyek terlebih dahulu. Ikuti pola kode dan sistem desain yang sudah digunakan. Tinjau PRD, kebutuhan, kriteria penerimaan, dependensi, serta ide tambahan sebelum mengubah kode.

Siapkan CLI sekali, lalu ulangi perintah tugas satu per satu:
${commands}

Aturan:
- Ikuti urutan tugas dan dependensi dari server.
- Baca last_fail_reason sebelum mencoba ulang; perbaiki pendekatan yang gagal.
- Jika blocked=true, laporkan tugas yang terhambat lalu berhenti.
- Jika checkpoint=true, berhenti sebelum memulai tugas berikutnya dan tunggu pemilik proyek.
- Gunakan ide tambahan yang relevan sebagai konteks.
- Verifikasi kriteria penerimaan sebelum menandai tugas selesai. Jangan mengarang kredensial, hasil pengujian, atau pekerjaan yang belum selesai.
- Ikuti pilihan bahasa, cakupan, teknologi, dan agent di bawah.

Saat done=true, jalankan aplikasi, verifikasi alur utama berdasarkan kriteria penerimaan fitur, lalu laporkan bukti dan masalah yang tersisa.`;
  return (settings.language === "en" ? english : indonesian) + "\n\n" + handoffInstructions(settings);
}
