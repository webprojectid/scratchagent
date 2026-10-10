import type { LlmConfig, LlmProvider } from "./llm-config";

export type ProviderInput = LlmProvider & { sourceIndex?: number | null };

export function resolveProviderKeys(input: ProviderInput[], existing: LlmConfig | null, environmentKey = ""): LlmProvider[] {
  return input.map((provider, index) => {
    const source = provider.sourceIndex === undefined ? index : provider.sourceIndex;
    const retainedKey = source === null ? "" : existing?.providers[source]?.apiKey || (source === 0 ? existing?.apiKey || environmentKey : "") || "";
    return { baseUrl: provider.baseUrl, apiKey: provider.apiKey || retainedKey, models: provider.models };
  });
}
