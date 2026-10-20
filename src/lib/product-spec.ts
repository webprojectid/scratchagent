import { unconfirmedNumericClaims } from "./requirements-quality";
import { z } from "zod";

const sentence = z.string().trim().min(3).max(800);
export const productSpecSchema = z.object({
  problem: sentence,
  audiences: z.array(sentence).min(1).max(8),
  outcomes: z.array(sentence).min(1).max(6),
  requirements: z.array(z.object({
    id: z.string().regex(/^R\d{2,3}$/), statement: sentence, sourceQuote: sentence,
    priority: z.enum(["must", "should", "could"]),
    dependsOn: z.array(z.string()).max(10).default([]),
    verification: z.array(z.enum(["success", "failure", "duplicate", "concurrency", "recovery"])).min(1).max(5),
  })).min(4).max(30),
  decisions: z.array(z.object({
    id: z.string(), topic: sentence, status: z.enum(["confirmed", "proposed", "open"]), value: sentence,
    sourceQuote: z.string().max(800),
  })).max(20),
  entities: z.array(z.object({ name: z.string().regex(/^[a-z][a-z0-9_]*$/), fields: z.array(z.string().trim().min(1).max(120)).min(1).max(16) })).min(2).max(20),
  states: z.array(z.object({ entity: sentence, values: z.array(sentence).min(2).max(12) })).max(10),
  outOfScope: z.array(sentence).max(12),
  metrics: z.array(z.object({ name: sentence, definition: sentence, measurement: sentence, target: sentence })).min(1).max(5),
  risks: z.array(z.object({ risk: sentence, mitigation: sentence, owner: sentence })).min(1).max(8),
  rollout: z.object({ stages: z.array(sentence).min(1).max(5), releaseChecks: z.array(sentence).min(1).max(8), rollback: z.array(sentence).min(1).max(6) }),
});
export type ProductSpec = z.infer<typeof productSpecSchema>;

/** Resolve punctuation/case differences to the user's exact original excerpt. */
export function alignProductEvidence(spec: ProductSpec, source: string): ProductSpec {
  const tokens = [...source.matchAll(/[\p{L}\p{N}]+/gu)];
  const excerpt = (quote: string): string => {
    if (!quote || source.includes(quote)) return quote;
    const words = [...quote.matchAll(/[\p{L}\p{N}]+/gu)].map(match => match[0].toLowerCase());
    if (!words.length) return quote;
    const start = tokens.findIndex((_, index) => words.every((word, offset) => tokens[index + offset]?.[0].toLowerCase() === word));
    if (start < 0) return quote;
    const first = tokens[start], last = tokens[start + words.length - 1];
    return source.slice(first.index!, last.index! + last[0].length);
  };
  return { ...spec, requirements: spec.requirements.map(requirement => ({ ...requirement, sourceQuote: excerpt(requirement.sourceQuote) })), decisions: spec.decisions.map(decision => ({ ...decision, sourceQuote: excerpt(decision.sourceQuote) })) };
}

