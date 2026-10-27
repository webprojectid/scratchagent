import { structureLimits, type Tier } from "./plan-limits";
import type { Plan } from "./types";

export interface FeatureDraft {
  title?: unknown;
  description?: unknown;
  tujuan?: unknown;
  selesai_bila?: unknown;
}

export interface SubfeatureDraft {
  title?: unknown;
  tujuan?: unknown;
  selesai_bila?: unknown;
}

export interface TaskDraft {
  id?: unknown;
  sub_feature?: unknown;
  title?: unknown;
  deps?: unknown;
}

type TierInput = Tier | string | null | undefined;
export interface DraftValidationOptions { reservedQa?: boolean; brief?: string; allowUnderMin?: boolean }

const words = (value: string): string[] => value.match(/[\p{L}\p{N}]+/gu) ?? [];
const text = (value: unknown): string => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
const key = (value: unknown): string => text(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const GENERIC = [
  /^(?:todo|tbd|placeholder|lorem ipsum|n\/?a|done|selesai)$/i,
  /^(?:berfungsi|berjalan|bekerja)(?: dengan baik)?$/i,
  /^(?:fitur|sistem|aplikasi|modul|komponen)(?: ini)? (?:berfungsi|berjalan|bekerja)(?: dengan baik)?$/i,
  /^(?:works? (?:well|as expected)|core components function as expected|modules integrate successfully)$/i,
  /^(?:komponen (?:utama )?terpasang dan berfungsi|integrasi antar modul berhasil|error handling aktif|pengujian berhasil)$/i,
  /^(?:implementasi|pengembangan|validasi|integrasi)(?: fitur| modul| sistem)?(?: selesai| berhasil)?$/i,
  /^(?:sesuai kebutuhan|sesuai requirement|as needed)$/i,
];
const VAGUE_CRITERION = /\b(?:handled safely|handled correctly|in a timely manner|relevant information|works? as expected|berjalan dengan baik|ditangani dengan aman|secara tepat waktu)\b|^(?:(?:the|a|an|system|platform|customer|user|owner|payment|booking|status|data|notification|report|pembayaran|pemesanan|status|data|notifikasi|laporan)\s+){0,4}(?:is|are|telah|sudah)\s+(?:updated|confirmed|generated|processed|sent|diperbarui|dikonfirmasi|dibuat|diproses|dikirim)\.?$/i;

const INTERNAL_FILLER = /\b(documentation|training|tutorial|help|support|feedback|improvement|maintenance|testing|compliance|seo|social sharing|reviews|dokumentasi|pelatihan|tutorial|bantuan|dukungan|umpan balik|peningkatan|pemeliharaan|pengujian|kepatuhan|berbagi sosial|ulasan)\b/i;
const CROSSCUTTING_FILLER = /\b(analytics|monitoring|performance|accessibility|error handling|security|analitik|pemantauan|performa|aksesibilitas|penanganan kesalahan|keamanan)\b/i;
const PHASE_WRAPPER_FILLER = /\b(?:documentation|testing|compliance|performance|maintenance|logging|log(?:s)?|security|error handling|integration|integrasi|dokumentasi|pengujian|kepatuhan|performa|pemeliharaan|pencatatan|keamanan|penanganan kesalahan)\b/i;
const IMPLEMENTATION_STEP = /^(?:initiate|implement|integrate|validate|update|handle|log|release|set up|configure|test|document|monitor)\s+(?:database\s+)?(?:lock|session|error|activity|availability|gateway|payment|checkout|timeslot|notification|integration)\b/i;
const NARROW_PHASE = /^(?:timezone(?: handling| management)?|time zone(?: handling| management)?|penanganan zona waktu|role enforcement|penegakan peran|double[- ]booking prevention|pencegahan bentrok (?:booking|pemesanan)|qa(?:\s*(?:&|and|dan)\s*(?:integration|integrasi))?|testing|pengujian|documentation|dokumentasi|training|pelatihan|maintenance|pemeliharaan|monitoring|pemantauan)$/i;
const TERM_ALIASES: Record<string, string[]> = {
  dokumentasi: ["documentation", "dokumentasi"], pelatihan: ["training", "pelatihan"], dukungan: ["support", "dukungan"],
  "umpan balik": ["feedback", "umpan balik"], peningkatan: ["improvement", "peningkatan"], pemeliharaan: ["maintenance", "pemeliharaan"],
  pengujian: ["testing", "pengujian"], kepatuhan: ["compliance", "kepatuhan"], "berbagi sosial": ["social sharing", "berbagi sosial"],
  ulasan: ["reviews", "ulasan"], analitik: ["analytics", "analitik"], pemantauan: ["monitoring", "pemantauan"],
  performa: ["performance", "performa"], aksesibilitas: ["accessibility", "aksesibilitas"],
  "penanganan kesalahan": ["error handling", "penanganan kesalahan"], keamanan: ["security", "keamanan"],
};

function escapesRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function unsupportedSubfeatureTitle(title: string, featureTitle: string, brief: string): boolean {
  if (/\b(?:browser close|window close|menutup browser)\b/i.test(title) && /\b(?:hold|reservation|lock|kunci)\b/i.test(title)) return true;
  if (/\b(?:tutorial|help and support|bantuan dan dukungan)\b/i.test(title) && !/\b(?:tutorial|help and support|bantuan dan dukungan)\b/i.test(brief)) return true;
  if (/^(?:responsive (?:ui )?layout|search query optimization|timeslot lock mechanism|database transaction locking)$/i.test(title)) return true;
  if (/\b(?:webhook|callback)\b.*\berror handling\b/i.test(title) && /\b(?:webhook|callback)s?\b/i.test(brief)) return false;
  // A phase name with a technical work item appended is a task, not another product capability.
  if (PHASE_WRAPPER_FILLER.test(title)) {
    const stripped = key(title.replace(new RegExp(PHASE_WRAPPER_FILLER.source, "gi"), " "));
    const parentWords = new Set(key(featureTitle).split(" "));
    const novel = stripped.split(" ").filter((word) => word && !parentWords.has(word) && !/^(?:and|for|of|the|system|module|gateway|platform|user|customer|owner|app)$/i.test(word));
    if (novel.length === 0) return true;
  }
  if (IMPLEMENTATION_STEP.test(title) && !/\b(?:webhook|callback)\b/i.test(title)) return true;
  const term = title.match(INTERNAL_FILLER)?.[0] ?? title.match(CROSSCUTTING_FILLER)?.[0];
  if (!term) return false;
  const lowerTerm = term.toLowerCase();
  const lowerBrief = brief.toLowerCase();
  const aliases = TERM_ALIASES[lowerTerm] ?? [lowerTerm];
  const mentioned = aliases.some((alias) => new RegExp(`\\b${escapesRegExp(alias)}\\b`, "i").test(lowerBrief));
  const explicitlyExcluded = aliases.some((alias) => new RegExp(`\\b(?:do not|don't|without|exclude|no|jangan|tanpa|tidak termasuk)\\b[^.!?]{0,120}\\b${escapesRegExp(alias)}\\b`, "i").test(lowerBrief));
  if (explicitlyExcluded) return true;
  if (["analytics", "analitik"].includes(lowerTerm) && /report|reports|analytics|insight|laporan/i.test(featureTitle)) return false;
  if (["security", "keamanan"].includes(lowerTerm) && /security|access control|keamanan|kontrol akses/i.test(featureTitle)) return false;
  if (mentioned) return false;
  const remaining = title.replace(new RegExp(INTERNAL_FILLER.source, "gi"), " ").replace(new RegExp(CROSSCUTTING_FILLER.source, "gi"), " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !/^(?:and|or|for|of|the|in|on|with|to|at|user|users|owner|owners|customer|customers|admin|platform|system|feature|module|dan|atau|untuk|dari|dengan|di|pada|pengguna|pemilik|pelanggan|sistem|fitur|modul)$/i.test(word));
  return remaining.length < 2;
}

function substantive(value: unknown, minCharacters: number, minWords: number): boolean {
  const candidate = text(value);
  if (candidate.length < minCharacters || words(candidate).length < minWords) return false;
  return !GENERIC.some((pattern) => pattern.test(candidate));
}

export function removeVagueCriteria(criteria: readonly string[], minimum: number): string[] {
  const kept = criteria.filter((criterion) => !VAGUE_CRITERION.test(text(criterion)));
  return kept.length >= minimum ? kept : [...criteria];
}

function checkTitle(value: unknown, path: string, issues: string[]): string {
  const title = text(value);
  if (title.length < 3 || GENERIC.some((pattern) => pattern.test(title))) {
    issues.push(`${path}: judul harus spesifik dan tidak kosong.`);
  }
  return title;
}

function checkGoal(value: unknown, path: string, issues: string[]): void {
  if (!substantive(value, 18, 3)) issues.push(`${path}: tujuan harus menjelaskan hasil yang spesifik.`);
}

function checkCriteria(value: unknown, path: string, min: number, max: number | null, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push(`${path}: kriteria selesai harus berupa daftar.`);
    return;
  }
  if (value.length < min || (max !== null && value.length > max)) {
    issues.push(`${path}: perlu ${max === null ? `minimal ${min}` : `${min}-${max}`} kriteria, diterima ${value.length}.`);
  }
  const seen = new Set<string>();
  value.forEach((criterion, index) => {
    if (!substantive(criterion, 18, 3)) {
      issues.push(`${path}[${index}]: kriteria harus menyebut hasil yang dapat diuji secara spesifik.`);
    } else if (VAGUE_CRITERION.test(text(criterion))) {
      issues.push(`${path}[${index}]: kriteria terlalu umum; sebutkan pemicu, hasil yang dapat diamati, dan kondisi gagal yang relevan.`);
    }
    const normalized = key(criterion);
    if (normalized && seen.has(normalized)) issues.push(`${path}[${index}]: kriteria duplikat.`);
    seen.add(normalized);
  });
}

/** Validate one Stage 1 feature list before accepting the model response. */
export function validateFeatureDraft(features: readonly FeatureDraft[], tier: TierInput, brief = ""): string[] {
  const issues: string[] = [];
  const [min, max] = structureLimits(tier).features;
  if (!Array.isArray(features)) return ["features: daftar fitur tidak ada."];
  if (features.length < min || features.length > max) {
    issues.push(`features: paket ${tier === "max" ? "Max" : tier === "pro" ? "Pro" : "Free"} perlu ${min}-${max} fase, diterima ${features.length}.`);
  }
  const seen = new Set<string>();
  features.forEach((feature, index) => {
    const path = `features[${index}]`;
    const title = checkTitle(feature?.title, `${path}.title`, issues);
    if (NARROW_PHASE.test(title) && !new RegExp(`\\b(?:platform|tool|product|aplikasi|sistem)\\s+(?:for|untuk)\\s+${escapesRegExp(title)}\\b`, "i").test(brief)) {
      issues.push(`${path}.title: "${title}" terlalu sempit untuk satu fase; gabungkan ke workflow produk terkait.`);
    }
    const normalized = key(title);
    if (normalized && seen.has(normalized)) issues.push(`${path}.title: judul fitur duplikat.`);
    seen.add(normalized);
    if (!substantive(feature?.description, 18, 3)) {
      issues.push(`${path}.description: deskripsi harus menjelaskan fungsi yang spesifik.`);
    }
    checkGoal(feature?.tujuan, `${path}.tujuan`, issues);
    checkCriteria(feature?.selesai_bila, `${path}.selesai_bila`, 2, 8, issues);
  });
  const featureCopy = features.map((feature) => [feature.title, feature.description, feature.tujuan, ...(Array.isArray(feature.selesai_bila) ? feature.selesai_bila : [])].map(text).join(" ")).join(" ");
  if (/\b(?:administrators?|admins?|administrator|admin|platform administrator|pengelola platform)\s+(?:review|approve|reject|moderate|handle|audit|manage|meninjau|menyetujui|menolak|memoderasi|menangani|mengelola)\b/i.test(brief)
    && !/\b(?:administrators?|admins?|administrator|admin|moderation|moderasi|pengelola platform)\b/i.test(featureCopy)) {
    issues.push("features: alur administrator yang diminta brief belum diwakili fase dan kriteria selesai.");
  }
  return issues;
}

/** Validate the Stage 2 decomposition for one Stage 1 feature. */
export function validateSubfeatureDraft(
  feature: { title?: unknown },
  subs: readonly SubfeatureDraft[],
  tier: TierInput,
  options: DraftValidationOptions = {},
): string[] {
  const issues: string[] = [];
  const [rawMin, rawMax] = structureLimits(tier).subFeatures;
  const reserved = options.reservedQa ? 1 : 0;
  const [min, max] = [rawMin - reserved, tier === "max" && options.reservedQa ? Math.min(rawMax - reserved, structureLimits(tier).tasks[1] - 4) : rawMax - reserved];
  const featureTitle = text(feature?.title);
  if (!featureTitle) issues.push("feature.title: judul fitur induk tidak ada.");
  if (!Array.isArray(subs)) return [...issues, "sub_features: daftar subfitur tidak ada."];
  if ((!options.allowUnderMin && subs.length < min) || subs.length > max) {
    issues.push(`sub_features: perlu ${min}-${max} subfitur untuk fase ${featureTitle || "ini"}, diterima ${subs.length}.`);
  }
  const seenTitles = new Set<string>();
  const seenGoals = new Set<string>();
  subs.forEach((sub, index) => {
    const path = `sub_features[${index}]`;
    const title = checkTitle(sub?.title, `${path}.title`, issues);
    if (/^qa\s*(?:&|and|dan)\s*(?:integrasi|integration)$/i.test(title)) {
      issues.push(`${path}.title: QA & Integrasi ditambahkan oleh sistem pada fase terakhir, bukan oleh model.`);
    }
    if (unsupportedSubfeatureTitle(title, featureTitle, options.brief ?? "")) {
      issues.push(`${path}.title: subfitur "${title}" tampak sebagai isi generik atau di luar brief; jadikan detail task atau pilih kemampuan produk yang diminta.`);
    }
    const normalizedTitle = key(title);
    if (normalizedTitle && normalizedTitle === key(featureTitle)) {
      issues.push(`${path}.title: subfitur harus lebih spesifik dari fitur induk.`);
    }
    const semanticTitle = key(title.replace(/\b(?:secure|safe|robust|reliable|enhanced|advanced|seamless|fast|quick|efisien|aman|terintegrasi)\b/gi, " "));
    if (normalizedTitle && (seenTitles.has(normalizedTitle) || seenTitles.has(semanticTitle))) issues.push(`${path}.title: judul subfitur duplikat.`);
    seenTitles.add(normalizedTitle);
    seenTitles.add(semanticTitle);
    checkGoal(sub?.tujuan, `${path}.tujuan`, issues);
    const normalizedGoal = key(sub?.tujuan);
    if (normalizedGoal && seenGoals.has(normalizedGoal)) issues.push(`${path}.tujuan: tujuan subfitur duplikat.`);
    seenGoals.add(normalizedGoal);
    checkCriteria(sub?.selesai_bila, `${path}.selesai_bila`, 2, null, issues);
  });
  return issues;
}

/** Validate task coverage and its dependency graph before assigning task refs. */
export function validateTaskDraft(
  tasks: readonly TaskDraft[],
  subTitles: readonly string[],
  tier: TierInput,
  options: DraftValidationOptions = {},
): string[] {
  const issues: string[] = [];
  const [rawMin, rawMax] = structureLimits(tier).tasks;
  const reserved = options.reservedQa ? 4 : 0;
  const [min, max] = [rawMin - reserved, rawMax - reserved];
  if (!Array.isArray(tasks)) return ["tasks: daftar task tidak ada."];
  if (!Array.isArray(subTitles) || subTitles.length === 0) return ["sub_features: daftar subfitur untuk task tidak ada."];
  if (tasks.length < min || tasks.length > max) {
    issues.push(`tasks: perlu ${min}-${max} task per fase, diterima ${tasks.length}.`);
  }

  const expectedSubs = new Map(subTitles.map((title) => [key(title), title]));
  const coveredSubs = new Set<string>();
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const dependencies = new Map<string, string[]>();

  tasks.forEach((task, index) => {
    const path = `tasks[${index}]`;
    const id = text(task?.id);
    if (!/^t[1-9]\d*$/i.test(id) || task?.id !== id) {
      issues.push(`${path}.id: gunakan ID unik berurutan seperti t1, t2 tanpa spasi.`);
    }
    if (id && seenIds.has(id)) issues.push(`${path}.id: ID ${id} duplikat.`);
    seenIds.add(id);

    const title = text(task?.title);
    if (!substantive(title, 12, 2) || title.length > 60) {
      issues.push(`${path}.title: task harus spesifik, dapat dikerjakan, dan maksimal 60 karakter.`);
    }
    const normalizedTitle = key(title);
    if (normalizedTitle && seenTitles.has(normalizedTitle)) issues.push(`${path}.title: judul task duplikat.`);
    seenTitles.add(normalizedTitle);

    const subKey = key(task?.sub_feature);
    if (!expectedSubs.has(subKey)) {
      issues.push(`${path}.sub_feature: harus cocok dengan salah satu judul subfitur.`);
    } else {
      coveredSubs.add(subKey);
    }

    if (!Array.isArray(task?.deps) || !task.deps.every((dep: unknown) => typeof dep === "string")) {
      issues.push(`${path}.deps: dependency harus berupa daftar ID task.`);
      return;
    }
    const deps = task.deps as string[];
    if (new Set(deps).size !== deps.length) issues.push(`${path}.deps: ada dependency duplikat.`);
    dependencies.set(id, deps);
  });

  for (const [normalized, title] of expectedSubs) {
    if (!coveredSubs.has(normalized)) issues.push(`sub_features: "${title}" belum memiliki task.`);
  }

  for (const [id, deps] of dependencies) {
    for (const dep of deps) {
      if (!seenIds.has(dep)) issues.push(`tasks ${id}: dependency ${dep} tidak ditemukan.`);
      if (dep === id) issues.push(`tasks ${id}: tidak boleh bergantung pada dirinya sendiri.`);
    }
  }

  const visited = new Set<string>();
  const active = new Set<string>();
  function visit(id: string): boolean {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    active.add(id);
    for (const dep of dependencies.get(id) ?? []) {
      if (dependencies.has(dep) && visit(dep)) return true;
    }
    active.delete(id);
    visited.add(id);
    return false;
  }
  if ([...dependencies.keys()].some(visit)) issues.push("tasks: dependency membentuk siklus.");
  return issues;
}

/** Check the persisted shape after the reserved QA subfeature and tasks are added. */
export function validateFinalPlan(plan: Pick<Plan, "features" | "tier">): string[] {
  const issues: string[] = [];
  const limits = structureLimits(plan.tier);
  const features = plan.features;
  if (!Array.isArray(features)) return ["features: daftar fase akhir tidak ada."];
  if (features.length < limits.features[0] || features.length > limits.features[1]) {
    issues.push(`features: hasil akhir perlu ${limits.features[0]}-${limits.features[1]} fase, diterima ${features.length}.`);
  }
  features.forEach((feature, featureIndex) => {
    const subs = feature.subFeatures;
    const path = `features[${featureIndex}]`;
    if (!Array.isArray(subs)) {
      issues.push(`${path}.subFeatures: daftar subfitur akhir tidak ada.`);
      return;
    }
    if (subs.length < limits.subFeatures[0] || subs.length > limits.subFeatures[1]) {
      issues.push(`${path}.subFeatures: hasil akhir perlu ${limits.subFeatures[0]}-${limits.subFeatures[1]} subfitur, diterima ${subs.length}.`);
    }
    let taskCount = 0;
    subs.forEach((sub, subIndex) => {
      const count = Array.isArray(sub.tasks) ? sub.tasks.length : 0;
      if (count === 0) issues.push(`${path}.subFeatures[${subIndex}]: belum memiliki task.`);
      taskCount += count;
    });
    if (taskCount < limits.tasks[0] || taskCount > limits.tasks[1]) {
      issues.push(`${path}.tasks: hasil akhir perlu ${limits.tasks[0]}-${limits.tasks[1]} task, diterima ${taskCount}.`);
    }
  });
  return issues;
}
