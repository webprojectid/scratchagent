export interface ScopeCandidate {
  path: string;
  text: string;
}

export type ScopeAnswer = string | { question?: string; answer?: string };

export interface ScopeValidationInput {
  brief: string;
  confirmedAnswers?: readonly ScopeAnswer[];
  candidates: readonly ScopeCandidate[];
}

interface Capability {
  name: string;
  pattern: RegExp;
}

// These are optional product capabilities, not mandatory implementation details.
// Keep patterns narrow: "admin reviews a request" is not a customer review feature,
// and an ordinary cache is not offline access.
const OPTIONAL_CAPABILITIES: readonly Capability[] = [
  { name: "two-factor authentication", pattern: /\b(?:two[- ]factor authentication|two[- ]step verification|2fa|mfa|otp login|login otp|autentikasi dua faktor|verifikasi dua langkah)\b/i },
  { name: "customer feedback", pattern: /\b(?:customer|user|pelanggan|pengguna)\s+(?:feedback|umpan balik)(?:\s+(?:submission|form|feature|pengiriman))?\b|\b(?:feedback|umpan balik)\s+(?:submission|form|feature|pengiriman)\b/i },
  { name: "marketplace reviews", pattern: /\b(?:marketplace|public|venue|court|product|lapangan|produk)\s+(?:(?:feedback|ratings?|umpan balik|penilaian)\s+(?:and|dan)\s+)?(?:reviews?|ratings?|ulasan|penilaian)\b|\b(?:customer|user|pelanggan|pengguna)\s+(?:reviews?|ratings?|ulasan|penilaian)\b(?=\s*(?:[.,;:]|$|and\s+ratings))|\b(?:post|submit|publish|write|rate|kirim|tulis|beri)\s+(?:\w+\s+){0,3}(?:reviews?|ratings?|ulasan|penilaian)\b|\b(?:reviews?|ratings?|ulasan|penilaian)\s+(?:for|of|on|about|management|page|section|system|venue|court|lapangan|produk)\b|\bfeedback\s+(?:and|dan)\s+reviews?\b|\bratings?\b/i },
  { name: "social networking/media", pattern: /\b(?:social\s+(?:network(?:ing)?|media|sharing|feed|community|login|links?)|jejaring\s+sosial|media\s+sosial|berbagi\s+sosial|bagikan\s+ke\s+(?:instagram|facebook|tiktok|x|twitter))\b/i },
  { name: "dynamic or peak pricing", pattern: /\b(?:dynamic|surge|peak(?:\s+hour|\s+time)?)\s+(?:prices?|pricing|rates?)\b|\b(?:prices?|pricing|rates?)\s+(?:dynamic|surge|peak)\b|\bharga\s+(?:dinamis|jam\s+sibuk|saat\s+sibuk|puncak)\b/i },
  { name: "pricing tiers", pattern: /\b(?:custom|multiple|variable|time[- ]based|tiered)\s+(?:court\s+|venue\s+)?(?:pricing|price|rate)\s+tiers?\b|\b(?:court|venue)\s+(?:pricing|price|rate)\s+tiers?\b|\bpricing\s+tiers?\b/i },
  { name: "discounts/promotions", pattern: /\b(?:discounts?|promotions?|promos?|coupons?|vouchers?|diskon|promosi|kupon|potongan\s+harga)\b/i },
  { name: "loyalty", pattern: /\b(?:loyalty|reward\s+points?|poin\s+(?:loyalitas|hadiah)|program\s+loyalitas)\b/i },
  { name: "referrals", pattern: /\b(?:referrals?|refer\s+a\s+friend|ajak\s+teman|program\s+rujukan|kode\s+referal)\b/i },
  { name: "membership", pattern: /\b(?:premium|paid)(?:\s+\w+){0,2}\s+memberships?\b|\b(?:customer|user|loyalty)\s+memberships?\b|\bmemberships?\s+(?:plans?|tiers?|programs?|fees?|subscriptions?)\b|\bmember\s+(?:tiers?|programs?|plans?)\b|\b(?:keanggotaan\s+(?:pelanggan|berbayar)|program\s+anggota)\b/i },
  { name: "CSV export", pattern: /\bcsv\b/i },
  { name: "PDF export", pattern: /\bpdf\b/i },
  { name: "report export", pattern: /\b(?:export|download|ekspor|unduh)\s+(?:\w+\s+){0,3}(?:reports?|analytics|laporan)\b|\b(?:reports?|laporan)\s+(?:export|ekspor|download|unduh)\b/i },
  { name: "booking export", pattern: /\b(?:bookings?|reservations?|pemesanan|reservasi)(?:\s+history)?\s+(?:exports?|ekspor)\b|\b(?:exports?|ekspor|download)\s+(?:bookings?|reservations?|pemesanan|reservasi)(?:\s+history)?\b/i },
  { name: "metrics export", pattern: /\b(?:exports?|ekspor|download)\s+(?:\w+\s+){0,2}(?:metrics?|metrik)\b|\b(?:metrics?|metrik)\s+(?:exports?|ekspor)\b/i },
  { name: "search map view", pattern: /\b(?:search results?|hasil pencarian)\s+(?:map view|map|peta)\b|\b(?:map view|peta)\s+(?:of|for|dari|untuk)\s+(?:search results?|hasil pencarian)\b/i },
  { name: "checkout hold extension", pattern: /\b(?:timeslot|checkout|booking|reservation)?\s*holds?\s+(?:extension|renewal|perpanjangan)\b|\b(?:extend|renew|perpanjang)\s+(?:the\s+)?(?:timeslot|checkout|booking|reservation)?\s*hold\b/i },
  { name: "analytics alerts", pattern: /\b(?:analytics|reporting|revenue|analitik|laporan|pendapatan)\s+(?:data\s+)?(?:alerts?|peringatan)\b/i },
  { name: "metric alerts", pattern: /\b(?:metrics?|metrik)\s+(?:alerts?|peringatan)\b/i },
  { name: "daily summary", pattern: /\b(?:owner|staff|admin|pemilik|staf)\s+daily\s+summary\s+report\b|\b(?:daily|harian)\s+(?:summary|ringkasan)\s+(?:report|laporan)\b/i },
  { name: "manual booking", pattern: /\b(?:manual|walk[- ]in)\s+(?:bookings?|reservations?|pemesanan|reservasi)\s+(?:creation|entry|input|pembuatan)?\b/i },
  { name: "booking calendar integration", pattern: /\b(?:booking|reservation|pemesanan|reservasi)\s+calendar\s+integration\b/i },
  { name: "batch booking updates", pattern: /\b(?:booking|reservation|pemesanan|reservasi)\s+status\s+(?:batch|bulk)\s+updates?\b/i },
  { name: "listing appeals", pattern: /\b(?:listing|suspension|moderation|daftar|penangguhan|moderasi)\s+appeals?\b/i },
  { name: "third-party audit integration", pattern: /\b(?:audit|activity)\s+logs?\s+integration\s+with\s+third[- ]party\b/i },
  { name: "template library", pattern: /\b(?:moderation|notification|email|pesan|notifikasi|moderasi)\s+(?:note\s+)?(?:template library|template collection|pustaka template)\b/i },
  { name: "revenue forecasting", pattern: /\b(?:revenue|sales|occupancy|pendapatan|penjualan)\s+(?:forecasting|forecasts?|predictions?|prediksi|prakiraan)\b|\b(?:forecasting|forecasts?|predictions?|prediksi|prakiraan)\s+(?:revenue|sales|occupancy|pendapatan|penjualan)\b/i },
  { name: "audit alerts", pattern: /\b(?:audit|activity)\s+(?:log\s+)?(?:alerts?|warnings?|peringatan)\b|\b(?:alerts?|warnings?|peringatan)\s+(?:for\s+)?(?:audit|activity)\b/i },
  { name: "notification scheduling", pattern: /\b(?:notification|email|notifikasi)\s+(?:scheduling|scheduler|penjadwalan)\b|\b(?:schedule|jadwalkan)\s+(?:notifications?|emails?|notifikasi)\b/i },
  { name: "notification preferences", pattern: /\b(?:notification|email)\s+(?:preferences?|settings?|channel\s+preferences?)\b|\b(?:preferences?|pengaturan)\s+(?:for|of|untuk)\s+(?:notifications?|notifikasi)\b|\bpreferensi\s+notifikasi\b/i },
  { name: "booking or payment reminders", pattern: /\b(?:booking|payment|match|pembayaran|jadwal|pertandingan)\s+(?:reminders?|pengingat)\b|\bpengingat\s+(?:pemesanan|pembayaran|pertandingan)\b/i },
  { name: "QR check-in", pattern: /\b(?:qr\s*codes?|barcodes?)\s+(?:check[- ]?in|scann?ing)\b|\b(?:check[- ]?in|scan)\s+(?:by|via|with|using|menggunakan)\s+(?:a\s+)?(?:qr\s*codes?|barcodes?)\b|\bscann?ing\s+(?:a\s+)?(?:qr\s*codes?|barcodes?)\b/i },
  { name: "walk-in booking", pattern: /\bwalk\s+in\b|\b(?:booking|reservation|pemesanan|reservasi)\s+(?:langsung\s+di\s+tempat|tanpa\s+reservasi)\b/i },
  { name: "offline access/cache", pattern: /\boffline\s+(?:cache|caching|mode|storage|sync|data|access)\b|\b(?:cache|caching|storage|sync|access)\s+offline\b|\b(?:mode|akses|penyimpanan)\s+luring\b/i },
  { name: "ID badges", pattern: /\b(?:id|identity|identitas)\s+(?:badges?|cards?|lencana|kartu)\b|\b(?:badges?|lencana|kartu)\s+(?:id|identity|identitas)\b|\bkartu\s+identitas\b/i },
  { name: "mobile app", pattern: /\b(?:mobile\s+(?:app|application)|aplikasi\s+(?:mobile|seluler)|native\s+(?:ios|android)\s+app)\b/i },
];

