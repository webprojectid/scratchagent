import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

export interface GenerationUsage { tokensIn: number; tokensOut: number; models: string[]; requests?: import("./generation-metrics").GenerationRequestMetric[] }
export interface GenerationCheckpoint {
  version: 1;
  entries: Record<string, { value: unknown; usage: GenerationUsage; stage?: string }>;
  failedUsage?: Record<string, GenerationUsage>;
  activeStage?: string;
}

export class GenerationPaused extends Error {
  constructor() { super("Generation checkpoint saved; another slice is required."); }
}

interface Execution {
  checkpoint: GenerationCheckpoint;
  persist: (checkpoint: GenerationCheckpoint) => Promise<void>;
  started: number;
  limit: number;
  closed: boolean;
  deadline: number;
  writes: Promise<void>;
  pending: Map<string, Promise<unknown>>;
  active: Map<string, string>;
  errors: unknown[];
  accounted: Set<string>;
  failedStage?: string;
}
const execution = new AsyncLocalStorage<Execution>();

export const emptyGenerationCheckpoint = (): GenerationCheckpoint => ({ version: 1, entries: {} });
export const isCheckpointedGeneration = () => !!execution.getStore();
export const generationSliceDeadline = () => execution.getStore()?.deadline;

function addUsage(total: GenerationUsage | undefined, section: GenerationUsage): void {
  if (!total) return;
  total.tokensIn += section.tokensIn;
  total.tokensOut += section.tokensOut;
  for (const model of section.models) if (!total.models.includes(model)) total.models.push(model);
  if (section.requests?.length) (total.requests ??= []).push(...structuredClone(section.requests));
}

function persist(state: Execution): Promise<void> {
  const write = state.writes.then(() => state.persist(structuredClone(state.checkpoint)));
  state.writes = write.catch(() => {});
  return write;
}

/** Save one bounded wave of independent calls; dependent work resumes next time. */
export async function runGenerationSlice<T>(
  checkpoint: GenerationCheckpoint,
  persist: Execution["persist"],
  operation: () => Promise<T>,
  options: { concurrency?: number; budgetMs?: number } = {},
): Promise<{ done: true; value: T } | { done: false }> {
  const state: Execution = { checkpoint, persist, started: 0, limit: Math.max(1, Math.min(3, options.concurrency ?? 1)), closed: false,
    deadline: Date.now() + (options.budgetMs ?? 250_000), writes: Promise.resolve(), pending: new Map(), active: new Map(), errors: [], accounted: new Set() };
  return execution.run(state, async () => {
    let value: T | undefined;
    let failure: unknown;
    try { value = await operation(); } catch (error) { failure = error; }
    state.closed = true;
    // A paused sibling must not release the lease while other calls still save.
    await Promise.allSettled(state.pending.values());
    await state.writes;
    if (failure instanceof GenerationPaused) {
      if (state.errors.length) throw state.errors[0];
      return { done: false };
    }
    if (failure) throw failure;
    return { done: true, value: value as T };
  });
}

export async function checkpointedSection<T>(
  stage: string,
  prompt: string,
  usage: GenerationUsage | undefined,
  operation: (sectionUsage?: GenerationUsage) => Promise<T>,
): Promise<T> {
  const state = execution.getStore();
  if (!state) return operation(usage);
  const key = createHash("sha256").update(`contract-v1:${stage}:${prompt}`).digest("hex");
  const account = (section: GenerationUsage) => {
    if (!state.accounted.has(key)) { addUsage(usage, section); state.accounted.add(key); }
  };
  const cached = state.checkpoint.entries[key];
  if (cached) { account(cached.usage); return structuredClone(cached.value) as T; }
  const pending = state.pending.get(key);
  if (pending) return pending as Promise<T>;
  if (state.closed || state.started >= state.limit || Date.now() >= state.deadline) throw new GenerationPaused();
  state.started++;
  state.active.set(key, stage);
  const work = (async () => {
    const sectionUsage: GenerationUsage = { tokensIn: 0, tokensOut: 0, models: [] };
    addUsage(sectionUsage, state.checkpoint.failedUsage?.[key] ?? { tokensIn: 0, tokensOut: 0, models: [] });
    try {
      state.checkpoint.activeStage = state.active.values().next().value ?? state.failedStage;
      await persist(state);
      const value = await operation(sectionUsage);
      state.closed = true;
      state.checkpoint.entries[key] = { value: structuredClone(value), usage: structuredClone(sectionUsage), stage };
      if (state.checkpoint.failedUsage) delete state.checkpoint.failedUsage[key];
      state.active.delete(key);
      state.checkpoint.activeStage = state.active.values().next().value ?? state.failedStage;
      await persist(state);
      account(sectionUsage);
      return value;
    } catch (error) {
      state.closed = true;
      state.errors.push(error);
      state.failedStage ??= stage;
      (state.checkpoint.failedUsage ??= {})[key] = structuredClone(sectionUsage);
      state.active.delete(key);
      state.checkpoint.activeStage = state.active.values().next().value ?? stage;
      try { await persist(state); } catch (persistenceError) { state.errors.push(persistenceError); }
      account(sectionUsage);
      throw error;
    }
  })();
  state.pending.set(key, work);
  return work;
}
