import { validateTechnicalClaims } from "../src/lib/technical-claims";
import { accumulateGenerationReview, applyGenerationReview } from "../src/lib/generation-review";
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractGenerationJson, normalizeGeneratedText } from "../src/lib/generation-json";
import { mergeGenerationPatch } from "../src/lib/generation-patch";
import { schemaEntityIssues, canonicalSchemaIssues, productSpecSchema, validateProductSpec, phaseRequirementIssues, orderRequirementPhases, validateContractText } from "../src/lib/product-spec";
import { qualityMetadata, hydrateQuality, connectRequirementDependencies, validateTaskDetails, taskDetailSchema } from "../src/lib/task-spec";
import { renderPrdMd } from "../src/lib/zip";
import { demoPlan } from "../src/lib/demo";
import { nextGenerationFailure, canResumeGeneration } from "../src/lib/generation-recovery";

const brief = "Customers reserve courts. Owners configure schedules. Staff check in arrivals. Managers reconcile payments.";
const spec = productSpecSchema.parse({
  problem: "Prevent conflicting court bookings", audiences: ["Customers", "Venue staff"], outcomes: ["Confirmed slots match recorded payments"],
  requirements: brief.split(". ").map((quote, index) => ({ id: `R0${index + 1}`, statement: quote, sourceQuote: quote, priority: "must", verification: ["success", "failure"], dependsOn: index === 1 ? ["R01"] : [] })),
  decisions: [{ id: "D01", topic: "Hold expiry", status: "open", value: "Confirm the configurable hold policy", sourceQuote: "" }],
  entities: [{ name: "courts", fields: ["id", "name"] }, { name: "bookings", fields: ["id", "court_id", "status"] }],
  states: [{ entity: "bookings", values: ["held", "confirmed"] }], outOfScope: [],
  metrics: [{ name: "Booking completion", definition: "Confirmed attempts divided by eligible attempts", measurement: "Count checkout and confirmation events", target: "Not established; confirm baseline and target" }],
  risks: [{ risk: "Duplicate provider callbacks", mitigation: "Use a durable unique event guard", owner: "Backend lead" }],
  rollout: { stages: ["Pilot with venue staff"], releaseChecks: ["Prove overlapping attempts cannot both confirm"], rollback: ["Disable new checkouts while preserving existing bookings"] },
});
const detail = taskDetailSchema.parse({ objective: "Reject overlapping booking attempts", requirementIds: ["R01"], deliverables: ["Atomic reservation endpoint"], acceptanceCriteria: ["Only one competing attempt can confirm a court slot"], tests: [{ scenario: "success", action: "Reserve an available court slot", expected: "One held reservation is recorded" }, { scenario: "failure", action: "Reserve an occupied court slot", expected: "The request fails without adding another reservation" }], prerequisiteRequirementIds: [] });

test("whole JSON retains embedded SQL and Mermaid strings, including literal regex escapes", () => {
  const value = { database_schema: "### bookings\n```sql\nCREATE TABLE bookings (note text CHECK (note ~ '\\n'));\n```\n```mermaid\nerDiagram\n bookings ||--|| courts : occupies\n```" };
  assert.deepEqual(JSON.parse(extractGenerationJson(JSON.stringify(value))), value);
  assert.deepEqual(JSON.parse(extractGenerationJson(`\`\`\`json\n${JSON.stringify(value)}\n\`\`\``)), value);
  assert.equal(normalizeGeneratedText("  regex \\n and \\\"literal\\\"  "), "regex \\n and \\\"literal\\\"");
  assert.throws(() => extractGenerationJson('"just a SQL string"'));
});

test("targeted replacements preserve facts and reject unknown or unsafe paths", () => {
  const prior = JSON.stringify({ title: "CourtFlow", features: [{ title: "Old title", requirement_ids: ["R01"] }] });
  assert.deepEqual(mergeGenerationPatch({ patch: [{ op: "replace", path: "/features/0/title", value: "Court checkout" }] }, prior), { title: "CourtFlow", features: [{ title: "Court checkout", requirement_ids: ["R01"] }] });
  for (const path of ["/__proto__/polluted", "/constructor/prototype/value", "/missing", "/features/8/title"]) assert.throws(() => mergeGenerationPatch({ patch: [{ op: "replace", path, value: "unsafe" }] }, prior));
});

