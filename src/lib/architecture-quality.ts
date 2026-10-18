/** Checks that generated technical prose explains the invariants requested in a brief. */
export interface ArchitectureQualityContext {
  brief: string;
  featureTitles?: readonly string[];
}

interface Obligations {
  concurrentBooking: boolean;
  paymentWebhook: boolean;
  timezone: boolean;
  roleAccess: boolean;
}

const BOOKING = /\b(?:book(?:ing|ings|ed)?|reserv(?:ation|ations|e|ing)|appointment|time[ -]?slot|schedule|pemesanan|reservasi|jadwal|lapangan)\b/i;
const CONCURRENCY = /\b(?:concurren\w*|double[ -]?book\w*|overlap\w*|race condition|simultaneous|same slot|bentrok|tumpang tindih|bersamaan|serentak)\b/i;
const PAYMENT = /\b(?:payment|pay(?:ment|ments)?|checkout|deposit|gateway|qris|bank transfer|pembayaran|bayar|pembayara\w*)\b/i;
const CALLBACK = /\b(?:webhooks?|callbacks?|duplicate event|duplicate notification|idempoten\w*|dedup\w*|notifikasi pembayaran|duplikat callback)\b/i;
const TIMEZONE = /\b(?:time[ -]?zone|timezone|zona waktu|UTC|WIB|WITA|WIT)\b|Asia\/[A-Za-z_]+/i;
const ROLE_ACCESS = /\b(?:role(?:s)?|RBAC|RLS|row[ -]?level security|permission\w*|authorization|otorisasi|hak akses|peran|izin akses)\b/i;

function obligationsFor(brief: string): Obligations {
  return {
    concurrentBooking: BOOKING.test(brief) && CONCURRENCY.test(brief),
    paymentWebhook: PAYMENT.test(brief) && CALLBACK.test(brief),
    timezone: TIMEZONE.test(brief),
    roleAccess: ROLE_ACCESS.test(brief),
  };
}

function proseOnly(value: string): string {
  return value.replace(/```(?:mermaid)?[\s\S]*?```/gi, " ");
}

function wordTokens(value: string): string[] {
  return (value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).map((word) => {
    if (word.endsWith("ies") && word.length > 6) return `${word.slice(0, -3)}y`;
    return word.endsWith("s") && word.length > 5 ? word.slice(0, -1) : word;
  });
}

const NON_DOMAIN_WORDS = new Set(`about above across after again against along already also although always among another any app application approach architecture around available based before below between build built business cannot client code component consistent could create data database default design detail developer development different each end ensure every feature flow following frontend backend function general generate given have having implementation include including integration into itself latest level local logic main make manage management model module more most must need needs only other owner ownerid platform primary product project provider responsive result server service should solution specific stack state store system table than that their them then there these they this those through time type under until update user users using vendor website where which while with within without workflow would your able account access action active address allow all any are can does done even from has how for per via and but not use useable review report required rule search select customer customers booking bookings payment payments checkout role roles time zone timezone concurrent ensure support secure scalable reliable efficient modern fast real live seamless designed powered rendering processing authentication authorization security supplied interactive continuous deployment hosting route routes pages page sql api id irain pelanggan pengguna sistem fitur aplikasi buat dari untuk oleh dengan pada agar yang dalam dan atau sudah akan bisa adalah serta sebagai ketika saat guna proses secara tersebut sebuah ini itu mereka menjadi secara lain masih ada oleh satu`.split(/\s+/));

function domainOverlap(brief: string, architecture: string, featureTitles: readonly string[]): number | null {
  const briefWords = wordTokens(`${brief} ${featureTitles.join(" ")}`);
  if (briefWords.length < 40) return null;
  const relevant = new Set(briefWords.filter((word) => word.length >= 5 && !NON_DOMAIN_WORDS.has(word) && !/^\d+$/.test(word)));
  if (relevant.size < 8) return null;
  const architectureWords = new Set(wordTokens(proseOnly(architecture)));
  let matched = 0;
  for (const word of relevant) if (architectureWords.has(word)) matched++;
  return matched;
}

function repeatedProse(value: string): boolean {
  const sentences = proseOnly(value).split(/[.!?]+|\n{2,}/u)
    .map((sentence) => sentence.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim())
    .filter((sentence) => sentence.length >= 45);
  if (sentences.length < 7) return false;
  const counts = new Map<string, number>();
  for (const sentence of sentences) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
  const repeated = sentences.length - counts.size;
  return [...counts.values()].some((count) => count >= 3) || repeated / sentences.length >= 0.25;
}

