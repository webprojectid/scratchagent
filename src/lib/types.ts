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
  title: string;
  tujuan?: string;
  selesaiBila?: string[];
  tasks: Task[];
}

export interface Feature {
  slug: string;
  title: string;
  icon: string;
  description: string;
  tujuan: string;
  selesaiBila: string[];
  priority?: FeaturePriority;
  status: "direncanakan" | "berjalan" | "selesai";
  subFeatures: SubFeature[];
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
}

export interface TechPrefs {
  mode: "auto" | "custom";
  frontend?: string;
  backend?: string;
  database?: string;
  deployment?: string;
}