const NEGATION = /\b(?:do\s+not|does\s+not|don'?t|must\s+not|should\s+not|cannot|can'?t|never|without|exclud(?:e|es|ed|ing)|not(?!\s+(?:only|just|merely)\b)|no(?![\w-])|tidak|tanpa|jangan|bukan|tak|dilarang)\b/gi;
const AFFIRMATION = /\b(?:want|wants|include|includes|support|supports|allow|allows|provide|provides|need|needs|require|requires|add|adds|enable|enables|mau|ingin|butuh|sertakan|dukung|boleh|izinkan|tambahkan|aktifkan)\b/gi;
const EXCLUSION_CLAUSE = /\b(?:do\s+not|does\s+not|don'?t|must\s+not|should\s+not|without|exclud(?:e|es|ed|ing)|not\s+needed|no(?![\w-])|tidak\s+perlu|tanpa|jangan|dilarang)\s+(?:(?:add|include|create|invent|support|allow|build|buat|tambahkan|masukkan|sertakan)\s+)?([^.!?;\n]{2,120})/gi;

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\bno[- ]shows?\b/g, "noshow")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function clauses(value: string): string[] {
  return value.split(/[.!?;\n]|\b(?:but|however|tetapi|namun)\b/i).map(normalize).filter(Boolean);
}

