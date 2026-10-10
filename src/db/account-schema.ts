import { pgTable, uuid, jsonb, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users, plans, tokens } from "./schema";
import type { HandoffSettings, ProfileSettings, DisplaySettings, NotificationSettings } from "@/lib/account-preferences";
export const accountSettings = pgTable("account_settings", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  profile: jsonb().$type<ProfileSettings>().notNull(), display: jsonb().$type<DisplaySettings>().notNull(),
  handoff: jsonb().$type<HandoffSettings>().notNull(), notifications: jsonb().$type<NotificationSettings>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  sessionsRevokedBefore: timestamp("sessions_revoked_before", { withTimezone: true }),
  retainedSessionId: uuid("retained_session_id"),
});
export const projectState = pgTable("account_project_state", {
  planId: uuid("plan_id").primaryKey().references(() => plans.id, { onDelete: "cascade" }),
  favorite: boolean().notNull().default(false), archived: boolean().notNull().default(false),
  lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
  generationSettings: jsonb("generation_settings").$type<HandoffSettings>(), generationInput: jsonb("generation_input").$type<{ techPrefs: { mode: "auto" | "custom"; frontend?: string; backend?: string; database?: string; deployment?: string }; answers: { question: string; answer: string }[] }>(),
});
export const accountLibrary = pgTable("account_library", {
  id: uuid().primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text().notNull(), title: text().notNull(), content: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const accountActivity = pgTable("account_activity", {
  id: uuid().primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }), kind: text().notNull(), title: text().notNull(),
  notification: boolean().notNull().default(false), readAt: timestamp("read_at", { withTimezone: true }), dedupeKey: text("dedupe_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const tokenPolicy = pgTable("account_token_policy", {
  tokenHash: text("token_hash").primaryKey().references(() => tokens.tokenHash, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }), lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  access: text().notNull().default("write"), projectIds: jsonb("project_ids").$type<string[]>().notNull().default([]),
});
export const accountSessions = pgTable("account_sessions", {
  id: uuid().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), device: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(), revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
