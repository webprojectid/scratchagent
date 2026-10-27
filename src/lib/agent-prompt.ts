import { handoffInstructions, type HandoffSettings } from "./account-preferences";

export function buildAgentPrompt(planId: string, token: string, serverUrl: string, settings: HandoffSettings): string {
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
