import { pgEnum, pgTable, text, timestamp, uuid, varchar, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const planStatus = pgEnum("plan_status", ["generating", "ready", "implementing", "done"]);
export const featureStatus = pgEnum("feature_status", ["direncanakan", "berjalan", "selesai"]);
export const taskStatus = pgEnum("task_status", ["pending", "in_progress", "done", "failed"]);
export const taskLayer = pgEnum("task_layer", ["frontend", "backend", "qa"]);

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: varchar({ length: 320 }).notNull().unique(),
  name: text(),
  avatar: text(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text().notNull(),
  brief: text().notNull(),
  techPrefs: jsonb("tech_prefs").notNull(),
  assumptions: jsonb().$type<string[]>().notNull().default([]),
  status: planStatus().notNull().default("generating"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const features = pgTable("features", {
  id: uuid().primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  slug: text().notNull(),
  title: text().notNull(),
  icon: text().notNull(),
  description: text().notNull(),
  tujuan: text().notNull(),
  selesaiBila: jsonb("selesai_bila").$type<string[]>().notNull(),
  status: featureStatus().notNull().default("direncanakan"),
  order: integer().notNull(),
});

export const subFeatures = pgTable("sub_features", {
  id: uuid().primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  title: text().notNull(),
  order: integer().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid().primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  subFeatureId: uuid("sub_feature_id").references(() => subFeatures.id, { onDelete: "cascade" }),
  ref: varchar({ length: 20 }).notNull().unique(),
  title: text().notNull(),
  layer: taskLayer().notNull(),
  phase: integer().notNull(),
  page: text(),
  deps: jsonb().$type<string[]>().notNull().default([]),
  status: taskStatus().notNull().default("pending"),
  retryCount: integer("retry_count").notNull().default(0),
  lastFailReason: text("last_fail_reason"),
  failReason: text("fail_reason"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  order: integer().notNull(),
});

export const tokens = pgTable("tokens", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  label: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const taskEvents = pgTable("task_events", {
  id: uuid().primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  type: text().notNull(),
  meta: jsonb(),
  cliVersion: text("cli_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usageEvents = pgTable("usage_events", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "cascade" }),
  stage: text().notNull(),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});