export const productSpecInstructions = `Extract a product decision contract before planning phases. Do not invent research or committed business numbers. Requirements must cover all explicitly requested workflows, including registration and administrative operations. Use R01, R02 etc. sourceQuote must be an EXACT excerpt from the supplied brief or confirmed answers. Group closely related actions, but never omit a requested workflow. verification MUST use ONLY these exact enum strings: success, failure, duplicate, concurrency, recovery. Select scenarios actually needed for that requirement. Keep the contract concise. dependsOn lists only true prerequisite requirement IDs; form an acyclic delivery dependency graph, not a sequential user-flow chain. Mutual runtime interactions are not delivery prerequisites; leave dependsOn empty for those.
Entities MUST use lowercase snake_case names matching /^[a-z][a-z0-9_]*$/, for example users, course_lessons or payment_events. They define canonical table names and essential fields used by all following sections. states.entity must be a declared entity and values are the only state names for that entity. Prefer a small coherent model over duplicate tables.
decisions separate confirmed facts with exact sourceQuote from proposed choices and open questions. A confirmed decision requires evidence. Unspecified business policies, budgets, SLAs, numeric thresholds and providers remain OPEN: do not assign arbitrary default numbers. Describe metrics with definition and measurement; use target "Not established; confirm baseline and target" when unspecified. Write risks with a responsible role, plus practical rollout checks and rollback actions. outOfScope contains explicitly excluded capabilities only.
Return JSON with exactly this structure:
{"problem":"...","audiences":["..."],"outcomes":["..."],"requirements":[{"id":"R01","statement":"...","sourceQuote":"exact brief excerpt","priority":"must","dependsOn":[],"verification":["success","failure"]}],"decisions":[{"id":"D01","topic":"...","status":"open","value":"Confirm policy before implementation","sourceQuote":""}],"entities":[{"name":"users","fields":["id","email"]},{"name":"projects","fields":["id","status"]}],"states":[{"entity":"projects","values":["draft","active"]}],"outOfScope":[],"metrics":[{"name":"...","definition":"...","measurement":"...","target":"Not established; confirm baseline and target"}],"risks":[{"risk":"...","mitigation":"...","owner":"..."}],"rollout":{"stages":["..."],"releaseChecks":["..."],"rollback":["..."]}}`;

export function validateProductSpec(spec: ProductSpec, source: string): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const requirement of spec.requirements) {
    if (ids.has(requirement.id)) issues.push(`Duplicate requirement ID ${requirement.id}`);
    ids.add(requirement.id);
    if (!source.includes(requirement.sourceQuote)) issues.push(`${requirement.id}.sourceQuote must be an exact source excerpt`);
  }
  const active = new Set<string>(), visited = new Set<string>();
  const byId = new Map(spec.requirements.map(r => [r.id, r]));
  function visit(id: string): void {
    if (active.has(id)) { const index = spec.requirements.findIndex(r => r.id === id); issues.push(`requirements[${index}].dependsOn: cycle involving ${[...active, id].join(" -> ")}; remove user-flow ordering edges or group mutually dependent workflows, retaining only acyclic delivery prerequisites`); return; }
    if (visited.has(id)) return;
    active.add(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) {
      if (!ids.has(dep)) issues.push(`${id}: unknown prerequisite ${dep}`);
      else visit(dep);
    }
    active.delete(id); visited.add(id);
  }
  for (const id of ids) visit(id);
  for (const decision of spec.decisions) {
    if (decision.status === "confirmed" && (!decision.sourceQuote || !source.includes(decision.sourceQuote))) issues.push(`${decision.id}: confirmed decision needs an exact source excerpt; otherwise mark open`);
  }
  const entities = new Set(spec.entities.map(entity => entity.name));
  if (entities.size !== spec.entities.length) issues.push("Canonical entity names must be unique");
  for (const state of spec.states) if (!entities.has(state.entity)) issues.push(`Unknown state entity ${state.entity}`);
  return issues;
}

export const technicalGroundingRules = `TECHNICAL GROUNDING: Use canonical entity and state names; do not introduce synonyms for the same table/status. Unknown business numeric policies remain configurable open decisions throughout subfeatures AND tasks. A unique pair constraint does NOT detect graph cycles; use graph traversal/recursive CTE. A database transaction cannot atomically commit a third-party API: use idempotency, an outbox/reconciliation state and compensating recovery. An UPSERT alone does not resolve stale cross-device updates; specify event version/conflict policy. Supabase signed URLs already issued remain usable until expiry and may be cached: blocking NEW token issuance is not immediate revocation; require a request-time entitlement gate and cache policy if immediate revocation is required. Never promise invalidation through RLS alone for an existing signed URL. Do not prescribe a vendor-specific webhook algorithm without a verified product/version reference: otherwise describe verification via the official SDK as an open integration decision. Multi-party payments require a supported funds flow, not an unexplained single-destination charge. CSV imports must choose atomic-file or explicit partial-row mode consistently; do not mix modes. Never invent scan latency, reminder intervals, percentages, fees or tax policies. Do not assume any provider's free tier meets production capacity; mark capacity/pricing validation as a release check. Reviewer examples are not product requirements: keep actors and terminology within the current brief domain. Do not infer loss of paid course access from successful course completion alone; an unspecified entitlement duration or revocation rule remains an open decision.`;

