import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { getAccountSettings } from "./account-store";
import { emailTemplate, sendTransactionalEmail, EmailSendError, type EmailPayload } from "./transactional-email";
import { claimEmail, deferEmailForBudget, emailEnabled, enqueueEmail, finishEmail, recoverEmailLeases, reserveEmailBudget, retryEmail, type OutboxEmail } from "./email-store";

const DAY = 86400_000;
export function expiryReminderDay(expiresAt: Date | string, now = new Date(), timezone = "Asia/Jakarta"): 5 | 2 | 1 | null {
  const expires = new Date(expiresAt);
  if (expires.getTime() <= now.getTime()) return null;
  const calendarDay = (value: Date) => {
    const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(value);
    const part = (name: string) => Number(parts.find(item => item.type === name)!.value);
    return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY;
  };
  const days = calendarDay(expires) - calendarDay(now);
  return days === 5 || days === 2 || days === 1 ? days : null;
}
export function unfinishedReminderDue(lastActivity: Date | string, lastReminder: Date | string | null, now = new Date()): boolean {
  return now.getTime() - new Date(lastActivity).getTime() >= 3 * DAY && (!lastReminder || now.getTime() - new Date(lastReminder).getTime() >= 7 * DAY);
}

type UnfinishedPlan = { id: string; title: string; done: number; total: number; last_activity: Date };
async function unfinishedPlans(userId: string): Promise<UnfinishedPlan[]> {
  const result = await getDb().execute(sql`
    WITH summary AS (SELECT p.id,p.title,count(t.id)::int AS total,count(t.id) FILTER (WHERE t.status='done')::int AS done,
      greatest(p.created_at,coalesce(s.last_opened_at,p.created_at),coalesce(max(t.started_at),p.created_at),coalesce(max(t.completed_at),p.created_at),coalesce((SELECT max(e.created_at) FROM task_events e WHERE e.plan_id=p.id),p.created_at)) AS last_activity
    FROM plans p JOIN tasks t ON t.plan_id=p.id LEFT JOIN account_project_state s ON s.plan_id=p.id
    WHERE p.user_id=${userId}::uuid AND p.status IN ('ready','implementing') AND coalesce(s.archived,false)=false
    GROUP BY p.id,s.last_opened_at
    HAVING count(t.id) FILTER (WHERE t.status!='done') > 0)
    SELECT * FROM summary WHERE last_activity <= now()-interval '3 days' ORDER BY last_activity LIMIT 20`);
  return result.rows as unknown as UnfinishedPlan[];
}

export async function scheduleEmailReminders(now = new Date()) {
  if (!emailEnabled() || !process.env.DATABASE_URL) return;
  const subscriptions = await getDb().execute(sql`SELECT s.id,s.user_id,s.expires_at FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.ended_at IS NULL AND s.expires_at > ${now} AND s.expires_at <= ${new Date(now.getTime() + 7 * DAY)} AND u.banned_at IS NULL`);
  for (const sub of subscriptions.rows as unknown as { id: string; user_id: string; expires_at: Date }[]) {
    const settings = await getAccountSettings(sub.user_id);
    const day = expiryReminderDay(sub.expires_at, now, settings.display.timezone);
    if (!day || !settings.notifications.emailPlanExpiry) continue;
    await enqueueEmail(sub.user_id, `expiry:${sub.id}:${new Date(sub.expires_at).toISOString()}:${day}`, { kind: "pro_expiry", subscriptionId: sub.id, expiresAt: new Date(sub.expires_at).toISOString(), days: day });
  }
  const candidates = await getDb().execute(sql`SELECT DISTINCT p.user_id FROM plans p JOIN users u ON u.id=p.user_id WHERE p.status IN ('ready','implementing') AND p.created_at < ${new Date(now.getTime() - 3 * DAY)} AND u.banned_at IS NULL AND NOT EXISTS (SELECT 1 FROM email_outbox o WHERE o.user_id=p.user_id AND o.kind='unfinished_plans' AND (o.status IN ('pending','processing') OR (o.status='uncertain' AND o.first_attempt_at > ${new Date(now.getTime() - 7 * DAY)}) OR (o.status='sent' AND o.sent_at > ${new Date(now.getTime() - 7 * DAY)}))) ORDER BY p.user_id LIMIT 200`);
  for (const row of candidates.rows as { user_id: string }[]) {
    if (!(await getAccountSettings(row.user_id)).notifications.emailUnfinishedPlans) continue;
    const items = (await unfinishedPlans(row.user_id)).filter(item => unfinishedReminderDue(item.last_activity, null, now));
    if (!items.length) continue;
    await enqueueEmail(row.user_id, `unfinished:${row.user_id}:${Math.floor(now.getTime() / (7 * DAY))}`, { kind: "unfinished_plans", plans: items.slice(0, 10).map(({ id, title, done, total }) => ({ id, title, done, total })) });
  }
}

