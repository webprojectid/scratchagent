import type { Plan, Task } from "./types";

export function renderProductSpec(plan: Plan): string {
  const spec = plan.productSpec;
  if (!spec) return "";
  const en = plan.generationSettings?.language !== "id";
  const label = (english: string, indonesian: string) => en ? english : indonesian;
  const list = (items: string[]) => items.map(item => `- ${item}`).join("\n");
  const tasks = plan.features.flatMap(f => f.subFeatures.flatMap(s => s.tasks));
  return `
### ${label("Product problem and intended outcomes", "Masalah produk dan hasil yang dituju")}
${spec.problem}

**${label("Audience", "Pengguna")}**: ${spec.audiences.join("; ")}
${list(spec.outcomes)}

### ${label("Scope and requirement traceability", "Cakupan dan penelusuran kebutuhan")}
${spec.requirements.map(r => `- **${r.id} · ${r.priority}** ${r.statement}\n  - ${label("Source", "Sumber")}: ${r.sourceQuote}\n  - ${label("Flows", "Alur")}: ${(plan.userFlow ?? []).filter(flow => flow.requirementIds?.includes(r.id)).map(flow => flow.title).join("; ") || "—"}\n  - ${label("Prerequisites", "Prasyarat")}: ${(r.dependsOn ?? []).join(", ") || "—"}\n  - ${label("Implementation", "Implementasi")}: ${tasks.filter(t => t.detail?.requirementIds.includes(r.id)).map(t => t.ref).join(", ") || label("Tasks not generated yet", "Task belum dibuat")}\n  - ${label("Verification scenarios", "Skenario pengujian")}: ${r.verification.join(", ")}`).join("\n")}

### ${label("Explicit exclusions", "Pengecualian eksplisit")}
${spec.outOfScope.length ? list(spec.outOfScope) : label("No explicit exclusions supplied.", "Tidak ada pengecualian eksplisit dari brief.")}

### ${label("Decisions and open questions", "Keputusan dan pertanyaan terbuka")}
${spec.decisions.map(d => `- **${d.topic} · ${d.status}**: ${d.value}${d.sourceQuote ? `\n  - ${label("Evidence", "Bukti")}: ${d.sourceQuote}` : ""}`).join("\n")}

### ${label("Success measurement", "Pengukuran keberhasilan")}
${spec.metrics.map(m => `- **${m.name}**: ${m.definition}\n  - ${label("Measurement", "Pengukuran")}: ${m.measurement}\n  - Target: ${m.target}`).join("\n")}

### ${label("Risks and responsible owners", "Risiko dan penanggung jawab")}
${spec.risks.map(r => `- **${r.risk}** — ${r.mitigation} (${r.owner})`).join("\n")}

### ${label("Rollout", "Peluncuran")}
${list(spec.rollout.stages)}

**${label("Release checks", "Pemeriksaan rilis")}**
${list(spec.rollout.releaseChecks)}

**Rollback**
${list(spec.rollout.rollback)}
`;
}

export function renderTaskDetail(task: Task): string {
  const detail = task.detail;
  if (!detail) return "";
  return `\n${detail.objective}\n\nRequirements: ${detail.requirementIds.join(", ")}\n\nDeliverables:\n${detail.deliverables.map(d => `- ${d}`).join("\n")}\n\nAcceptance criteria:\n${detail.acceptanceCriteria.map(c => `- ${c}`).join("\n")}\n\nVerification:\n${detail.tests.map(t => `- **${t.scenario}**: ${t.action} → ${t.expected}`).join("\n")}\n`;
}