test("source evidence, phase ownership and dependency cycles are checked", () => {
  assert.deepEqual(validateProductSpec(spec, brief), []);
  const broken = structuredClone(spec);
  broken.requirements[0].sourceQuote = "invented user research";
  broken.requirements[0].dependsOn = ["R02"];
  assert.match(validateProductSpec(broken, brief).join(" "), /exact source excerpt.*cycle/);
  const phases = [{ requirement_ids: ["R02"] }, { requirement_ids: ["R01", "R03", "R04"] }];
  assert.equal(orderRequirementPhases(phases, spec)[0], phases[1]);
  assert.deepEqual(phaseRequirementIssues(phases.map((p, i) => ({ ...p, title: `Phase ${i}` })), spec), []);
  assert.match(phaseRequirementIssues([{ title: "Only phase", requirement_ids: ["R01", "R01"] }], spec).join(" "), /one owning phase/);
  assert.equal(validateContractText(["Send reminder after 48 hours"], brief).length, 1);
  assert.deepEqual(validateContractText(["Send reminder after 48 hours"], brief + " Reminder after 48 hours."), []);
});

test("task details survive metadata roundtrip, feed exports, and resolve real cross-phase prerequisites", () => {
  const plan = structuredClone(demoPlan);
  plan.productSpec = spec;
  const first = plan.features[0], second = plan.features[1];
  first.requirementIds = ["R01"];
  first.subFeatures[0].requirementIds = ["R01"];
  const initialTask = first.subFeatures[0].tasks[0];
  initialTask.detail = structuredClone(detail);
  const consumer = second.subFeatures[0].tasks[0];
  consumer.detail = { ...structuredClone(detail), requirementIds: ["R02"] };
  consumer.deps = [];
  assert.deepEqual(validateTaskDetails([initialTask], spec, ["R01"]), []);
  assert.match(validateTaskDetails([{ detail: { ...detail, tests: detail.tests.slice(0, 1) } }], spec, ["R01"]).join(" "), /missing failure/);
  const meta = JSON.parse(JSON.stringify(qualityMetadata(plan)));
  const restored = structuredClone(plan.features);
  delete restored[0].subFeatures[0].tasks[0].detail;
  hydrateQuality(restored, meta);
  assert.deepEqual(restored[0].subFeatures[0].tasks[0].detail, detail);
  connectRequirementDependencies(plan);
  assert.ok(consumer.deps.includes(initialTask.ref));
  const exported = renderPrdMd(plan);
  assert.match(exported, /Success measurement|Pengukuran keberhasilan/);
  assert.ok(exported.includes(detail.tests[1].expected));
  assert.ok(exported.includes(spec.rollout.rollback[0]));
});

test("automatic recovery stops after three failures and respects backoff", () => {
  const first = nextGenerationFailure(undefined, 0);
  assert.equal(canResumeGeneration(first, 9999), false);
  assert.equal(canResumeGeneration(first, 10000), true);
  const paused = nextGenerationFailure(nextGenerationFailure(first, 20000), 50000);
  assert.equal(paused.paused, true);
  assert.equal(canResumeGeneration(paused, 999999), false);
});

test("database status checks must use the canonical lifecycle", () => {
  assert.deepEqual(canonicalSchemaIssues([{ name: "bookings", fields: [], constraints: ["CHECK (status IN ('held', 'confirmed'))"] }], spec), []);
  assert.match(canonicalSchemaIssues([{ name: "bookings", fields: [], constraints: ["CHECK (status IN ('paid', 'confirmed'))"] }], spec).join(" "), /paid.*contradicts/);
});

test("supporting technical tables require explicit proposal provenance and a canonical relationship", () => {
  const core = spec.entities.map(entity => ({ name: entity.name, relationships: [] as string[] }));
  const supporting = { name: "notification_dispatches", supporting: true, requirementIds: ["R01"], parentEntities: ["bookings"], relationships: ["notification_dispatches.booking_id references bookings.id"] };
  assert.deepEqual(schemaEntityIssues([...core, supporting], spec), []);
  assert.match(schemaEntityIssues([...core, { ...supporting, relationships: [] }], spec).join(" "), /\/relationships: state how/);
  assert.match(schemaEntityIssues([...core, { ...supporting, supporting: false }], spec).join(" "), /\/supporting: set true/);
  assert.match(schemaEntityIssues([supporting], spec).join(" "), /Canonical table courts is missing/);
});

