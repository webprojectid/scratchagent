import { pgEnum, pgTable, text, timestamp, uuid, varchar, integer, jsonb, boolean, unique } from "drizzle-orm/pg-core";

export const planStatus = pgEnum("plan_status", ["generating", "ready", "implementing", "done"]);
export const featureStatus = pgEnum("feature_status", ["direncanakan", "berjalan", "selesai"]);
export const taskStatus = pgEnum("task_status", ["pending", "in_progress", "done", "failed"]);
export const taskLayer = pgEnum("task_layer", ["frontend", "backend", "qa"]);

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: varchar({ length: 320 }).notNull().unique(),
  name: text(),
  avatar: text(),
  tier: text().notNull().default("free"),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
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
  priority: text(),
  status: featureStatus().notNull().default("direncanakan"),
  order: integer().notNull(),
});

export const subFeatures = pgTable("sub_features", {
  id: uuid().primaryKey().defaultRandom(),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  title: text().notNull(),
  tujuan: text(),
  selesaiBila: jsonb("selesai_bila").$type<string[]>().notNull().default([]),
  order: integer().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid().primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  featureId: uuid("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  subFeatureId: uuid("sub_feature_id").references(() => subFeatures.id, { onDelete: "cascade" }),
  ref: varchar({ length: 20 }).notNull(),
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
}, (table) => [
  unique("tasks_plan_ref_unique").on(table.planId, table.ref),
]);

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
  tier: text().notNull().default("free"),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  /** Model LLM yang melayani generate ini (hasil failover, dipisah koma). */
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Log kejadian keamanan: jejak deteksi serangan (401/403/429, generate,
 * hapus struktur, aksi admin). Dilihat lewat /admin/security.
 */
export const securityEvents = pgTable("security_events", {
  id: uuid().primaryKey().defaultRandom(),
  type: text().notNull(),
  detail: jsonb().notNull().default({}),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  ip: text(),
  /** Ditandai admin sebagai false positive → tidak dihitung sebagai serangan. */
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * IP yang diblokir admin dari Pusat Keamanan. Setiap request dari IP ini
 * ditolak 403 di endpoint sensitif. expiresAt null = blokir permanen.
 */
export const blockedIps = pgTable("blocked_ips", {
  id: uuid().primaryKey().defaultRandom(),
  ip: text("ip").notNull().unique(),
  reason: text().notNull().default(""),
  blockedBy: text("blocked_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

/**
 * Riwayat langganan Pro. Satu baris per periode:
 * startedAt = pertama kali aktif di periode itu, endedAt = berakhir (null = masih aktif).
 * expiresAt = masa berlaku dari durasi yang dipilih admin (7/14/28/31/93 hari).
 * Pro aktif bila endedAt null DAN expiresAt null atau masih di masa depan.
 * Dipakai admin untuk catatan subs dan audit pemakaian.
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  grantedBy: text("granted_by"),
  endedBy: text("ended_by"),
});

// Konfigurasi LLM runtime (single row, id=1). Dibaca generate.ts sebelum fallback ke env,
// supaya token/model bisa diganti lewat Settings tanpa redeploy.
// providers: daftar provider failover berurutan (base URL + API key + model masing-masing).
// Kosong = mundur ke kolom legacy baseUrl/apiKey/model sebagai satu-satunya provider.
export const llmSettings = pgTable("llm_settings", {
  id: integer("id").primaryKey(),
  baseUrl: text("base_url"),
  apiKey: text("api_key"),
  model: text("model"),
  providers: jsonb("providers").$type<Array<{ baseUrl: string; apiKey: string; models: string[] }>>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});