import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

export interface GenerationUsage { tokensIn: number; tokensOut: number; models: string[]; requests?: import("./generation-metrics").GenerationRequestMetric[] }
export interface GenerationCheckpoint {
  version: 1;
  entries: Record<string, { value: unknown; usage: GenerationUsage }>;
  failedUsage?: Record<string, GenerationUsage>;
}

export class GenerationPaused extends Error {
  constructor() { super("Generation checkpoint saved; another slice is required."); }
}

interface Execution {
  checkpoint: GenerationCheckpoint;
  persist: (checkpoint: GenerationCheckpoint) => Promise<void>;
  used: boolean;
  queue: Promise<unknown>;
}
const execution = new AsyncLocalStorage<Execution>();

export const emptyGenerationCheckpoint = (): GenerationCheckpoint => ({ version: 1, entries: {} });
export const isCheckpointedGeneration = () => !!execution.getStore();

/** Run at most one uncached section. Concurrent callers share the same budget. */
export async function runGenerationSlice<T>(
  checkpoint: GenerationCheckpoint,
  persist: Execution["persist"],
  operation: () => Promise<T>,
): Promise<{ done: true; value: T } | { done: false }> {
  return execution.run({ checkpoint, persist, used: false, queue: Promise.resolve() }, async () => {
    try { return { done: true, value: await operation() }; }
    catch (error) { if (error instanceof GenerationPaused) return { done: false }; throw error; }
  });
}

export async function checkpointedSection<T>(
  stage: string,
  prompt: string,
  usage: GenerationUsage | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  const state = execution.getStore();
  if (!state) return operation();
  const key = createHash("sha256").update(`contract-v1:${stage}:${prompt}`).digest("hex");
  const work = state.queue.then(async () => {
    const cached = state.checkpoint.entries[key];
    if (cached) {
      if (usage) {
        usage.tokensIn += cached.usage.tokensIn;
        usage.tokensOut += cached.usage.tokensOut;
        for (const model of cached.usage.models) if (!usage.models.includes(model)) usage.models.push(model);
        if (cached.usage.requests?.length) (usage.requests ??= []).push(...structuredClone(cached.usage.requests));
      }
      return structuredClone(cached.value) as T;
    }
    if (state.used) throw new GenerationPaused();
    state.used = true;
    const before = { tokensIn: usage?.tokensIn ?? 0, tokensOut: usage?.tokensOut ?? 0, requests: usage?.requests?.length ?? 0 };
    const failed = state.checkpoint.failedUsage?.[key];
    if (usage && failed) {
      usage.tokensIn += failed.tokensIn;
      usage.tokensOut += failed.tokensOut;
      for (const model of failed.models) if (!usage.models.includes(model)) usage.models.push(model);
      if (failed.requests?.length) (usage.requests ??= []).push(...structuredClone(failed.requests));
    }
    const sectionUsage = (): GenerationUsage => ({
      tokensIn: (usage?.tokensIn ?? 0) - before.tokensIn,
      tokensOut: (usage?.tokensOut ?? 0) - before.tokensOut,
      models: [...(usage?.models ?? [])],
      ...(usage?.requests?.length ? { requests: structuredClone(usage.requests.slice(before.requests)) } : {}),
    });
    let value: T;
    try { value = await operation(); }
    catch (error) {
      (state.checkpoint.failedUsage ??= {})[key] = sectionUsage();
      await state.persist(structuredClone(state.checkpoint));
      throw error;
    }
    state.checkpoint.entries[key] = {
      value: structuredClone(value),
      usage: sectionUsage(),
    };
    if (state.checkpoint.failedUsage) delete state.checkpoint.failedUsage[key];
    await state.persist(structuredClone(state.checkpoint));
    return value;
  });
  state.queue = work;
  return work;
}