test("repair adds missing schema metadata without overwriting facts or permitting unsafe paths", () => {
  const previous = JSON.stringify({ tables: [{ name: 'delivery_jobs', relationships: ['delivery_jobs.record_id references records.id'] }] });
  const repaired = mergeGenerationPatch({ patch: [
    { op: 'add', path: '/tables/0/supporting', value: true },
    { op: 'add', path: '/tables/0/parentEntities', value: ['records'] },
    { op: 'add', path: '/tables/0/requirementIds', value: ['R01'] },
  ] }, previous) as {tables:{name:string;supporting:boolean}[]};
  assert.equal(repaired.tables[0].name, 'delivery_jobs');
  assert.equal(repaired.tables[0].supporting, true);
  for (const path of ['/tables/0/name', '/tables/2', '/__proto__/polluted']) assert.throws(() => mergeGenerationPatch({ patch: [{ op: 'add', path, value: 'unsafe' }] }, previous));
  const appended = mergeGenerationPatch({patch:[{op:'add', path:'/tables/-', value:{name:'delivery_attempts'}}]}, previous) as {tables:{name:string}[]};
  assert.equal(appended.tables.length, 2);
  assert.equal(appended.tables[0].name, 'delivery_jobs');
  const numericAppend = mergeGenerationPatch({patch:[{op:'add', path:'/tables/1', value:{name:'delivery_attempts'}}]}, previous) as {tables:{name:string}[]};
  assert.deepEqual(numericAppend, appended);
  const inserted = mergeGenerationPatch({ patch: [{ op: 'add', path: '/tables/0/relationships/0', value: 'delivery_jobs.payment_id references payments.id' }] }, previous) as { tables: { relationships: string[] }[] };
  assert.deepEqual(inserted.tables[0].relationships, ['delivery_jobs.payment_id references payments.id', 'delivery_jobs.record_id references records.id']);
  for (const index of ['-1', '2', '1.5']) assert.throws(() => mergeGenerationPatch({ patch: [{ op: 'add', path: `/tables/0/relationships/${index}`, value: 'invalid' }] }, previous));
});

test("ordinal seconds are not latency policies while actual one-second promises still fail", () => {
  assert.deepEqual(validateContractText(['Duplicate signup does not create a second account.', 'A retry never emits a second payment or a second record.', 'Reject a second active stay request.', 'Open the record in a second browser tab.'], 'Users manage accounts and payments'), []);
  assert.match(validateContractText(['Signup must complete within a second.'], 'Users manage accounts').join(' '), /Unspecified numeric policy/);
  assert.match(validateContractText(['Response latency is a second.'], 'Users manage accounts').join(' '), /Unspecified numeric policy/);
});

test("calendar controls and clock notation are not invented business durations", () => {
  const source = "Owners configure court schedules and operating hours.";
  for (const text of [
    "Owners use a 24-hour time picker interface.",
    "Selected hours display in 24 hour format such as 18:00 to 22:00.",
    "Disables time inputs when a day toggle is turned off.",
    "Users select a day from the calendar.",
  ]) assert.deepEqual(validateContractText([text], source), [], text);
  for (const text of ["Bookings expire after 24 hours.", "A hold lasts one day.", "Send a reminder a day before booking.", "The day selector responds within 300ms."]) {
    assert.ok(validateContractText([text], source).length > 0, text);
  }
});

test("review append corrections preserve accepted constraints and still reject replacement of unknown paths", () => {
  const sections = { architecture: { paragraphs: ['Retain ownership checks'], mermaid: 'flowchart TD' }, database: { tables: [{ constraints: ['PRIMARY KEY id'] }] }, requirements: {} };
  const corrected = applyGenerationReview(sections, { corrections: [{ section: 'database', path: '/tables/0/constraints/-', value: 'UNIQUE event_id', reason: 'Keep duplicate events idempotent' }] });
  assert.deepEqual(corrected.database.tables[0].constraints, ['PRIMARY KEY id', 'UNIQUE event_id']);
  assert.deepEqual(sections.database.tables[0].constraints, ['PRIMARY KEY id']);
  assert.throws(() => applyGenerationReview(sections, { corrections: [{ section: 'database', path: '/tables/0/constraints/9', value: 'Missing value', reason: 'Unknown replacement is invalid' }] }));
});

