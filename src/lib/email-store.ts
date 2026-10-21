import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { EmailPayload } from "./transactional-email";

export type OutboxEmail = { id: string; user_id: string; dedupe_key: string; kind: EmailPayload["kind"]; payload: Exclude<EmailPayload, { kind: "social_otp" }>; attempts: number; first_attempt_at: Date | null; ambiguous: boolean };
type Executor = Pick<ReturnType<typeof getDb>, "execute">;
export function emailEnabled() { return process.env.EMAIL_NOTIFICATIONS_ENABLED === "1"; }

export async function enqueueEmail(userId: string, key: string, payload: Exclude<EmailPayload, { kind: "social_otp" }>, db: Executor = getDb()) {
  if (!emailEnabled()) return;
  await db.execute(sql`INSERT INTO email_outbox (user_id,dedupe_key,kind,payload) VALUES (${userId},${key},${payload.kind},${JSON.stringify(payload)}::jsonb) ON CONFLICT (dedupe_key) DO NOTHING`);
}

export async function claimEmail(id?: string, userId?: string): Promise<OutboxEmail | null> {
  const result = await getDb().execute(sql`
    WITH candidate AS (
      SELECT id FROM email_outbox
      WHERE status = 'pending' AND available_at <= now() AND attempts < 5 ${id ? sql`AND id = ${id}::uuid` : sql``} ${userId ? sql`AND user_id = ${userId}::uuid` : sql``}
      ORDER BY CASE WHEN kind = 'pro_active' THEN 0 ELSE 1 END, created_at
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    UPDATE email_outbox o SET status='processing', leased_at=now(), first_attempt_at=coalesce(o.first_attempt_at,now()), attempts=o.attempts+1
    FROM candidate c WHERE o.id=c.id RETURNING o.*`);
  return (result.rows[0] as unknown as OutboxEmail) ?? null;
}

export async function finishEmail(id: string, status: "sent" | "cancelled" | "failed" | "uncertain", providerId?: string) {
  await getDb().execute(sql`UPDATE email_outbox SET status=${status}, provider_id=${providerId ?? null}, sent_at=CASE WHEN ${status}='sent' THEN now() ELSE NULL END, leased_at=NULL WHERE id=${id}::uuid AND status='processing'`);
}

export async function retryEmail(item: OutboxEmail, ambiguous: boolean) {
  await getDb().execute(sql`UPDATE email_outbox SET status='pending', ambiguous=ambiguous OR ${ambiguous}, available_at=now()+interval '2 minutes', leased_at=NULL WHERE id=${item.id}::uuid AND status='processing'`);
}

export async function recoverEmailLeases() {
  // A stopped worker may have submitted the email before its acknowledgement was saved.
  await getDb().execute(sql`UPDATE email_outbox SET status=CASE WHEN first_attempt_at < now()-interval '25 minutes' THEN 'uncertain' ELSE 'pending' END, ambiguous=true, leased_at=NULL WHERE status='processing' AND leased_at < now()-interval '2 minutes'`);
  await getDb().execute(sql`UPDATE email_outbox SET status='uncertain' WHERE status='pending' AND ambiguous=true AND first_attempt_at < now()-interval '25 minutes'`);
}

export async function reserveEmailBudget(reminder: boolean): Promise<boolean> {
  const totalLimit = Math.max(1, Math.min(250, Number(process.env.EMAIL_APP_DAILY_LIMIT) || 200));
  const reminderLimit = Math.max(0, Math.min(50, totalLimit - 1));
  if (reminder && reminderLimit === 0) return false;
  const result = await getDb().execute(sql`
    INSERT INTO email_daily_budget (day,total,reminders) VALUES ((now() AT TIME ZONE 'UTC')::date,1,${reminder ? 1 : 0})
    ON CONFLICT (day) DO UPDATE SET total=email_daily_budget.total+1, reminders=email_daily_budget.reminders+${reminder ? 1 : 0}
    WHERE email_daily_budget.total < ${totalLimit} AND (NOT ${reminder} OR email_daily_budget.reminders < ${reminderLimit}) RETURNING day`);
  return result.rows.length > 0;
}

export async function deferEmailForBudget(id: string) {
  await getDb().execute(sql`UPDATE email_outbox SET status='pending', attempts=greatest(0,attempts-1), available_at=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'+interval '1 day', leased_at=NULL, first_attempt_at=CASE WHEN ambiguous THEN first_attempt_at ELSE NULL END WHERE id=${id}::uuid AND status='processing'`);
}