async function currentPayload(item: OutboxEmail): Promise<Exclude<EmailPayload, { kind: "social_otp" }> | null> {
  const payload = item.payload;
  const settings = await getAccountSettings(item.user_id);
  if (payload.kind === "pro_active" || payload.kind === "pro_expiry") {
    const result = await getDb().execute(sql`SELECT expires_at FROM subscriptions WHERE id=${payload.subscriptionId}::uuid AND user_id=${item.user_id}::uuid AND ended_at IS NULL AND expires_at>now()`);
    const sub = result.rows[0] as { expires_at: Date } | undefined;
    if (!sub || new Date(sub.expires_at).toISOString() !== payload.expiresAt) return null;
    if (payload.kind === "pro_expiry" && (!settings.notifications.emailPlanExpiry || expiryReminderDay(sub.expires_at, new Date(), settings.display.timezone) !== payload.days)) return null;
  } else {
    if (!settings.notifications.emailUnfinishedPlans) return null;
    const items = (await unfinishedPlans(item.user_id)).filter(row => unfinishedReminderDue(row.last_activity, null));
    if (!items.length) return null;
    return { ...payload, plans: items.slice(0, 10).map(({ id, title, done, total }) => ({ id, title, done, total })) };
  }
  return payload;
}

export async function deliverEmailQueue(maximum = 20, userId?: string) {
  if (!emailEnabled() || !process.env.DATABASE_URL) return { sent: 0, cancelled: 0, deferred: 0, failed: 0, uncertain: 0 };
  if (!process.env.BREVO_API_KEY) throw new Error("Email service is not configured");
  const counts = { sent: 0, cancelled: 0, deferred: 0, failed: 0, uncertain: 0 };
  await recoverEmailLeases();
  const deadline = Date.now() + 45_000;
  for (let index = 0; index < maximum && Date.now() < deadline; index++) {
    const item = await claimEmail(undefined, userId);
    if (!item) break;
    try {
      const [owner] = (await getDb().execute(sql`SELECT email,banned_at FROM users WHERE id=${item.user_id}::uuid`)).rows as { email: string; banned_at: Date | null }[];
      const payload = owner && !owner.banned_at ? await currentPayload(item) : null;
      if (!owner || !payload) { await finishEmail(item.id, "cancelled"); counts.cancelled++; continue; }
      if (!await reserveEmailBudget(payload.kind !== "pro_active")) { await deferEmailForBudget(item.id); counts.deferred++; break; }
      const settings = await getAccountSettings(item.user_id);
      const providerId = await sendTransactionalEmail(owner.email, emailTemplate(payload, settings.display.language, settings.display.timezone), item.id);
      await finishEmail(item.id, "sent", providerId); counts.sent++;
    } catch (cause) {
      const uncertain = item.ambiguous || cause instanceof EmailSendError && cause.ambiguous;
      if (cause instanceof EmailSendError && cause.retryable && item.attempts < 5 && (!uncertain || !item.first_attempt_at || Date.now() - new Date(item.first_attempt_at).getTime() < 25 * 60_000)) {
        await retryEmail(item, uncertain); counts.deferred++;
      } else {
        await finishEmail(item.id, uncertain ? "uncertain" : "failed");
        if (uncertain) counts.uncertain++; else counts.failed++;
      }
    }
  }
  return counts;
}