test("review table-name selectors resolve only to one existing table", () => {
  const sections = { architecture: {}, database: { tables: [{ name:'records', constraints: ['PRIMARY KEY id'] }] }, requirements: {} };
  const result = applyGenerationReview(sections, {corrections:[{section:'database', path:'/tables/records/constraints/-', value:'UNIQUE external_id', reason:'Make repeated imports idempotent'}]});
  assert.deepEqual(result.database.tables[0].constraints, ['PRIMARY KEY id', 'UNIQUE external_id']);
  assert.throws(() => applyGenerationReview(sections, {corrections:[{section:'database', path:'/tables/unknown/constraints/-', value:'UNIQUE external_id', reason:'Unknown tables must not be invented'}]}));
});

test("review repairs retain a prior appended table and can fill its empty parent array", () => {
  const sections = { architecture: {}, database: { tables: [
    { name: 'users', supporting: false, requirementIds: ['R01'], parentEntities: [], relationships: [] },
    { name: 'complaints', supporting: false, requirementIds: ['R01'], parentEntities: [], relationships: [] },
  ] }, requirements: {} };
  const addedTable = { corrections: [{ section: 'database' as const, op: 'add' as const, path: '/tables/-', value: {
    name: 'complaint_status_history', supporting: true, requirementIds: ['R01'], parentEntities: [],
    relationships: ['complaint_id references complaints.id'],
  }, reason: 'Track changes to complaint status' }] };
  const repair = { corrections: [{ section: 'database' as const, path: '/tables/complaint_status_history/parentEntities/0', value: 'complaints',
    reason: 'Link the history to its canonical complaint record' }] };
  const accumulated = accumulateGenerationReview(addedTable, repair);
  assert.equal(accumulated.corrections.length, 2);
  const corrected = applyGenerationReview(sections, accumulated);
  assert.deepEqual(corrected.database.tables[2].parentEntities, ['complaints']);
  const supportingSpec = { entities: [{ name: 'users' }, { name: 'complaints' }], requirements: [{ id: 'R01' }] } as never;
  assert.deepEqual(schemaEntityIssues(corrected.database.tables, supportingSpec), []);
  const repeatedFullResponse = accumulateGenerationReview(addedTable, { corrections: [...addedTable.corrections, ...repair.corrections] });
  assert.equal(repeatedFullResponse.corrections.length, 2);
});

test("review flows resolve exact requirement identity without replacing another actor workflow", () => {
  const sections={architecture:{},database:{},requirements:{user_flow:[{title:'Owner update',requirementIds:['R01'],steps:['Keep owner behavior']},{title:'Staff review',requirementIds:['R02'],steps:['Old staff behavior']}]}};
  const value={title:'Review as staff',requirementIds:['R02'],steps:['Corrected staff behavior']};
  for(const op of ['replace','add'] as const){
    const result=applyGenerationReview(sections,{corrections:[{section:'requirements',op,path:'/user_flow/0',value,reason:'Resolve the staff-only recovery behavior'}]});
    assert.deepEqual(result.requirements.user_flow[0],sections.requirements.user_flow[0]);
    assert.deepEqual(result.requirements.user_flow[1],value);
    assert.equal(result.requirements.user_flow.length,2);
  }
});

test("diagram escape normalization preserves SQL and quoted label escapes", () => {
  const raw = 'flowchart TD\\n A[Booking] --> B[Payment]\\n B --> C[Done]';
  assert.equal(normalizeGeneratedText(raw, "mermaid"), 'flowchart TD\n A[Booking] --> B[Payment]\n B --> C[Done]');
  assert.equal(normalizeGeneratedText('First paragraph.\\n\\nSecond paragraph.', "prose"), 'First paragraph.\n\nSecond paragraph.');
  assert.equal(normalizeGeneratedText('A["literal \\n inside label"]\\nA --> B', "mermaid"), 'A["literal \\n inside label"]\nA --> B');
  assert.equal(validateContractText(["Peak capacity is 100 requests per second"], "No confirmed throughput target").length, 1);
});

test("cross-section review applies bounded replacements and rejects derived fields", () => {
  const sections = { architecture: { paragraphs: ["Original paragraph"], mermaid: "flowchart TD" }, database: { tables: [] }, requirements: { user_flow: [] } };
  const corrected = applyGenerationReview(sections, { corrections: [{ section: "architecture", path: "/paragraphs/0", value: "Use the defined cancelled status and reconcile the settled payment", reason: "The pending_refund state was not declared" }] });
  assert.equal(corrected.architecture.paragraphs[0], "Use the defined cancelled status and reconcile the settled payment");
  assert.equal(sections.architecture.paragraphs[0], "Original paragraph");
  assert.throws(() => applyGenerationReview(sections, { corrections: [{ section: "architecture", path: "/architecture", value: "bypass", reason: "Invalid derived field" }] }), /derived or unknown/);
});

