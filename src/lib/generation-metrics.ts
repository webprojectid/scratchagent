export interface GenerationRequestMetric {
  id: string;
  stage: string;
  model: string;
  startedAt: string;
  durationMs: number;
  status: "accepted" | "rejected" | "failed";
  httpStatus: number | null;
  requestId: string | null;
  repair: boolean;
  tokensIn: number | null;
  tokensOut: number | null;
  cachedTokens: number | null;
  reasoningTokens: number | null;
}

export function mergeGenerationMetrics(...groups: (GenerationRequestMetric[] | undefined)[]): GenerationRequestMetric[] {
  return [...new Map(groups.flatMap(group => group ?? []).map(metric => [metric.id, metric])).values()];
}