export function validateContractText(texts: string[], source: string): string[] {
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ");
  const evidence = normalize(source);
  const issues: string[] = [];
  for (const text of texts) {
    const unsupported = unconfirmedNumericClaims(text, source).filter(raw => /(?:milliseconds?|msecs?|ms|seconds?|secs?|minutes?|hours?|days?|weeks?|months?|years?|detik|menit|jam|hari|minggu|bulan|tahun|percent|persen|%)\b|%$|^[HD]\s*-/i.test(raw));
    for (const raw of unsupported) issues.push(`Unspecified numeric policy ${raw}: keep it an open configurable decision instead of inventing a default`);
    for (const match of text.matchAll(/\b\d+(?:\.\d+)?\s*(?:requests?|transactions?)\s*(?:per|\/)\s*seconds?\b/gi)) {
      if (!evidence.includes(normalize(match[0]))) issues.push(`Unspecified numeric policy ${match[0]}: keep it an open configurable decision instead of inventing a default`);
    }
  }
  return [...new Set(issues)].slice(0, 10);
}

export function phaseRequirementIssues(features: { title: string; requirement_ids?: string[] }[], spec: ProductSpec): string[] {
  const known = new Set(spec.requirements.map(item => item.id));
  const assigned = new Set<string>(), issues: string[] = [];
  for (const feature of features) {
    if (!feature.requirement_ids?.length) issues.push(`${feature.title}: assign requirement_ids from contract`);
    for (const id of feature.requirement_ids ?? []) {
      if (!known.has(id)) issues.push(`${feature.title}: unknown requirement ${id}`);
      if (assigned.has(id)) issues.push(`${id}: one owning phase only; reference shared work as dependencies`);
      assigned.add(id);
    }
  }
  for (const id of known) if (!assigned.has(id)) issues.push(`${id}: no owning phase`);
  return issues;
}

/** Prefer a dedicated phase over a shared reference without leaving a phase ownerless. */
export function normalizePhaseOwnership<T extends { requirement_ids?: string[] }>(features: T[]): void {
  const ids = new Set(features.flatMap(feature => feature.requirement_ids ?? []));
  for (const id of ids) {
    const owners = features.filter(feature => feature.requirement_ids?.includes(id));
    if (owners.length < 2) continue;
    const dedicated = owners.filter(feature => new Set(feature.requirement_ids).size === 1);
    if (dedicated.length !== 1) continue;
    for (const feature of owners) {
      if (feature !== dedicated[0]) feature.requirement_ids = feature.requirement_ids!.filter(owned => owned !== id);
    }
  }
}

export function orderRequirementPhases<T extends { requirement_ids?: string[] }>(features: T[], spec: ProductSpec): T[] {
  const owner = new Map(features.flatMap((f, i) => (f.requirement_ids ?? []).map(id => [id, i] as const)));
  const deps = features.map((f, index) => new Set(spec.requirements.filter(r => f.requirement_ids?.includes(r.id)).flatMap(r => r.dependsOn ?? []).map(id => owner.get(id)).filter((i): i is number => i !== undefined && i !== index)));
  const pending = new Set(features.map((_, index) => index)), ordered: T[] = [];
  while (pending.size) {
    const next = [...pending].find(index => [...deps[index]].every(dep => !pending.has(dep)));
    if (next === undefined) throw new Error("Regroup phase ownership to remove cross-phase dependency cycles: " + [...pending].map(index => `features[${index}].requirement_ids=${JSON.stringify(features[index].requirement_ids)} depends on phase indices ${[...deps[index]].join(",")}`).join("; "));
    pending.delete(next); ordered.push(features[next]);
  }
  return ordered;
}