test("known incorrect payment, graph and media mechanisms cannot pass as professional requirements", () => {
  assert.match(validateTechnicalClaims("If the hold expired and another customer owns the slot, the payment transitions to failed while initiating a refund.").join(" "), /Captured-payment integrity/);
  assert.deepEqual(validateTechnicalClaims("If the hold expired, retain the payment as successful, cancel the booking separately and reconcile a compensating refund."), []);
  assert.match(validateTechnicalClaims("A unique dependency pair constraint prevents cycles in the task graph.").join(" "), /Dependency graph integrity/);
  assert.deepEqual(validateTechnicalClaims("A unique pair constraint does not prevent cycles; graph traversal rejects a cyclic edge."), []);
  assert.match(validateTechnicalClaims("Previously issued signed URLs are immediately revoked after refunds.").join(" "), /Media entitlement integrity/);
  assert.deepEqual(validateTechnicalClaims("Previously issued signed URLs cannot be immediately revoked; authorize each media request and document cache expiry."), []);
});

import { canonicalizeProductFacts, productEvidenceSource } from "../src/lib/product-spec";
import { hasStableWebhookEventKey } from "../src/lib/architecture-quality";
import { validateTaskTechnicalClaims } from "../src/lib/technical-claims";
import { enrichReleaseTasks } from "../src/lib/task-spec";
import { ensureQaPhase } from "../src/lib/tasks";

test("stable provider event keys accept semantic custom names without accepting random or nonunique keys", () => {
  const table = { name: "payment_events", purpose: "Durable webhook deduplication", fields: ["id UUID PRIMARY KEY DEFAULT gen_random_uuid()", "provider TEXT NOT NULL", "event_key TEXT NOT NULL"], constraints: ["UNIQUE (provider, event_key)"] };
  assert.equal(hasStableWebhookEventKey([table]), true);
  assert.equal(hasStableWebhookEventKey([{ ...table, fields: ["event_key TEXT NOT NULL UNIQUE"], constraints: [] }]), true);
  assert.equal(hasStableWebhookEventKey([{ ...table, constraints: [] }]), false);
  assert.equal(hasStableWebhookEventKey([{ ...table, fields: ["event_key UUID DEFAULT gen_random_uuid()"] }]), false);
  assert.equal(hasStableWebhookEventKey([{ ...table, constraints: ["UNIQUE (id)"] }]), false);
  assert.equal(hasStableWebhookEventKey([{ ...table, constraints: ["UNIQUE (id, event_key)"] }]), false);
});

test("confirmed values retain exact evidence and only confirmed clarification permits a numeric policy", () => {
  const source = structuredClone(spec);
  source.decisions = [
    { id: "D01", topic: "Reminder", status: "confirmed", value: "Send after 48 hours and store schedules as UTC", sourceQuote: "Send after 48 hours" },
    { id: "D02", topic: "Hold expiry", status: "proposed", value: "Propose 15 minutes", sourceQuote: "" },
  ];
  const normalized = canonicalizeProductFacts(source);
  assert.equal(normalized.decisions[0].value, "Send after 48 hours");
  assert.equal(source.decisions[0].value, "Send after 48 hours and store schedules as UTC");
  assert.equal(normalized.decisions[1].value, "Propose 15 minutes");
  const evidence = productEvidenceSource(brief, normalized);
  assert.deepEqual(validateContractText(["Send after 48 hours"], evidence), []);
  assert.equal(validateContractText(["Expire after 15 minutes"], evidence).length, 1);
});

test("task acceptance and test expectations receive the same technical integrity checks as PRD sections", () => {
  const task = { title: "Protect booking integrity", detail: structuredClone(detail) };
  task.detail.tests[0].expected = "When the hold expired, the payment transitions to failed while initiating a refund.";
  assert.match(validateTaskTechnicalClaims([task]).join(" "), /tasks\[0\].*Captured-payment integrity/);
  task.detail.tests[0].expected = "When the hold expired, retain the captured payment as successful and reconcile a compensating refund.";
  assert.deepEqual(validateTaskTechnicalClaims([task]), []);
});

