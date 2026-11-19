import { structureLimits, type Tier } from "./plan-limits";
import type { ProductSpec } from "./product-spec";

type Language = "id" | "en" | string | undefined;
const copy = (language: Language, id: string, en: string): string => language === "en" ? en : id;
const clean = (value: string): string => value.replace(/\s+/g, " ").trim();

function sourceText(brief: string, answers: Array<{ question: string; answer: string }> = []): string {
  return [brief, ...answers.map(answer => `${answer.question}: ${answer.answer}`)].join("\n");
}

function sourceSentences(brief: string, answers: Array<{ question: string; answer: string }> = []): string[] {
  const seen = new Set<string>();
  const sentences = sourceText(brief, answers)
    .split(/\n+|(?<=[.!?])\s+/u)
    .map(clean)
    .filter(sentence => sentence.length >= 12 && sentence.length <= 500)
    .filter(sentence => {
      const key = sentence.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return sentences;
}

function sourceQuote(source: string, sentence: string): string {
  if (source.includes(sentence)) return sentence.slice(0, 800);
  return source.slice(0, Math.min(800, Math.max(3, source.length)));
}

function shortTitle(value: string, fallback: string): string {
  const withoutPrefix = clean(value)
    .replace(/^\[?R\d{2,3}\]?\s*/i, "")
    .replace(/^(?:the\s+product\s+must|sistem\s+harus|aplikasi\s+harus|user\s+dapat|pengguna\s+dapat|buyer\s+dapat)\s+/i, "")
    .replace(/[.;:,]+$/g, "");
  const words = withoutPrefix.split(" ").filter(Boolean).slice(0, 8).join(" ");
  const title = words.length >= 3 ? words : fallback;
  return title.slice(0, 60);
}

function productTitle(brief: string, language: Language): string {
  const first = clean(brief.split(/\n/)[0] ?? "");
  const title = first
    .replace(/^(?:buatkan|buat|build|create|make|design)\s+(?:aplikasi|website|platform|sistem|a\s+|an\s+)?/i, "")
    .split(/[.:;]/)[0]
    .trim();
  return (title.length >= 3 ? title : copy(language, "Produk Baru", "New Product")).slice(0, 80);
}

const genericRequirements = [
  ["The product must support the primary workflow described in the brief.", "The product must support the primary workflow described in the brief."],
  ["Users must be able to create and maintain the records required by the workflow.", "Users must be able to create and maintain the records required by the workflow."],
  ["The system must reject invalid input and failed state changes without partial data.", "The system must reject invalid input and failed state changes without partial data."],
  ["Operators must be able to review and recover incomplete work.", "Operators must be able to review and recover incomplete work."],
];

export function fallbackProductSpec(
  brief: string,
  answers: Array<{ question: string; answer: string }> = [],
  language: Language = "id",
): ProductSpec {
  const source = sourceText(brief, answers);
  const sentences = sourceSentences(brief, answers);
  const statements: string[] = [];
  for (const sentence of sentences) {
    if (statements.length >= 8) break;
    if (statements.some(item => item.toLowerCase() === sentence.toLowerCase())) continue;
    statements.push(sentence);
  }
  for (const [statement] of genericRequirements) {
    if (statements.length >= 4) break;
    if (!statements.includes(statement)) statements.push(statement);
  }
  const requirements = statements.slice(0, 8).map((statement, index) => ({
    id: `R${String(index + 1).padStart(2, "0")}`,
    statement: statement.slice(0, 800),
    sourceQuote: sourceQuote(source, statement),
    priority: "must" as const,
    dependsOn: [] as string[],
    verification: ["success", "failure"] as Array<"success" | "failure">,
  }));
  const audienceMatch = source.match(/(?:untuk|for)\s+([^.,\n]{3,80})/i);
  const audience = clean(audienceMatch?.[1] ?? copy(language, "pengguna", "users")).slice(0, 120);
  const outcomes = statements.slice(0, 3).map(statement => copy(language, `Pengguna dapat menyelesaikan: ${statement}`, `Users can complete: ${statement}`).slice(0, 300));
  return {
    problem: (sentences[0] ?? copy(language, "Brief mendefinisikan alur produk yang perlu direncanakan secara lengkap.", "The brief defines a product workflow that needs a complete plan.")).slice(0, 800),
    audiences: [audience],
    outcomes: outcomes.length ? outcomes : [copy(language, "Pengguna dapat menyelesaikan workflow utama.", "Users can complete the primary workflow.")],
    requirements,
    decisions: [{
      id: "D01",
      topic: copy(language, "Kebijakan implementasi", "Implementation policy"),
      status: "open",
      value: copy(language, "Konfirmasi kebijakan bisnis yang belum disebutkan sebelum implementasi.", "Confirm business policies not stated in the brief before implementation.").slice(0, 800),
      sourceQuote: "",
    }],
    entities: [
      { name: "users", fields: ["id", "email", "role"] },
      { name: "records", fields: ["id", "owner_id", "status"] },
    ],
    states: [{ entity: "records", values: ["draft", "active"] }],
    outOfScope: [],
    metrics: [{
      name: copy(language, "Penyelesaian workflow utama", "Primary workflow completion"),
      definition: copy(language, "Persentase workflow utama yang berhasil diselesaikan tanpa intervensi manual.", "Share of primary workflows completed without manual intervention.").slice(0, 800),
      measurement: copy(language, "Ukur dari event penyelesaian yang tersimpan.", "Measure from persisted completion events.").slice(0, 800),
      target: "Not established; confirm baseline and target",
    }],
    risks: [{
      risk: copy(language, "Kebijakan bisnis yang belum dikonfirmasi dapat mengubah alur implementasi.", "Unconfirmed business policy can change the implementation flow.").slice(0, 800),
      mitigation: copy(language, "Pisahkan keputusan terbuka dan tinjau sebelum rilis.", "Keep open decisions explicit and review them before release.").slice(0, 800),
      owner: copy(language, "Product owner", "Product owner"),
    }],
    rollout: {
      stages: [copy(language, "Validasi alur utama", "Validate the primary workflow"), copy(language, "Rilis bertahap", "Release in stages")],
      releaseChecks: [copy(language, "Semua requirement utama memiliki bukti uji.", "Every primary requirement has test evidence."), copy(language, "Error path tidak meninggalkan data parsial.", "Failure paths do not leave partial data.")],
      rollback: [copy(language, "Kembalikan versi sebelumnya dan pertahankan data yang sudah valid.", "Restore the previous version and preserve valid data.")],
    },
  };
}

export interface FallbackFeature {
  requirement_ids: string[];
  title: string;
  icon: string;
  description: string;
  tujuan: string;
  selesai_bila: string[];
  priority: "high" | "medium" | "low";
}

const extraFeatureTitles = [
  ["Account access", "Core workflow", "Search and filters", "Notifications", "Reporting", "Administration", "Payments", "Audit history", "Integrations", "Reliability", "Exports", "Settings", "Recovery", "Review queue", "Release checks"],
  ["Akses akun", "Workflow utama", "Pencarian dan filter", "Notifikasi", "Laporan", "Administrasi", "Pembayaran", "Riwayat audit", "Integrasi", "Keandalan", "Ekspor", "Pengaturan", "Pemulihan", "Review queue", "Pemeriksaan rilis"],
];

export function fallbackOutline(
  brief: string,
  spec: ProductSpec,
  tier: Tier | string | null | undefined,
  stack: string[],
  language: Language = "id",
): { title: string; assumptions: string[]; stack: string[]; features: FallbackFeature[] } {
  const limits = structureLimits(tier);
  const requirements = spec.requirements;
  const count = Math.max(limits.features[0], Math.min(limits.features[1], Math.max(requirements.length, limits.features[0])));
  const extras = language === "en" ? extraFeatureTitles[0] : extraFeatureTitles[1];
  const used = new Set<string>();
  const features: FallbackFeature[] = [];
  for (let index = 0; index < count; index++) {
    const owned = requirements.length
      ? requirements.filter((_, requirementIndex) => requirementIndex % count === index)
      : [];
    if (!owned.length && requirements.length) owned.push(requirements[index % requirements.length]);
    const baseTitle = owned[0]?.statement ?? extras[index % extras.length];
    let title = shortTitle(baseTitle, extras[index % extras.length]);
    if (used.has(title.toLowerCase())) title = `${title} ${index + 1}`;
    used.add(title.toLowerCase());
    const descriptions = owned.map(requirement => `[${requirement.id}] ${requirement.statement}`);
    features.push({
      requirement_ids: owned.map(requirement => requirement.id),
      title: title.slice(0, 60),
      icon: "⚡",
      description: (descriptions.length ? descriptions.join(" ") : copy(language, `Fase pendukung untuk ${title} yang memerlukan tinjauan pengguna.`, `Supporting phase for ${title}; review against the brief.`)).slice(0, 800),
      tujuan: copy(language, `Menyelesaikan ${title} dengan hasil yang dapat diverifikasi dan jalur pemulihan yang jelas.`, `Deliver ${title} with verifiable outcomes and a clear recovery path.`).slice(0, 800),
      selesai_bila: [
        copy(language, `Alur ${title} berhasil dan tersimpan tanpa status parsial.`, `${title} success path is observable and persisted.`).slice(0, 400),
        copy(language, `Kegagalan ${title} menampilkan error spesifik dan tidak menimpa data yang sudah valid.`, `${title} failures show a specific error without overwriting valid data.`).slice(0, 400),
      ],
      priority: index === 0 ? "high" : "medium",
    });
  }
  return {
    title: productTitle(brief, language),
    assumptions: [copy(language, "Plan ini memakai fallback deterministik karena output model tidak lolos kontrak. Tinjau setiap fase sebelum implementasi.", "This plan uses a deterministic fallback because model output did not satisfy the contract. Review every phase before implementation.")],
    stack: stack.length ? stack : ["Next.js", "PostgreSQL", "Vercel"],
    features,
  };
}

const subfeatureSuffixes = [
  ["core workflow", "input validation", "state transitions", "access and permissions", "error recovery", "search and filters", "notifications", "history and audit", "reporting", "import and export", "settings", "integration", "empty states", "concurrency", "release preparation"],
  ["alur utama", "validasi input", "transisi status", "akses dan izin", "pemulihan error", "pencarian dan filter", "notifikasi", "riwayat dan audit", "laporan", "impor dan ekspor", "pengaturan", "integrasi", "empty state", "concurrency", "persiapan rilis"],
];

export interface FallbackSubfeature {
  requirement_ids: string[];
  title: string;
  tujuan: string;
  selesai_bila: string[];
}

export function fallbackSubfeatures(
  feature: { title: string; description?: string; tujuan?: string; selesai_bila?: string[]; requirement_ids?: string[] },
  count: number,
  existing: readonly FallbackSubfeature[] = [],
  language: Language = "id",
): FallbackSubfeature[] {
  const suffixes = language === "en" ? subfeatureSuffixes[0] : subfeatureSuffixes[1];
  const used = new Set(existing.map(item => item.title.trim().toLowerCase()));
  const result: FallbackSubfeature[] = [];
  const target = Math.max(1, count);
  for (let index = 0; index < target; index++) {
    const suffix = suffixes[index % suffixes.length];
    let title = `${feature.title}: ${suffix}`;
    if (used.has(title.toLowerCase())) title = `${feature.title}: ${suffix} ${index + 1}`;
    used.add(title.toLowerCase());
    const criteria = (feature.selesai_bila ?? []).filter(Boolean).slice(0, 2);
    result.push({
      requirement_ids: feature.requirement_ids?.length ? [feature.requirement_ids[index % feature.requirement_ids.length]] : [],
      title: title.slice(0, 120),
      tujuan: copy(language, `Menyelesaikan ${title} sesuai tujuan fase.`, `Complete ${title} against the phase goal.`).slice(0, 800),
      selesai_bila: criteria.length >= 2
        ? criteria
        : [
          copy(language, `${title} berhasil dan hasilnya tersimpan.`, `${title} succeeds and persists its result.`).slice(0, 400),
          copy(language, `${title} menolak input tidak valid tanpa data parsial.`, `${title} rejects invalid input without partial data.`).slice(0, 400),
        ],
    });
  }
  return result;
}

export function fallbackRequirements(
  spec: ProductSpec,
  features: ReadonlyArray<{ title: string; requirement_ids?: string[] }>,
  stack: string[],
  language: Language = "id",
): {
  user_flow: Array<{ title: string; requirementIds: string[]; steps: string[] }>;
  requirements: { fungsional: string[]; non_fungsional: string[] };
  tech_stack: Array<{ name: string; desc: string }>;
} {
  const covered = new Set<string>();
  const userFlow = features.map(feature => {
    const ids = (feature.requirement_ids ?? []).filter(id => spec.requirements.some(requirement => requirement.id === id));
    ids.forEach(id => covered.add(id));
    return {
      title: feature.title,
      requirementIds: ids,
      steps: [
        copy(language, `Buka ${feature.title}`, `Open ${feature.title}`),
        copy(language, `Isi dan validasi input ${feature.title}`, `Enter and validate ${feature.title} input`),
        copy(language, `Simpan hasil ${feature.title}`, `Persist the ${feature.title} result`),
        copy(language, `Tampilkan status sukses atau error yang jelas`, "Show a clear success or error state"),
      ],
    };
  });
  for (const requirement of spec.requirements) {
    if (covered.has(requirement.id)) continue;
    covered.add(requirement.id);
    userFlow.push({
      title: shortTitle(requirement.statement, requirement.id),
      requirementIds: [requirement.id],
      steps: [requirement.statement, copy(language, "Validasi hasil dan tampilkan status yang dapat diamati.", "Validate the result and show an observable status.")],
    });
  }
  const functional = spec.requirements.map(requirement => `[${requirement.id}] ${requirement.statement}`);
  while (functional.length < 6) functional.push(copy(language, `Sistem harus mendukung alur utama ${functional.length + 1} dengan status yang dapat diverifikasi.`, `The system must support primary workflow ${functional.length + 1} with a verifiable status.`));
  const nonFunctional = [
    copy(language, "Akses ke setiap aksi harus diperiksa di server berdasarkan peran dan kepemilikan resource.", "Every action must enforce role and resource ownership on the server."),
    copy(language, "Input harus divalidasi sebelum menulis data dan kegagalan tidak boleh meninggalkan status parsial.", "Inputs must be validated before writes and failures must not leave partial state."),
    copy(language, "Operasi yang gagal harus dapat diulang tanpa menggandakan data atau efek samping.", "Failed operations must be retried without duplicating data or side effects."),
    copy(language, "Setiap alur utama harus memiliki bukti uji untuk success dan failure path.", "Every primary flow must have test evidence for success and failure paths."),
  ];
  return {
    user_flow: userFlow,
    requirements: { fungsional: functional.slice(0, 20), non_fungsional: nonFunctional },
    tech_stack: stack.map(name => ({ name, desc: copy(language, "Komponen stack yang dipilih untuk implementasi.", "Selected stack component for implementation.") })),
  };
}

export interface FallbackTask {
  id: string;
  feature: string;
  sub_feature: string;
  title: string;
  layer: "frontend" | "backend" | "qa";
  phase: number;
  page: string | null;
  deps: string[];
  detail?: {
    objective: string;
    requirementIds: string[];
    deliverables: string[];
    acceptanceCriteria: string[];
    tests: Array<{ scenario: "success" | "failure" | "duplicate" | "concurrency" | "recovery"; action: string; expected: string }>;
    prerequisiteRequirementIds: string[];
  };
}

const taskTemplates = [
  ["Implement {sub} data flow", "backend"],
  ["Build {sub} interface", "frontend"],
  ["Add {sub} validation and errors", "backend"],
  ["Test {sub} success path", "qa"],
  ["Handle {sub} failure recovery", "backend"],
  ["Verify {sub} after refresh", "qa"],
] as const;

const testScenarios = ["success", "failure", "duplicate", "concurrency", "recovery"] as const;
type TestScenario = (typeof testScenarios)[number];

export function fallbackTasks(
  featureTitle: string,
  subTitles: string[],
  tier: Tier | string | null | undefined,
  featureIndex: number,
  reservedQa: boolean,
  language: Language = "id",
  requirements: ReadonlyArray<{ id: string; verification: string[] }> = [],
): FallbackTask[] {
  const limits = structureLimits(tier);
  const titles = subTitles.length ? subTitles : [featureTitle];
  const minimum = Math.max(titles.length, limits.tasks[0] - (reservedQa ? 4 : 0));
  const count = Math.min(limits.tasks[1] - (reservedQa ? 4 : 0), minimum);
  const used = new Set<string>();
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const sub = titles[index % titles.length];
    const template = taskTemplates[index % taskTemplates.length];
    let title = copy(language, template[0], template[0]).replace("{sub}", sub).slice(0, 60);
    if (used.has(title.toLowerCase())) title = `${title.slice(0, 57)} ${index + 1}`;
    used.add(title.toLowerCase());
    const requirement = requirements.length ? requirements[index % requirements.length] : undefined;
    const occurrence = requirement ? Math.floor(index / requirements.length) : 0;
    const scenarios = requirement?.verification.length
      ? requirement.verification.filter((scenario): scenario is TestScenario => (testScenarios as readonly string[]).includes(scenario))
      : ["success"] as TestScenario[];
    const selected = scenarios.slice(occurrence * 3, occurrence * 3 + 3);
    const chosenScenarios: TestScenario[] = selected.length ? selected : ["success"];
    return {
      id: `t${index + 1}`,
      feature: featureTitle,
      sub_feature: sub,
      title,
      layer: template[1],
      phase: featureIndex + 1,
      page: null,
      deps: index > 0 ? [`t${index}`] : [],
      ...(requirement ? {
        detail: {
          objective: `Implement ${sub} for ${featureTitle} and keep the result observable and recoverable.`.slice(0, 500),
          requirementIds: [requirement.id],
          deliverables: [`${sub} behavior available in the product`, `Failure and validation evidence for ${featureTitle}`],
          acceptanceCriteria: [`${sub} success path is observable and persisted`, `${sub} failures show a specific error without partial data`],
          tests: chosenScenarios.map(scenario => ({
            scenario,
            action: `Run the ${scenario} path for ${sub} using the configured product data`.slice(0, 400),
            expected: scenario === "success"
              ? `${sub} completes and the result is visible after refresh`
              : `${sub} ${scenario} path is rejected or recovered with a clear status and no partial data`,
          })),
          prerequisiteRequirementIds: [],
        },
      } : {}),
    };
  });
}