export function subfeatureRequirementIssues(subs: { requirement_ids?: string[] }[], phaseIds: string[]): string[] {
  const issues: string[] = [];
  for (const [index, sub] of subs.entries()) {
    if (!sub.requirement_ids?.length) issues.push(`sub_features[${index}]: assign requirement_ids owned by this phase`);
    for (const id of sub.requirement_ids ?? []) if (!phaseIds.includes(id)) issues.push(`sub_features[${index}]: ${id} belongs to another phase`);
  }
  for (const id of phaseIds) if (!subs.some(sub => sub.requirement_ids?.includes(id))) issues.push(`${id}: not covered by subfeatures`);
  return issues;
}

export function canonicalSchemaIssues(tables: { name: string; fields: string[]; constraints: string[] }[], spec: ProductSpec): string[] {
  const issues: string[] = [];
  for (const state of spec.states) {
    const table = tables.find(table => table.name === state.entity);
    if (!table) continue;
    const checks = [...table.fields, ...table.constraints].join("\n");
    for (const match of checks.matchAll(/\b(?:status|state)\s+IN\s*\(([^)]+)\)/gi)) {
      const values = [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]);
      for (const value of values) if (!state.values.includes(value)) issues.push(`${state.entity}: state '${value}' contradicts canonical values ${state.values.join(", ")}`);
    }
  }
  return issues;
}

export function schemaEntityIssues(tables: { name: string; supporting?: boolean; requirementIds?: string[]; parentEntities?: string[]; relationships: string[] }[], spec: ProductSpec): string[] {
  const issues = spec.entities.filter(entity => !tables.some(table => table.name === entity.name)).map(entity => `Canonical table ${entity.name} is missing`);
  for (const [index, table] of tables.entries()) {
    if (spec.entities.some(entity => entity.name === table.name)) continue;
    const path = `/tables/${index}`;
    if (!table.supporting) issues.push(`${path}/supporting: set true to label ${table.name} as an implementation proposal; preserve core entities and valid fields.`);
    if (!table.requirementIds?.length || table.requirementIds.some(id => !spec.requirements.some(r => r.id === id))) issues.push(`${path}/requirementIds: supply the existing requirement IDs this table supports, chosen from ${spec.requirements.map(r => r.id).join(", ")}.`);
    if (!table.parentEntities?.length || table.parentEntities.some(name => !spec.entities.some(e => e.name === name))) issues.push(`${path}/parentEntities: supply canonical parent names chosen from ${spec.entities.map(e => e.name).join(", ")}; each parent needs a stated relationship.`);
    for (const parent of table.parentEntities ?? []) {
      const escaped = parent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!table.relationships.some(link => new RegExp(`\\b${escaped}\\b`, "i").test(link))) issues.push(`${path}/relationships: state how ${table.name} links to canonical parent ${parent}.`);
    }
  }
  return issues;
}


/** Confirmed decisions quote evidence; implementation interpretation stays proposed/open. */
export function canonicalizeProductFacts(spec: ProductSpec): ProductSpec {
  return { ...spec, decisions: spec.decisions.map(decision => decision.status === "confirmed" && decision.sourceQuote ? { ...decision, value: decision.sourceQuote } : decision) };
}

export function productEvidenceSource(brief: string, spec?: ProductSpec): string {
  return [brief, ...(spec?.requirements.map(requirement => requirement.sourceQuote) ?? []), ...(spec?.decisions.filter(decision => decision.status === "confirmed").map(decision => decision.sourceQuote) ?? [])].join("\n");
}
