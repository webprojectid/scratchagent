import { hardwareSections } from "./physical-domain";
import type { Plan, Task } from "./types";

const label = (plan: Plan, en: string, id: string) => plan.generationSettings?.language === "id" ? id : en;
export function renderHardwareTask(task: Task): string {
  const h = task.hardware;
  if (!h) return "";
  return `\nExecutor: ${h.executor}\nDiscipline: ${h.discipline}\nRevision: ${h.revision}\nInputs:\n${h.inputs.map(v => `- ${v}`).join("\n")}\nTools:\n${h.tools.map(v => `- ${v}`).join("\n")}\nRequired evidence: ${h.evidenceKind}${h.reviewRequired ? "; human review required" : ""}\nState: ${h.invalidated ? "needs_revalidation" : h.waitReason ? `waiting_for_${h.waitReason}` : task.status}\nEvidence records:\n${h.evidence.map(e => `- r${e.revision} (${e.actorType}, ${e.kind}, ${e.outcome}): ${e.report}`).join("\n") || "No results have been recorded."}\n`;
}
export function renderPhysicalHandoff(plan: Plan): string {
  return `# Hardware & Robotics agent handoff\n\nRead PRD.md, FOUNDATION.md, ENGINEERING-PLAN.md, struktur.json and artifacts-manifest.json before working. Treat the brief, Foundation, exclusions and manual selections as constraints.\n\nWork only on tasks matching your available tools and executor capabilities. Use task refs and dependencies from the server. A coding agent cannot perform physical assembly, measurements or human review. Record the actual digital verification result before requesting completion. Physical evidence must be reported and reviewed through the owner's authenticated session. If waiting=true or blocked with human/parts/tool/review reasons, report the exact prerequisite and stop; do not call it generation failure or completion.\n\nDo not invent pinouts, component compatibility, test results, CAD files or fabrication outputs. Planned deliverables are not created files. Compiler/simulation success is not physical validation. Check artifact and tool versions. Do not purchase, fabricate, flash or operate devices without the owner's applicable authorization. A plan is not authorization to control hardware.\n\nDocument language: ${plan.generationSettings?.language ?? "en"}. Plan revision: ${plan.physical?.revision ?? 1}. Final report must distinguish documents generated, digital work verified, and physical validation still pending.\n`;
}
export function renderPhysicalPrd(plan: Plan): string {
  const p = plan.physical, spec = p?.spec;
  if (!p || !spec) return `# ${plan.title}\n\n${plan.brief}\n\nEngineering plan generation is still in progress.\n`;
  let md = `# ${plan.title}\n\n${label(plan, "Product requirements & engineering plan", "Kebutuhan produk & rencana engineering")}\n\n${plan.brief}\n\n${label(plan, "Document readiness is separate from physical validation.", "Kesiapan dokumen berbeda dari validasi perangkat fisik.")}\n`;
  md += `\n## Requirements\n${spec.requirements.map(r => `\n### ${r.id}\n${r.statement}\n\nSource: ${r.sourceQuote}\n\nVerification: ${r.verification}\n${r.openDecisions.map(d => `- Open: ${d}`).join("\n")}\n`).join("\n")}`;
  for (const section of spec.sections) md += `\n## ${hardwareSections[section.id][plan.generationSettings?.language === "id" ? "id" : "en"]}\n\n${section.applicability === "not_applicable" ? `${label(plan, "Not applicable", "Tidak berlaku")}: ` : ""}${section.content}\n`;
  md += `\n## BOM\n\n${spec.components.map(c => `- ${c.id}: ${c.role}; ${c.specification}; candidate=${c.candidate}; quantity=${c.quantity ?? "unknown"}; price=unverified; ${c.requirementIds.join(", ")}`).join("\n")}\n`;
  md += `\n## ${label(plan, "Assumptions & open decisions", "Asumsi & keputusan terbuka")}\n${[...spec.assumptions, ...spec.openDecisions].map(v => `- ${v}`).join("\n")}\n\n## ${label(plan, "Roadmap & tasks", "Roadmap & task")}\n`;
  for (const f of plan.features) { md += `\n### ${f.title}\n${f.description}\n`; for (const w of f.subFeatures) { md += `\n#### ${w.title}\n${w.tujuan ?? ""}\n`; for (const t of w.tasks) md += `\n##### ${t.ref}: ${t.title}\nDependencies: ${t.deps.join(", ") || "none"}\n${renderHardwareTask(t)}\n${t.detail?.deliverables.map(v => `- Deliverable: ${v}`).join("\n") ?? ""}\n${t.detail?.acceptanceCriteria.map(v => `- Acceptance: ${v}`).join("\n") ?? ""}\n`; } }
  return md;
}
function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${(/^[\s]*[=+@\-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
}
export function physicalExportFiles(plan: Plan): { name: string; content: string }[] {
  if (!plan.physical) return [];
  const spec = plan.physical.spec;
  const sectionFiles: Record<string, string> = { architecture: "ARCHITECTURE.md", verification: "TEST-PLAN.md", assembly: "ASSEMBLY-CALIBRATION.md", failure: "RISK-REGISTER.md", resources: "CONTROL-RESOURCE-PLAN.md", interfaces: "INTERFACES-CALIBRATION.md", learning: "AI-DATA-EVALUATION.md", simulation: "SIMULATION-PLAN.md" };
  const files = Object.entries(sectionFiles).flatMap(([id, name]) => { const section = spec?.sections.find(s => s.id === id && s.applicability === "required"); return section ? [{ name, content: section.content }] : []; });
  files.push({ name: "FOUNDATION.md", content: `# Foundation\n\n${JSON.stringify(plan.physical.input, null, 2)}` },
    { name: "ENGINEERING-PLAN.md", content: renderPhysicalPrd(plan) }, { name: "DECISIONS.md", content: `# Open decisions and proposed assumptions\n\n${[...(spec?.openDecisions ?? []), ...(spec?.assumptions ?? [])].map(v => `- ${v}`).join("\n")}` },
    { name: "BOM.csv", content: [["ID", "Role", "Specification", "Candidate", "Quantity", "Unit price", "Currency", "Source", "Checked at", "Status"].map(csvCell).join(","), ...(spec?.components ?? []).map(c => [c.id, c.role, c.specification, c.candidate, c.quantity, c.unitPrice, c.currency, c.source, c.checkedAt, c.status].map(csvCell).join(","))].join("\r\n") },
    { name: "TOOLCHAIN-MANIFEST.json", content: JSON.stringify({ version: 1, choices: plan.physical.input.choices, status: "proposed_unverified", requiredTools: [...new Set(plan.features.flatMap(f => f.subFeatures.flatMap(w => w.tasks.flatMap(t => t.hardware?.tools ?? []))))] }, null, 2) });
  const planned = plan.features.flatMap(f => f.subFeatures.flatMap(w => w.tasks.flatMap(t => (t.detail?.deliverables ?? []).map(description => ({ taskRef: t.ref, description, status: "planned", revision: t.hardware?.revision, evidence: t.hardware?.evidence ?? [] })))));
  files.push({ name: "artifacts-manifest.json", content: JSON.stringify({ version: 1, planRevision: plan.physical.revision, artifacts: planned }, null, 2) });
  return files;
}
