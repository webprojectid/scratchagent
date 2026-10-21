import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, date, index, primaryKey, check } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const emailLoginChallenges = pgTable("email_login_challenges", {
  sessionId: uuid("session_id").primaryKey(), authUserId: uuid("auth_user_id").notNull(),
  codeHash: text("code_hash").notNull(), nonce: uuid().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  attempts: integer().notNull().default(0), verifiedAt: timestamp("verified_at", { withTimezone: true }),
}, table => [index("email_login_challenges_owner").on(table.authUserId, table.sentAt)]).enableRLS();

export const emailOutbox = pgTable("email_outbox", {
  id: uuid().primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dedupeKey: text("dedupe_key").notNull().unique(), kind: text().notNull(), payload: jsonb().notNull(),
  status: text().notNull().default("pending"), attempts: integer().notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(), leasedAt: timestamp("leased_at", { withTimezone: true }), firstAttemptAt: timestamp("first_attempt_at", { withTimezone: true }),
  ambiguous: boolean().notNull().default(false), sentAt: timestamp("sent_at", { withTimezone: true }), providerId: text("provider_id"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("email_outbox_pending").on(table.status, table.availableAt), check("email_outbox_kind_check", sql`${table.kind} IN ('pro_active','pro_expiry','unfinished_plans')`), check("email_outbox_status_check", sql`${table.status} IN ('pending','processing','sent','cancelled','failed','uncertain')`)]).enableRLS();

export const emailDailyBudget = pgTable("email_daily_budget", { day: date().primaryKey(), total: integer().notNull().default(0), reminders: integer().notNull().default(0) }).enableRLS();
export const emailOtpSendLimits = pgTable("email_otp_send_limits", { authUserId: uuid("auth_user_id").notNull(), hour: timestamp({ withTimezone: true }).notNull(), count: integer().notNull().default(0) }, table => [primaryKey({ columns: [table.authUserId, table.hour] })]).enableRLS();