function lastMatchEnd(pattern: RegExp, value: string, before: number): number {
  pattern.lastIndex = 0;
  let last = -1;
  for (const match of value.matchAll(pattern)) {
    if (match.index >= before) break;
    last = match.index + match[0].length;
  }
  return last;
}

function mentionState(value: string, pattern: RegExp, affirmativeWins = false): "requested" | "excluded" | null {
  let requested = false;
  let excluded = false;
  for (const clause of clauses(value)) {
    const mentions = new RegExp(pattern.source, "gi");
    for (const match of clause.matchAll(mentions)) {
      const negationEnd = lastMatchEnd(NEGATION, clause, match.index);
      const affirmativeEnd = lastMatchEnd(AFFIRMATION, clause, match.index);
      const negativeAfter = /^(?:\s+(?:is|are|must\s+be|akan))?\s+(?:not\s+(?:available|supported|included|allowed|required|needed|planned|in\s+scope|part\s+of)|disabled|unavailable|unsupported|excluded|out\s+of\s+scope|dilarang|dinonaktifkan|tidak\s+(?:tersedia|diperlukan|dibutuhkan))\b/i
        .test(clause.slice(match.index + match[0].length));
      if (negativeAfter || (negationEnd >= 0 && negationEnd >= affirmativeEnd && match.index - negationEnd < 120)) excluded = true;
      else requested = true;
    }
  }
  if (affirmativeWins && requested) return "requested";
  return excluded ? "excluded" : requested ? "requested" : null;
}

function answerState(answer: ScopeAnswer, capability: Capability): "requested" | "excluded" | null {
  if (typeof answer === "string") return mentionState(answer, capability.pattern);
  const response = answer.answer?.trim() ?? "";
  if (capability.pattern.test(normalize(answer.question ?? ""))) {
    if (/^(?:no|nope|not\s+now|tidak|enggak|nggak|jangan)\b/i.test(response)) return "excluded";
    if (/^(?:yes|yep|ya|iya|boleh|perlu)\b/i.test(response)) return "requested";
  }
  return mentionState(response, capability.pattern);
}

function capabilityState(capability: Capability, brief: string, answers: readonly ScopeAnswer[]): "requested" | "excluded" | null {
  // A later clarification can supersede the original brief. A negative answer wins
  // over an earlier affirmative one, while an explicit yes can restore scope.
  for (let index = answers.length - 1; index >= 0; index--) {
    const state = answerState(answers[index], capability);
    if (state) return state;
  }
  return mentionState(brief, capability.pattern);
}