test("release QA waits for regular implementation and earlier QA without dropping existing prerequisites", () => {
  const plan = structuredClone(demoPlan);
  plan.tier = "pro";
  plan.productSpec = spec;
  assert.equal(ensureQaPhase(plan).ready, true);
  const release = plan.features.at(-1)!.subFeatures.find(sub => /^(?:QA & Integration|QA & Integrasi)$/i.test(sub.title))!;
  assert.ok(release.tasks.length >= 4);
  enrichReleaseTasks(plan);
  const initialPrerequisites = [...release.tasks[1].deps];
  assert.ok(initialPrerequisites.includes(release.tasks[0].ref));
  for (const [index, task] of release.tasks.entries()) {
    assert.equal(task.deps.includes(task.ref), false);
    for (const prior of release.tasks.slice(0, index)) assert.ok(task.deps.includes(prior.ref));
    for (const later of release.tasks.slice(index + 1)) assert.equal(task.deps.includes(later.ref), false);
  }
  assert.equal(enrichReleaseTasks(plan), false);
  assert.deepEqual(release.tasks[1].deps, initialPrerequisites);
});


test("media revocation cannot be promised through token minting and metadata headers alone", () => {
  const wrong = "Because previously issued signed URLs remain cached until expiry, immediate media revocation is strictly enforced by maintaining a server-side entitlement proxy that blocks subsequent media token minting and sets Cache-Control no-store headers on media metadata responses.";
  assert.match(validateTechnicalClaims(wrong).join(" "), /Media entitlement integrity/);
  assert.match(validateTechnicalClaims("Immediate media access revocation is enforced by a proxy redirecting to short-lived signed URLs, completely blocking subsequent media access.").join(" "), /Media entitlement integrity/);
  const corrected = "Immediate media revocation requires authorization on every media request through a proxy that streams content without exposing a reusable origin URL; blocking new token minting alone cannot guarantee immediate revocation of existing URLs or cached media.";
  assert.deepEqual(validateTechnicalClaims(corrected), []);
});


test("negated signed-URL redirects and authorization on every media segment are valid", () => {
  const corrected = "To guarantee immediate media access revocation, the system never exposes direct origin storage URLs or redirects clients to reusable origin signed URLs. Instead, every media manifest and segment request is processed through a non-bypassable streaming proxy. Blocking only new token minting or metadata headers is insufficient; bytes already downloaded cannot be recalled.";
  assert.deepEqual(validateTechnicalClaims(corrected), []);
  assert.deepEqual(validateTechnicalClaims("Immediate media access revocation requires authorization on every segment request rather than redirecting to signed URLs."), []);
});


test("truncated JSON strings are rejected instead of inventing missing content", () => {
  assert.throws(() => extractGenerationJson('{"architecture":"Valid initial text but incomplete conclusion to'), /terpotong/);
  assert.deepEqual(JSON.parse(extractGenerationJson('{"complete":"fact"')), { complete: "fact" });
});

test("flowchart state labels quote embedded pipes while leaving edge labels intact", () => {
  const source = 'flowchart TD\n A[enrolments: pending | active | revoked] -->|allowed| B["Already quoted | text"]';
  assert.equal(normalizeGeneratedText(source, "mermaid"), 'flowchart TD\n A["enrolments: pending | active | revoked"] -->|allowed| B["Already quoted | text"]');
});


test("flowchart edge parentheses are quoted without editing quoted node content", () => {
  assert.equal(normalizeGeneratedText('flowchart TD\n A -->|Stream bytes (no origin redirect)| B', "mermaid"), 'flowchart TD\n A -->|"Stream bytes (no origin redirect)"| B');
  const quoted = 'flowchart TD\n A["example -->|text (literal)| B and X[one|two]"]';
  assert.equal(normalizeGeneratedText(quoted, "mermaid"), quoted);
});

test("product contracts share brief-first duration equivalence with requirements", () => {
  assert.deepEqual(validateContractText(["Send booking reminders 24 hours before the start."], "Send a reminder one day before the booking."), []);
  assert.deepEqual(validateContractText(["Send booking reminders 24 hours before the start."], "Kirim pengingat H-1 sebelum booking."), []);
  assert.deepEqual(validateContractText(["Proposed assumption to confirm: retain reports for 30 days."], "Managers view reports."), []);
  assert.equal(validateContractText(["Keep a checkout hold for 24 hours."], "Send a reminder one day before the booking.").length, 1);
});
