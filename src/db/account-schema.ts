import { sql } from "drizzle-orm";
import { pgTable, uuid, jsonb, text, timestamp, boolean, check, index, foreignKey } from "drizzle-orm/pg-core";
import { users, plans, tokens } from "./schema";
import type { HandoffSettings, ProfileSettings, DisplaySettings, NotificationSettings } from "@/lib/account-preferences";
export const accountSettings = pgTable("account_settings", {
  userId: uuid("user_id").primaryKey(),
  profile: jsonb().$type<ProfileSettings>().notNull().default(sql`'{}'::jsonb`), display: jsonb().$type<DisplaySettings>().notNull().default(sql`'{}'::jsonb`),
  handoff: jsonb().$type<HandoffSettings>().notNull().default(sql`'{}'::jsonb`), notifications: jsonb().$type<NotificationSettings>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  sessionsRevokedBefore: timestamp("sessions_revoked_before", { withTimezone: true }),
  retainedSessionId: uuid("retained_session_id"),
}, table => [foreignKey({ name: "account_settings_user_id_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade")]).enableRLS();
export const projectState = pgTable("account_project_state", {
  planId: uuid("plan_id").primaryKey(),
  favorite: boolean().notNull().default(false), archived: boolean().notNull().default(false),
  lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
  generationSettings: jsonb("generation_settings").$type<HandoffSettings>(), generationInput: jsonb("generation_input").$type<{ techPrefs: { mode: "auto" | "custom"; frontend?: string; backend?: string; database?: string; deployment?: string }; answers: { question: string; answer: string }[] }>(),
}, table => [foreignKey({ name: "account_project_state_plan_id_fkey", columns: [table.planId], foreignColumns: [plans.id] }).onDelete("cascade")]).enableRLS();
export const accountLibrary = pgTable("account_library", {
  id: uuid().primaryKey().defaultRandom(), userId: uuid("user_id").notNull(),
  kind: text().notNull(), title: text().notNull(), content: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  foreignKey({ name: "account_library_user_id_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  check("account_library_kind_check", sql`${table.kind} IN ('brief', 'template', 'reference')`),
  index("account_library_owner").on(table.userId, table.updatedAt.desc()),
]).enableRLS();
export const accountActivity = pgTable("account_activity", {
  id: uuid().primaryKey().defaultRandom(), userId: uuid("user_id").notNull(),
  planId: uuid("plan_id"), kind: text().notNull(), title: text().notNull(),
  notification: boolean().notNull().default(false), readAt: timestamp("read_at", { withTimezone: true }), dedupeKey: text("dedupe_key").unique("account_activity_dedupe_key_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  foreignKey({ name: "account_activity_user_id_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  foreignKey({ name: "account_activity_plan_id_fkey", columns: [table.planId], foreignColumns: [plans.id] }).onDelete("set null"),
  index("account_activity_owner").on(table.userId, table.createdAt.desc()),
]).enableRLS();
export const tokenPolicy = pgTable("account_token_policy", {
  tokenHash: text("token_hash").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  access: text().notNull().default("write"), projectIds: jsonb("project_ids").$type<string[]>().notNull().default([]),
}, table => [
  foreignKey({ name: "account_token_policy_token_hash_fkey", columns: [table.tokenHash], foreignColumns: [tokens.tokenHash] }).onDelete("cascade"),
  check("account_token_policy_access_check", sql`${table.access} IN ('read', 'write')`),
]).enableRLS();
export const accountSessions = pgTable("account_sessions", {
  id: uuid().primaryKey(), userId: uuid("user_id").notNull(), device: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(), revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, table => [
  foreignKey({ name: "account_sessions_user_id_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
  index("account_sessions_owner").on(table.userId, table.lastSeenAt.desc()),
]).enableRLS();