export function scopeGuidance(): string {
  return "BRIEF FIRST: Preserve every requested actor, workflow, delivery platform and confirmed decision. Relevant supporting capabilities may be proposed when they directly complete a requested workflow or improve its usability, reliability or operation. Explain which requested workflow each addition supports, label it as a supporting proposal rather than a user requirement, and keep it subordinate to the requested scope. Never replace requested capabilities, add unrelated products or pad tier counts with extras. Explicit exclusions and later user clarifications take priority over suggestions. Unconfirmed business policies, vendors and numerical targets must remain configurable open decisions or clearly identified proposals; do not present them as user-confirmed facts.";
}

function exclusionClause(value: string): string {
  return value.split(/,\s*(?:and\s+|dan\s+)?(?=(?:customers?|users?|owners?|admins?|staff|pay|reschedule|cancel|manage|send|receive|view|create|allow|support|provide|include|enable|pengguna|pemilik|bayar|kirim|kelola)\b)/i, 1)[0];
}

function explicitExclusions(value: string): string[] {
  const phrases = new Set<string>();
  for (const match of value.matchAll(EXCLUSION_CLAUSE)) {
    for (const part of exclusionClause(match[1]).split(/,|\b(?:and|or|dan|atau)\b/i)) {
      const phrase = normalize(part.replace(/^(?:a|an|the|any|fitur|feature|features|fitur fitur)\s+/i, ""));
      if (/^(?:double bookings?|duplicate (?:bookings?|payments?|charges?|submissions?)|data loss|overselling|unauthorized access)$/i.test(phrase)) continue;
      if (phrase.length >= 5 && phrase.length <= 70 && phrase.split(" ").length <= 8) phrases.add(phrase);
    }
  }
  return [...phrases];
}

function hasPhrase(value: string, phrase: string): boolean {
  return ` ${normalize(value)} `.includes(` ${phrase} `);
}

/** Absence from the brief is not an exclusion; only explicit user conflicts block a claim. */
export function validateScopeClaims(input: ScopeValidationInput): string[] {
  const issues: string[] = [];
  const answers = input.confirmedAnswers ?? [];
  const exclusions = [
    ...explicitExclusions(input.brief),
    ...answers.flatMap((answer) => explicitExclusions(typeof answer === "string" ? answer : answer.answer ?? "")),
  ];

  for (const candidate of input.candidates) {
    if (!candidate.text.trim()) continue;
    const path = candidate.path || "candidate";
    const candidateClauses = clauses(candidate.text);
    let flagged = false;
    for (const capability of OPTIONAL_CAPABILITIES) {
      if (!candidateClauses.some((clause) => capability.pattern.test(clause))) continue;
      if (mentionState(candidate.text, capability.pattern, true) === "excluded") continue;
      if (capabilityState(capability, input.brief, answers) !== "excluded") continue;
      issues.push(`${path}: ${capability.name} bertentangan dengan pengecualian eksplisit pengguna.`);
      flagged = true;
    }
    if (flagged) continue;
    for (const phrase of exclusions) {
      if (!hasPhrase(candidate.text, phrase)) continue;
      if (OPTIONAL_CAPABILITIES.some((capability) =>
        capability.pattern.test(phrase) && capabilityState(capability, input.brief, answers) === "requested")) continue;
      const phrasePattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}\\b`, "i");
      if (mentionState(candidate.text, phrasePattern) === "excluded") continue;
      const mentions = [...normalize(candidate.text).matchAll(new RegExp(phrasePattern.source, "gi"))];
      if (mentions.length && mentions.every((mention) => /\b(?:prevent\w*|avoid\w*|reject\w*|block\w*|mencegah|menolak)\s+(?:\w+\s+){0,3}$/i.test(normalize(candidate.text).slice(0, mention.index)))) continue;
      const answerOverrides = answers.some((answer) => {
        const response = typeof answer === "string" ? answer : answer.answer ?? "";
        return hasPhrase(response, phrase) && mentionState(response, phrasePattern) === "requested";
      });
      if (!answerOverrides) issues.push(`${path}: bertentangan dengan pengecualian brief (${phrase}).`);
      break;
    }
  }
  return issues;
}

/** Remove explicit conflicts only when enough usable criteria remain. */
export function removeUnrequestedCriteria(
  criteria: readonly string[],
  scope: Pick<ScopeValidationInput, "brief" | "confirmedAnswers">,
  minimum: number,
): string[] {
  const kept = criteria.filter((criterion, index) => validateScopeClaims({
    ...scope,
    candidates: [{ path: `criteria[${index}]`, text: criterion }],
  }).length === 0);
  return kept.length >= minimum ? kept : [...criteria];
}
