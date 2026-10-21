import { createHash } from "node:crypto";
import { STRUCTURE_LIMITS, IDEAS_PER_PLAN_LIMIT } from "./plan-limits";
import { emailCodeBox, emailLayout, escapeEmail } from "./email-layout";
export { escapeEmail } from "./email-layout";

export type EmailLanguage = "en" | "id";
export type EmailContent = { subject: string; html: string; text: string };
export type EmailPayload =
  | { kind: "social_otp"; code: string }
  | { kind: "pro_active"; subscriptionId: string; startsAt: string; expiresAt: string; days: number }
  | { kind: "pro_expiry"; subscriptionId: string; expiresAt: string; days: number }
  | { kind: "unfinished_plans"; plans: { id: string; title: string; done: number; total: number }[] };

export function appEmailUrl(path = "/"): string {
  const origin = new URL(process.env.EMAIL_SITE_URL || "https://www.scratchagent.web.id");
  if (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.hostname === "localhost")) throw new Error("EMAIL_SITE_URL must use HTTPS");
  return new URL(path, origin.origin).href;
}

export function emailTemplate(payload: EmailPayload, lang: EmailLanguage = "en", timezone = "Asia/Jakarta"): EmailContent {
  const en = lang === "en";
  const date = (value: string) => new Intl.DateTimeFormat(en ? "en-GB" : "id-ID", { dateStyle: "long", timeStyle: "short", timeZone: timezone }).format(new Date(value)) + ` (${timezone})`;
  let subject: string, paragraphs: string[], details: string[] = [], action = en ? "Open Scratch Agent" : "Buka Scratch Agent", path = "/profile";
  if (payload.kind === "social_otp") {
    if (!/^\d{6}$/.test(payload.code)) throw new Error("OTP must contain six digits");
    subject = en ? "Your Scratch Agent verification code" : "Kode verifikasi Scratch Agent Anda";
    paragraphs = [en ? "Enter this code to finish signing in. It expires in 10 minutes and can only be used once." : "Masukkan kode ini untuk menyelesaikan login. Kode berlaku 10 menit dan hanya bisa dipakai sekali.", payload.code, en ? "Never share this code. If you did not request it, you can ignore this email." : "Jangan bagikan kode ini. Abaikan email ini jika Anda tidak meminta kode."];
  } else if (payload.kind === "pro_active") {
    subject = en ? "Payment successful — your Pro access is active" : "Pembayaran berhasil — akses Pro Anda aktif";
    paragraphs = [en ? "Your Pro access has been activated. You can start creating plans now." : "Akses Pro Anda sudah diaktifkan. Anda bisa mulai membuat plan sekarang."];
    const limits = STRUCTURE_LIMITS.pro;
    details = [en ? `Package: Scratch Pro · ${payload.days} days` : `Paket: Scratch Pro · ${payload.days} hari`, `${en ? "Starts" : "Mulai"}: ${date(payload.startsAt)}`, `${en ? "Ends" : "Berakhir"}: ${date(payload.expiresAt)}`, en ? `${limits.features.join("–")} phases per plan` : `${limits.features.join("–")} fase per plan`, en ? `${limits.subFeatures.join("–")} subfeatures per phase` : `${limits.subFeatures.join("–")} subfitur per fase`, en ? `${limits.tasks.join("–")} tasks per phase` : `${limits.tasks.join("–")} task per fase`, en ? `Up to ${IDEAS_PER_PLAN_LIMIT} additional ideas per project` : `Hingga ${IDEAS_PER_PLAN_LIMIT} ide tambahan per proyek`];
    action = en ? "Start creating a plan" : "Mulai buat plan"; path = "/new";
  } else if (payload.kind === "pro_expiry") {
    subject = en ? `Your Pro access ends in ${payload.days} ${payload.days === 1 ? "day" : "days"}` : `Akses Pro Anda berakhir ${payload.days} hari lagi`;
    paragraphs = [en ? "Review your access before it expires. This email does not renew your package or charge you." : "Periksa akses Anda sebelum berakhir. Email ini tidak memperpanjang paket atau menagih pembayaran."];
    details = [`${en ? "Access ends" : "Akses berakhir"}: ${date(payload.expiresAt)}`];
    action = en ? "View my Pro access" : "Lihat akses Pro saya";
  } else {
    subject = en ? "Your plans have unfinished tasks" : "Masih ada task pada plan Anda";
    paragraphs = [en ? "Pick up where you left off. These plans still have tasks to complete." : "Lanjutkan pekerjaan terakhir Anda. Plan berikut masih memiliki task yang belum selesai."];
    details = payload.plans.map(plan => `${plan.title}: ${plan.done}/${plan.total} ${en ? "tasks complete" : "task selesai"}`);
    path = `/project/${encodeURIComponent(payload.plans[0]?.id ?? "")}`;
    action = en ? "Continue my plan" : "Lanjutkan plan saya";
  }
  const footer = payload.kind === "unfinished_plans" || payload.kind === "pro_expiry"
    ? en ? "Manage email reminders in Settings → Notifications." : "Atur pengingat email di Pengaturan → Notifikasi."
    : en ? "This is an automated email from Scratch Agent. Please do not reply." : "Email otomatis dari Scratch Agent. Mohon tidak membalas email ini.";
  const url = appEmailUrl(path);
  const body = paragraphs.map((line, index) => payload.kind === "social_otp" && index === 1
    ? emailCodeBox(line)
    : `<p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#b4c3b8">${escapeEmail(line)}</p>`).join("");
  const list = details.length ? `<ul style="margin:24px 0;padding-left:20px;font-size:14px;line-height:1.9;color:#b4c3b8">${details.map(line => `<li style="padding:3px 0">${escapeEmail(line)}</li>`).join("")}</ul>` : "";
  const button = payload.kind === "social_otp" ? "" : `<p style="margin:30px 0"><a href="${escapeEmail(url)}" style="background:#74FA6A;color:#10200e;text-decoration:none;padding:14px 22px;border-radius:8px;display:inline-block;font-weight:600">${escapeEmail(action)}</a></p>`;
  const reminders = payload.kind === "unfinished_plans" || payload.kind === "pro_expiry";
  const footerHtml = escapeEmail(footer) + (reminders ? `<br><a href="${escapeEmail(appEmailUrl("/settings?tab=notifications"))}" style="color:#c5d4c8;text-decoration:underline">${en ? "Email preferences" : "Pengaturan notifikasi"}</a>` : "");
  const title = payload.kind === "social_otp" ? (en ? "Verify your sign-in" : "Verifikasi login Anda") : subject;
  return {
    subject,
    text: ["Scratch Agent", subject, ...paragraphs, ...details, ...(payload.kind === "social_otp" ? [] : [action, url]), footer, appEmailUrl("/settings?tab=notifications")].join("\n\n"),
    html: emailLayout({ language: lang, titleHtml: escapeEmail(title), bodyHtml: body + list + button, footerHtml, bannerUrl: appEmailUrl("/brand/email-header-v1.jpg"), homeUrl: appEmailUrl("/"), align: payload.kind === "social_otp" ? "center" : "left" }),
  };
}

export class EmailSendError extends Error {
  constructor(public readonly retryable: boolean, public readonly ambiguous = false) { super("Email delivery was not confirmed"); }
}

export function emailIdempotencyKey(key: string) {
  const hex = createHash("sha256").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function sendTransactionalEmail(to: string, content: EmailContent, key: string): Promise<string> {
  if (!process.env.BREVO_API_KEY) throw new Error("Email service is not configured");
  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", signal: AbortSignal.timeout(12_000),
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sender: { name: "Scratch Agent", email: "no-reply@scratchagent.web.id" }, to: [{ email: to }], subject: content.subject, htmlContent: content.html, textContent: content.text, headers: { idempotencyKey: emailIdempotencyKey(key) }, tags: ["scratchagent-transactional"] }),
    });
  } catch { throw new EmailSendError(true, true); }
  const result = await response.json().catch(() => ({})) as { messageId?: string; code?: string };
  if (result.code === "duplicate_parameter") return "deduplicated";
  if (!response.ok) throw new EmailSendError(response.status === 429 || response.status >= 500, response.status >= 500);
  if (!result.messageId) throw new EmailSendError(true, true);
  return result.messageId;
}
