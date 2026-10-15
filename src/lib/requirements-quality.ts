export interface RequirementsDraft {
  user_flow?: unknown;
  requirements?: unknown;
  tech_stack?: unknown;
}

export interface RequirementsValidationOptions {
  brief?: string;
  confirmedAnswers?: readonly { question: string; answer: string }[];
  stack?: readonly string[] | string;
  language?: string;
}

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const compact = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
const words = (value: string): string[] => value.match(/[\p{L}\p{N}]+/gu) ?? [];
const normalized = (value: unknown): string =>
  compact(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const EMPTY_COPY = /^(?:todo|tbd|n\/?a|none|placeholder|lorem ipsum|done|selesai|as needed|sesuai kebutuhan)$/i;
const GENERIC_COPY = /^(?:(?:the )?(?:system|application|app|platform|feature|module) (?:works?|functions?|runs?) (?:well|properly|as expected)|(?:sistem|aplikasi|fitur|modul) (?:berjalan|berfungsi|bekerja) dengan baik)$/i;
const GENERIC_NFR = /\b(?:seamless|optimal performance|performant|user.friendly|intuitive|scalab(?:le|ility)|future growth|robust|secure and reliable|relevant regulations?|best practices?|high availability|responsive|efficient|reliably|accurately|consistently|in a timely manner|enforced on the server|data security and privacy|keamanan data terjamin|pengalaman pengguna yang baik|mudah digunakan|cepat dan aman|dapat diskalakan|secara akurat|secara konsisten|tepat waktu|dengan andal)\b/i;
const TESTABLE_SIGNAL = /\b(?:\d+(?:[.,]\d+)?\s*(?:ms|milliseconds?|detik|seconds?|s|minutes?|menit|hours?|jam|days?|hari|%|kb|mb|gb|users?|pengguna|requests?|permintaan)|p\d{2}|https|tls|aes-?\d+|argon2|bcrypt|rls|row.level security|wcag|keyboard|screen reader|audit logs?|log audit|backup|restore|recovery|rate limit|idempoten\w*|idempoten|idempotent|http\s*[45]\d\d|UTC|TIMESTAMPTZ|latitude|longitude|queue|reject\w*|retri\w*|returns?|responds?|records?|logged?|masked?|encrypted?|blocked?|denied?|announced?|recovers?|mengembalikan|menolak|mencatat|memulihkan|terenkripsi|membatasi|diblokir)\b/i;
const NUMERIC_UNIT = /\b(\d+(?:[.,]\d+)?)\s*-?\s*(?:(?:concurrent|simultaneous|active|registered|monthly|daily|bersamaan|aktif)\s+)?(milliseconds?|msecs?|ms|seconds?|secs?|sec|s|detik|minutes?|mins?|min|menit|hours?|hrs?|jam|days?|hari|weeks?|minggu|months?|bulan|years?|tahun|percent|persen|%|users?|customers?|pengguna|requests?|permintaan|courts?|lapangan|venues?|lokasi|bookings?|pesanan|slots?|transactions?|transaksi|attempts?|percobaan|steps?|langkah|screens?|layar|pages?|halaman|files?|berkas|characters?|chars?|digits?|karakter|angka|mb|gb)(?=$|[^\p{L}\p{N}])/giu;
const ALWAYS_ON = /\b24\s*(?:\/|x|×)\s*7\b/giu;
const UNSOURCED_PROPOSAL = /\b(?:proposed|proposal|suggested|assumed|assumption|to confirm|to be confirmed|pending confirmation|subject to confirmation|not yet agreed|asumsi|usulan|diusulkan|perlu dikonfirmasi|belum disepakati|target sementara)\b/i;

type NumericClaim = { raw: string; key: string; topic: string | null; index: number };
const CLAIM_TOPICS = [
  ["search", /\b(?:search(?:es)?|filter(?:s|ing)?|quer(?:y|ies)|pencarian|mencari|cari)\b/gi],
  ["webhook", /\b(?:webhooks?|callbacks?)\b/gi],
  ["update", /\b(?:update|updates|updated|sync|synchronize|refresh|pembaruan|memperbarui)\b/gi],
  ["hold", /\b(?:holds?|held|reserv(?:e|es|ed|ation)|menahan|ditahan|reservasi)\b/gi],
  ["payment", /\b(?:payments?|checkouts?|deposits?|pembayaran|bayar)\b/gi],
  ["auth", /\b(?:auth|logins?|signins?|passwords?|otp|masuk|sandi)\b/gi],
  ["export", /\b(?:exports?|downloads?|ekspor|unduh)\b/gi],
  ["uptime", /\b(?:uptime|availability target|ketersediaan layanan)\b/gi],
  ["support", /\b(?:support|helpdesk|customer service|dukungan|bantuan)\b/gi],
] as const;

function sentenceBounds(value: string, at: number, length: number): { start: number; end: number } {
  let sentenceStart = 0;
  let sentenceEnd = value.length;
  for (const boundary of value.matchAll(/(?:[.!?]\s+|\n)/g)) {
    const position = boundary.index ?? 0;
    if (position < at) sentenceStart = position + boundary[0].length;
    else if (position >= at + length) { sentenceEnd = position; break; }
  }
  return { start: sentenceStart, end: sentenceEnd };
}

function claimTopic(value: string, at: number, length: number): string | null {
  // Keep a target inside its own sentence or confirmed-answer line. A nearby
  // claim in another sentence must not lend its topic to this number.
  const sentence = sentenceBounds(value, at, length);
  const start = Math.max(sentence.start, at - 100);
  const window = value.slice(start, Math.min(sentence.end, at + length + 60));
  let best: { topic: string; distance: number } | null = null;
  for (const [topic, pattern] of CLAIM_TOPICS) {
    for (const match of window.matchAll(pattern)) {
      const position = start + (match.index ?? 0);
      const distance = position < at ? at - (position + match[0].length) : position - (at + length);
      if (!best || distance < best.distance) best = { topic, distance };
    }
  }
  return best?.topic ?? null;
}

function numericKey(value: string, unit: string): string {
  const amount = Number(value.replace(",", "."));
  const word = unit.toLowerCase();
  if (/^(?:milliseconds?|msecs?|ms)$/.test(word)) return `time:${Math.round(amount)}`;
  if (/^(?:seconds?|secs?|sec|s|detik)$/.test(word)) return `time:${Math.round(amount * 1_000)}`;
  if (/^(?:minutes?|mins?|min|menit)$/.test(word)) return `time:${Math.round(amount * 60_000)}`;
  if (/^(?:hours?|hrs?|jam)$/.test(word)) return `time:${Math.round(amount * 3_600_000)}`;
  if (/^(?:days?|hari)$/.test(word)) return `time:${Math.round(amount * 86_400_000)}`;
  if (/^(?:weeks?|minggu)$/.test(word)) return `time:${Math.round(amount * 604_800_000)}`;
  if (/^(?:months?|bulan)$/.test(word)) return `months:${amount}`;
  if (/^(?:years?|tahun)$/.test(word)) return `years:${amount}`;
  if (/^(?:percent|persen|%)$/.test(word)) return `percent:${amount}`;
  if (/^(?:users?|customers?|pengguna)$/.test(word)) return `users:${amount}`;
  if (/^(?:requests?|permintaan)$/.test(word)) return `requests:${amount}`;
  if (/^(?:courts?|lapangan)$/.test(word)) return `courts:${amount}`;
  if (/^(?:venues?|lokasi)$/.test(word)) return `venues:${amount}`;
  if (/^(?:bookings?|pesanan)$/.test(word)) return `bookings:${amount}`;
  if (/^(?:slots?)$/.test(word)) return `slots:${amount}`;
  if (/^(?:transactions?|transaksi)$/.test(word)) return `transactions:${amount}`;
  if (/^(?:attempts?|percobaan)$/.test(word)) return `attempts:${amount}`;
  if (/^(?:steps?|langkah)$/.test(word)) return `steps:${amount}`;
  if (/^(?:screens?|layar)$/.test(word)) return `screens:${amount}`;
  if (/^(?:pages?|halaman)$/.test(word)) return `pages:${amount}`;
  if (/^(?:files?|berkas)$/.test(word)) return `files:${amount}`;
  if (/^(?:characters?|chars?|karakter)$/.test(word)) return `characters:${amount}`;
  if (/^(?:digits?|angka)$/.test(word)) return `digits:${amount}`;
  return `${word}:${amount}`;
}

function numericClaims(value: string): NumericClaim[] {
  const claims: NumericClaim[] = [];
  for (const match of value.matchAll(NUMERIC_UNIT)) {
    const raw = match[0];
    const key = numericKey(match[1], match[2]);
    if (key && Number.isFinite(Number(match[1].replace(",", ".")))) {
      claims.push({ raw, key, topic: claimTopic(value, match.index ?? 0, raw.length), index: match.index ?? 0 });
    }
  }
  for (const match of value.matchAll(ALWAYS_ON)) {
    claims.push({ raw: match[0], key: "always-on:24x7", topic: claimTopic(value, match.index ?? 0, match[0].length), index: match.index ?? 0 });
  }
  return claims;
}

function confirmedNumericSource(options: RequirementsValidationOptions): string {
  const parts = [options.brief ?? ""];
  for (const item of options.confirmedAnswers ?? []) {
    const answer = compact(item.answer);
    if (/^(?:no|tidak|bukan|jangan)\b/i.test(answer)) {
      // A rejected suggestion in a clarification question is not a confirmed target.
      const replacement = answer.match(/\b(?:use|pakai|gunakan|ganti(?:\s+ke)?|instead)\s+(.+?)(?=\b(?:instead of|rather than|bukan|not)\b|$)/i)?.[1];
      if (replacement) parts.push(replacement);
      continue;
    }
    if (/^(?:yes|ya|iya|betul|benar|setuju)[.!]?$/i.test(answer)) parts.push(item.question);
    parts.push(answer);
    const directCount = answer.match(/^\s*(\d+(?:[.,]\d+)?)\s*$/);
    const unit = item.question.match(/\b(users?|pengguna|courts?|lapangan|venues?|lokasi|bookings?|pesanan|slots?|transactions?|transaksi|attempts?|percobaan|steps?|langkah|screens?|layar|pages?|halaman)\b/i)?.[0];
    if (directCount && unit) parts.push(`${directCount[1]} ${unit}`);
  }
  return parts.join("\n");
}

function unsupportedNumericClaims(candidate: string, sourcedClaims: readonly NumericClaim[]): NumericClaim[] {
  return numericClaims(candidate).filter((claim) => {
    const sentence = sentenceBounds(candidate, claim.index, claim.raw.length);
    if (UNSOURCED_PROPOSAL.test(candidate.slice(sentence.start, sentence.end))) return false;
    return !sourcedClaims.some((source) => source.key === claim.key &&
      (!claim.topic || !source.topic || source.topic === claim.topic));
  });
}

function substantive(value: unknown, minCharacters: number, minWords: number): boolean {
  const candidate = compact(value);
  return candidate.length >= minCharacters && words(candidate).length >= minWords &&
    !EMPTY_COPY.test(candidate) && !GENERIC_COPY.test(candidate);
}

function checkDuplicates(items: readonly unknown[], path: string, issues: string[]): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const key = normalized(item);
    if (key && seen.has(key)) issues.push(`${path}[${index}]: duplikat.`);
    seen.add(key);
  });
}