const LONG_LOCK = /\b(?:keep|hold|maintain|retain|leave)\b[^.!?\n]{0,65}\b(?:row|database|transaction(?:al)?)\b[^.!?\n]{0,25}\block\b[^.!?\n]{0,60}\b(?:\d+\s*(?:min(?:ute)?s?|jam|hours?)|until\s+pay(?:ment)?|throughout\s+checkout)\b|\b(?:row|database|transaction(?:al)?)\b[^.!?\n]{0,25}\block\b[^.!?\n]{0,45}\b(?:for|throughout)\b[^.!?\n]{0,20}\b(?:\d+\s*(?:min(?:ute)?s?|jam|hours?)|pay(?:ment)?)/i;

/** Validate the architecture narrative, excluding diagram labels from evidence. */
export function validateArchitectureDraft(value: unknown, context: ArchitectureQualityContext): string[] {
  const issues: string[] = [];
  const architecture = typeof value === "string" ? value.trim() : "";
  if (architecture.length < 240) return ["Architecture: explain the product-specific components and end-to-end flow in at least 240 characters."];
  const prose = proseOnly(architecture);
  const obligations = obligationsFor(context.brief);

  if (repeatedProse(architecture) || (prose.match(/\b(?:application will be built using|provides a scalable and reliable|seamless user experience)\b/gi) ?? []).length >= 3) {
    issues.push("Architecture: remove repeated technology catalog and boilerplate; describe the product's actual data flow and decisions.");
  }
  const detailMatches = domainOverlap(context.brief, architecture, context.featureTitles ?? []);
  if (detailMatches !== null && detailMatches < 2) {
    issues.push("Architecture: name at least two concrete product concepts from the brief and explain how they interact.");
  }
  if (LONG_LOCK.test(prose)) {
    issues.push("Architecture: a database row lock must last only for the transaction; persist checkout holds with an expiry instead of keeping a lock open for minutes.");
  }
  if (obligations.concurrentBooking && !/(?:\b(?:transaction|atomic|serializab\w*|exclusion|constraint|unique|compare[- ]and[- ]swap|conditional update|row[- ]level lock|for update)\b)/i.test(prose)) {
    issues.push("Architecture: explain the atomic operation or database constraint that rejects concurrent bookings of one slot.");
  }
  if (obligations.paymentWebhook && !(/\b(?:webhook|callback)\b/i.test(prose) && /\b(?:signature|hmac|signed|verify|verif\w*)\b/i.test(prose) && /\b(?:idempoten\w*|dedup\w*|duplicat\w*|unique event)\b/i.test(prose))) {
    issues.push("Architecture: explain signed payment callback verification and idempotent processing of duplicate events.");
  }
  if (obligations.timezone && !(/\b(?:UTC|TIMESTAMPTZ|timestamp with time zone)\b/i.test(prose) && TIMEZONE.test(prose))) {
    issues.push("Architecture: state how timestamps are stored consistently and converted for the requested display timezone.");
  }
  if (obligations.roleAccess && !(/\b(?:server[- ]side|backend|API|RLS|row[- ]level security)\b/i.test(prose) && /\b(?:role|permission|owner|staff|admin|tenant|peran|hak akses)\b/i.test(prose) && /\b(?:enforc\w*|check\w*|guard\w*|polic\w*|scop\w*|den\w*|reject\w*|authoriz\w*|otorisasi)\b/i.test(prose))) {
    issues.push("Architecture: explain where server-side role and resource ownership checks run for a concrete operation.");
  }
  return issues;
}

