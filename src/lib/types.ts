export type TaskLayer = "frontend" | "backend" | "qa";
export type TaskStatus = "pending" | "in_progress" | "done" | "failed";
export type FeaturePriority = "high" | "medium" | "low";

export interface Task {
  ref: string;
  title: string;
  layer: TaskLayer;
  phase: number;
  page: string | null;
  deps: string[];
  status: TaskStatus;
  retryCount?: number;
  lastFailReason?: string | null;
  failReason?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface SubFeature {
  id?: string;
  title: string;
  tujuan?: string;
  selesaiBila?: string[];
  tasks: Task[];
}

export interface Feature {
  id?: string;
  slug: string;
  title: string;
  icon: string;
  description: string;
  tujuan: string;
  selesaiBila: string[];
  priority?: FeaturePriority;
  status: "direncanakan" | "berjalan" | "selesai";
  subFeatures: SubFeature[];
  /** Urutan fase di plan (0-based). Dipakai saat insert fase baru dari ide user. */
  order?: number;
}

export interface TechStackItem {
  name: string;
  desc: string;
}

export interface UserFlow {
  title: string;
  steps: string[];
}

export interface Requirements {
  fungsional: string[];
  nonFungsional: string[];
}

export interface Plan {
  id: string;
  title: string;
  brief: string;
  stack: string[];
  techStack?: TechStackItem[];
  asumsi: string[];
  requirements?: Requirements;
  userFlow?: UserFlow[];
  architecture?: string;
  databaseSchema?: string;
  status: "generating" | "ready" | "implementing" | "done";
  features: Feature[];
  createdAt?: string;
  userId?: string;
  /** Bagian yang memakai template fallback karena LLM gagal; ditampilkan sebagai banner di UI. */
  warnings?: string[];
  /** Tier akun saat plan digenerate; menentukan batas struktur PRD yang dipaksakan. */
  tier?: "free" | "pro";
  /** Ide user dari kolom chat (Pro, maks 2/project). Sudah dikonversi AI menjadi fase > sub-fitur > task; wajib dibaca AI sebagai referensi tambahan. */
  ideas?: PlanIdea[];
}

/** Satu ide dari kolom chat "Ide Kamu" (khusus Pro). */
export interface PlanIdea {
  /** Teks ide mentah dari user. */
  text: string;
  createdAt: string;
  /** Judul fase yang dibuat AI dari ide ini (fase > sub-fitur > task). */
  featureTitle?: string;
  phase?: number;
}

export interface TechPrefs {
  mode: "auto" | "custom";
  frontend?: string;
  backend?: string;
  database?: string;
  deployment?: string;
}