function excludedPhrases(brief: string): string[] {
  const phrases: string[] = [];
  const clauses = /\b(?:do not (?:include|add|support|allow|invent)|don't (?:include|add|support|allow|invent)|must not (?:include|add|support|allow|invent)|without|exclude[sd]?|no|not needed|tidak perlu|tidak (?:ada|mendukung)|tanpa|jangan (?:tambahkan|buat|masukkan)|dilarang)\s+([^.!?;\n]{2,120})/gi;
  for (const match of brief.matchAll(clauses)) {
    const clause = match[1].split(/\s+(?:but|however|except|tetapi|namun)\s+/i, 1)[0];
    for (const part of clause.split(/,|\s+(?:and|or|dan|atau)\s+/i)) {
      const phrase = normalized(part
        .replace(/^(?:the|a|an|any|feature|features|fitur|need to|support for)\s+/i, "")
        .replace(/\s+(?:for now|at launch|in the mvp|pada mvp|di tahap awal)$/i, ""));
      if (phrase.length >= 5 && phrase.length <= 55 && words(phrase).length <= 7) phrases.push(phrase);
    }
  }
  return [...new Set(phrases)];
}

function negatesCapability(candidate: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:\\b(?:do(?:es)? not|must not|should not|cannot|never|no|without|prevent\\w*|reject\\w*|block\\w*|deny|prohibit\\w*|tidak|tak|tanpa|jangan|dilarang|mencegah|menolak|memblokir)\\b[^.!?;]{0,45}\\b${escaped}\\b)|(?:\\b${escaped}\\b[^.!?;]{0,35}\\b(?:disabled|unavailable|unsupported|dilarang|dinonaktifkan|tidak tersedia)\\b)`, "i").test(candidate);
}

function conflictsWithBrief(candidate: string, exclusions: readonly string[]): string | null {
  const normalizedCandidate = normalized(candidate);
  for (const exclusion of exclusions) {
    if (` ${normalizedCandidate} `.includes(` ${exclusion} `) && !negatesCapability(normalizedCandidate, exclusion)) {
      return exclusion;
    }
  }
  // Word order may differ for a named export format, so handle that explicit case separately.
  const excludedExport = exclusions.find((item) => /\b(?:csv|pdf)\b/.test(item) && /\b(?:export|exports|ekspor|unduh|download)\b/.test(item));
  if (excludedExport && /\b(?:csv|pdf)\b/.test(normalizedCandidate) &&
    /\b(?:export|exports|ekspor|unduh|download)\b/.test(normalizedCandidate) &&
    !/\b(?:not|no|without|tidak|tanpa|jangan)\b.{0,40}\b(?:export|exports|ekspor|unduh|download)\b/.test(normalizedCandidate)) {
    return excludedExport;
  }
  return null;
}

/** Validate product flows and requirements before accepting a generated PRD section. */
export function validateRequirementsDraft(
  draft: RequirementsDraft,
  options: RequirementsValidationOptions = {},
): string[] {
  const issues: string[] = [];
  const exclusions = excludedPhrases(options.brief ?? "");
  const sourcedNumericClaims = numericClaims(confirmedNumericSource(options));
  const checkNumericCommitment = (candidate: unknown, path: string): void => {
    const seen = new Set<string>();
    for (const claim of unsupportedNumericClaims(compact(candidate), sourcedNumericClaims)) {
      if (seen.has(claim.key)) continue;
      seen.add(claim.key);
      issues.push(`${path}: angka ${claim.raw} belum berasal dari brief atau jawaban terkonfirmasi; tandai sebagai usulan/asumsi yang perlu disetujui.`);
    }
  };
  const flows = draft?.user_flow;
  if (!Array.isArray(flows)) {
    issues.push("user_flow: daftar alur pengguna tidak ada.");
  } else {
    if (flows.length < 2) issues.push(`user_flow: perlu minimal 2 alur pengguna, diterima ${flows.length}.`);
    checkDuplicates(flows.map((flow) => asRecord(flow).title), "user_flow.title", issues);
    flows.forEach((flow, index) => {
      const value = asRecord(flow);
      const path = `user_flow[${index}]`;
      if (!substantive(value.title, 5, 2)) issues.push(`${path}.title: jelaskan aktor atau hasil alur secara spesifik.`);
      checkNumericCommitment(value.title, `${path}.title`);
      if (!Array.isArray(value.steps) || value.steps.length < 2) {
        issues.push(`${path}.steps: perlu minimal 2 langkah berurutan.`);
        return;
      }
      checkDuplicates(value.steps, `${path}.steps`, issues);
      value.steps.forEach((step, stepIndex) => {
        if (!substantive(step, 18, 3)) issues.push(`${path}.steps[${stepIndex}]: langkah harus menyebut tindakan yang dapat diamati.`);
        checkNumericCommitment(step, `${path}.steps[${stepIndex}]`);
        const exclusion = conflictsWithBrief(compact(step), exclusions);
        if (exclusion) issues.push(`${path}.steps[${stepIndex}]: bertentangan dengan pengecualian brief (${exclusion}).`);
      });
    });
  }

  const requirements = asRecord(draft?.requirements);
  for (const [field, minimum] of [["fungsional", 6], ["non_fungsional", 4]] as const) {
    const list = requirements[field];
    const path = `requirements.${field}`;
    if (!Array.isArray(list)) {
      issues.push(`${path}: daftar requirement tidak ada.`);
      continue;
    }
    if (list.length < minimum) issues.push(`${path}: perlu minimal ${minimum} requirement, diterima ${list.length}.`);
    const maximum = field === "fungsional" ? 20 : 12;
    if (list.length > maximum) issues.push(`${path}: batasi ke ${maximum} requirement yang paling penting; gabungkan butir yang mengulang alur yang sama.`);
    checkDuplicates(list, path, issues);
    list.forEach((entry, index) => {
      const candidate = compact(entry);
      if (!substantive(entry, 28, 5)) {
        issues.push(`${path}[${index}]: requirement harus menyebut hasil atau perilaku yang dapat diuji.`);
      } else if (field === "non_fungsional" && GENERIC_NFR.test(candidate) && !TESTABLE_SIGNAL.test(candidate)) {
        issues.push(`${path}[${index}]: klaim kualitas masih umum; tambahkan batas, mekanisme, atau perilaku yang bisa diuji.`);
      }
      checkNumericCommitment(candidate, `${path}[${index}]`);
      const exclusion = conflictsWithBrief(candidate, exclusions);
      if (exclusion) issues.push(`${path}[${index}]: bertentangan dengan pengecualian brief (${exclusion}).`);
    });
  }

  const techStack = draft?.tech_stack;
  if (!Array.isArray(techStack) || techStack.length === 0) {
    issues.push("tech_stack: pilih setidaknya satu teknologi beserta perannya.");
  } else {
    const seen = new Set<string>();
    techStack.forEach((entry, index) => {
      const value = asRecord(entry);
      const path = `tech_stack[${index}]`;
      const name = normalized(value.name);
      if (name.length < 2) issues.push(`${path}.name: nama teknologi tidak ada.`);
      if (name && seen.has(name)) issues.push(`${path}.name: teknologi duplikat.`);
      seen.add(name);
      if (!substantive(value.desc, 24, 4)) issues.push(`${path}.desc: jelaskan peran teknologi untuk produk ini.`);
      checkNumericCommitment(value.desc, `${path}.desc`);
    });
  }

  return issues;
}