/** Validate the data-level guarantees, not just claims made in the architecture. */
export function validateDatabaseSchemaDraft(value: unknown, context: ArchitectureQualityContext): string[] {
  const issues: string[] = [];
  const schema = typeof value === "string" ? value.trim() : "";
  if (schema.length < 240) return ["Database schema: describe the product tables, keys and invariants in at least 240 characters."];
  const obligations = obligationsFor(context.brief);

  if (obligations.concurrentBooking) {
    const sqlHoldTables = [...schema.matchAll(/\bCREATE\s+TABLE\s+(?:\w+\.)?(?:bookings?|reservations?|[a-z_]*holds?)\s*\(([\s\S]*?)\);/gi)].map((match) => match[1]);
    const markdownHoldTables = [...schema.matchAll(/^#{2,6}\s+(?:bookings?|reservations?|[a-z_]*holds?)\b([\s\S]*?)(?=^#{2,6}\s+|(?![\s\S]))/gim)].map((match) => match[1]);
    const holdRecords = [...sqlHoldTables, ...markdownHoldTables];
    const durableHold = (holdRecords.length ? holdRecords : [schema]).some((record) =>
      /\b(?:hold_expires_at|held_until|expires_at|expire_at|expiry_at|valid_until|reservation_expires_at|hold_until)\b/i.test(record)
      && /\b(?:held_by|hold_owner(?:_id)?|holder(?:_id)?|hold_user_id|reserved_by|reservation_user_id|user_id|customer_id|booking_id|owner_id)\b/i.test(record));
    if (!durableHold) {
      issues.push("Database schema: persist a checkout hold with its owner or booking ID and expiry timestamp; a transient row lock is not a timed hold.");
    }
    const atomicSlotTransition = /\b(?:atomic|conditional)\s+(?:update|insert|compare[- ]and[- ]swap)\b[^.!?\n]{0,160}\b(?:slot|time_?slots?|booking|reservation|status)\b/i.test(schema)
      || /\bupdate\s+(?:time_?slots?|slots?|bookings?|reservations?)\b[\s\S]{0,220}\bwhere\b[\s\S]{0,100}\bstatus\b[\s\S]{0,100}\b(?:returning|affected rows|row count)\b/i.test(schema)
      || /\b(?:select\s+.*\s+for\s+update|for\s+update)\b[^.!?\n]{0,160}\b(?:status|available|slot|booking)\b/i.test(schema);
    const activeUnique = /\b(?:exclude\s+using\s+gist|exclusion\s+constraint|partial\s+unique\s+index)\b/i.test(schema)
      || /\bunique\b[^.;\n]{0,130}\b(?:time_?slot|slot_?id|court_?id|resource_?id|start_?time)\b[^.;\n]{0,130}\b(?:status|active|held|confirmed)\b/i.test(schema)
      || /\b(?:time_?slot|slot_?id|court_?id|resource_?id|start_?time)\b[^.;\n]{0,130}\bunique\b[^.;\n]{0,130}\b(?:status|active|held|confirmed)\b/i.test(schema)
      || atomicSlotTransition;
    if (!activeUnique) {
      issues.push("Database schema: specify the unique or exclusion rule for active slots, or an atomic state transition that prevents two confirmed bookings for one slot.");
    }
  }
  if (obligations.paymentWebhook) {
    const uniqueEvent = /\bunique\b[^.;\n]{0,100}\b(?:provider_?event_?id|webhook_?event_?id|webhook_?id|callback_?id|event_?id|idempotency_?key)\b|\b(?:provider_?event_?id|webhook_?event_?id|webhook_?id|callback_?id|event_?id|idempotency_?key)\b[^.;\n]{0,100}\bunique\b/i.test(schema);
    const durableStateGuard = /\b(?:webhooks?|callbacks?|duplicate|idempoten\w*)\b/i.test(schema)
      && (/\bupdate\s+(?:payments?|bookings?|transactions?)\b[\s\S]{0,220}\bwhere\b[\s\S]{0,100}\bstatus\b[\s\S]{0,100}\b(?:returning|affected rows|row count)\b/i.test(schema)
        || /\b(?:atomic|conditional|compare[- ]and[- ]swap)\b[^.!?\n]{0,100}\b(?:payment|booking|transaction)\b[^.!?\n]{0,100}\b(?:status|state)\b/i.test(schema));
    if (!uniqueEvent && !durableStateGuard) {
      issues.push("Database schema: store a unique callback event key or use a durable atomic payment-state transition so duplicate callbacks cannot apply twice.");
    }
  }
  if (obligations.timezone && !(/\b(?:TIMESTAMPTZ|timestamp with time zone|UTC)\b/i.test(schema) && /\b(?:time[ -]?zone|timezone|zona waktu|WIB|WITA|WIT)\b|Asia\/[A-Za-z_]+/i.test(schema))) {
    issues.push("Database schema: specify timestamp storage and the requested schedule timezone or zone identifier.");
  }
  if (obligations.roleAccess && !(/\b(?:role|permission|peran|hak akses)\b/i.test(schema) && /\b(?:owner_id|user_id|customer_id|member_id|manager_id|tenant_id|account_id|staff_id|pemilik_id)\b/i.test(schema) && /\b(?:RLS|row[ -]?level security|polic\w*|server[- ]side authorization|server[- ]side guard|server[- ]side role check)\b/i.test(schema))) {
    issues.push("Database schema: tie role or permission records to the owning resource and specify a server-side policy or authorization boundary.");
  }
  const inventedPolicyDefaults = schema.split(/\r?\n/).filter((line) =>
    /\b(?:hold_duration|cancellation_(?:lead|refund)|reschedule_lead|refund_percentage)[\w]*\b/i.test(line)
    && /\bDEFAULT\s+\d+(?:\.\d+)?\b/i.test(line)
    && !/\b(?:assumed|assumption|proposed|to confirm|requires confirmation|asumsi|usulan|perlu dikonfirmasi)\b/i.test(line),
  );
  if (inventedPolicyDefaults.length) {
    issues.push("Database schema: business-policy durations or refund percentages not given by the user must be configurable and marked proposed, not fixed defaults.");
  }
  return issues;
}
