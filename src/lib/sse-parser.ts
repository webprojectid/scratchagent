/**
 * SSE Streaming Response Parser
 * 
 * Purpose: Handle both OpenAI-compatible streaming (SSE) and plain JSON responses
 * Auto-detects response format based on Content-Type and first chunk analysis
 * 
 * Features:
 * - Automatic SSE streaming detection
 * - Backwards compatible with non-streaming JSON mode
 * - Real-time token usage tracking
 * - Comprehensive logging for debugging
 * 
 * Usage:
 * const { content, usage } = await parseLLMResponse(response);
 * // Or with streaming callback:
 * const { content, usage } = await parseLLMStream(stream(), {
 *   onToken: (token: string) => console.log(token),
 * });
 */

/** Interface untuk parsed LLM response data */
export interface ParsedLLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  mode: "streaming" | "json" | "unknown";
}

/** Options untuk parsing response */
export interface ParseOptions {
  onToken?: (chunk: string) => void;           // Callback per token/stream chunk
  onError?: (error: Error) => void;            // Error handler
  logDebug?: boolean;                          // Enable debug logging
  preferStreaming?: boolean;                   // Force streaming mode (default: auto-detect)
}

/** Helper untuk detect streaming response dari headers atau content */
const detectStreamingMode = async (response: Response, options: ParseOptions): Promise<"streaming" | "json"> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return "json";
  if (contentType.includes("text/event-stream") || contentType.includes("application/x-ndjson") || options.preferStreaming) return "streaming";
  // Sniff a clone so the parser still receives the first network chunk.
  const reader = response.clone().body?.getReader();
  if (!reader) return "json";
  let preview = "";
  const decoder = new TextDecoder();
  try {
    for (let count = 0; count < 16 && preview.trim().length < 6; count++) {
      const { value, done } = await reader.read();
      if (done) break;
      preview += decoder.decode(value, { stream: true });
    }
    return /^\s*(?:data:|event:|:)/.test(preview) ? "streaming" : "json";
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
};

async function parseStream(body: ReadableStream<Uint8Array>, options: ParseOptions): Promise<ParsedLLMResponse> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let content = "", buffer = "", finished = false;
  let usage: Partial<NonNullable<ParsedLLMResponse["usage"]>> = {};
  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (trimmed === "[DONE]" || trimmed === "data: [DONE]") { finished = true; return; }
    const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed.startsWith("{") ? trimmed : "";
    if (!payload) return;
    let event: { choices?: { delta?: { content?: string }; message?: { content?: string } }[]; usage?: typeof usage };
    try { event = JSON.parse(payload); }
    catch { if (options.logDebug) console.warn("[SSE Parser] Skipped malformed SSE event"); return; }
    const token = event.choices?.[0]?.delta?.content ?? event.choices?.[0]?.message?.content;
    if (typeof token === "string") { content += token; options.onToken?.(token); }
    if (event.usage) usage = event.usage;
  };
  try {
    while (!finished) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer.trim()) consumeLine(buffer);
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) { consumeLine(line); if (finished) break; }
    }
    if (finished) await reader.cancel();
    const finite = (number: number | undefined) => typeof number === "number" && Number.isFinite(number) ? number : 0;
    const prompt_tokens = finite(usage.prompt_tokens), completion_tokens = finite(usage.completion_tokens);
    return { content, usage: { prompt_tokens, completion_tokens, total_tokens: finite(usage.total_tokens) || prompt_tokens + completion_tokens }, mode: "streaming" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.onError?.(new Error(`Streaming parse error: ${message}`));
    throw new Error(`Failed to parse streaming response: ${message}`);
  } finally { reader.releaseLock(); }
}

/** Parse plain JSON response (non-streaming) */
async function parseJson(
  response: Response,
  options: ParseOptions
): Promise<ParsedLLMResponse> {
  if (options.logDebug) {
    console.log("[SSE Parser] Parsing as JSON mode...");
  }
  
  try {
    const json = await response.json();
    
    // Extract content from structure
    const choice = json.choices?.[0];
    let content = "";
    
    if (choice) {
      // Try different fields depending on response format
      content = choice.content ?? 
                choice.message?.content ?? 
                choice.delta?.content ?? 
                "";
    }
    
    // Extract usage stats
    const usage = {
      prompt_tokens: json.usage?.prompt_tokens ?? 0,
      completion_tokens: json.usage?.completion_tokens ?? 0,
      total_tokens: json.usage?.total_tokens ?? 0
    };
    
    if (options.logDebug) {
      console.log(`[SSE Parser] JSON complete: ${content.length} chars, ${usage.total_tokens.toLocaleString()} tokens`);
    }
    
    return {
      content,
      usage: usage as ParsedLLMResponse['usage'],
      mode: "json"
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (options.onError) {
      options.onError(new Error(`JSON parse error: ${errorMsg}`));
    } else {
      console.error("[SSE Parser] Failed to parse JSON:", error);
    }
    
    throw new Error(`Failed to parse JSON response: ${errorMsg}`);
  }
}

/**
 * Main parser function - auto-detects response type and parses accordingly
 * @param response Fetch Response object from LLM API call
 * @param options Optional configuration for parsing behavior
 * @returns Promise resolving to parsed content and metadata
 */
export async function parseLLMResponse(
  response: Response,
  options: ParseOptions = {}
): Promise<ParsedLLMResponse> {
  const defaultOptions: ParseOptions = {
    logDebug: false,
    onError: (err) => console.error(err),
    ...options
  };
  
  // Detect streaming mode automatically
  const mode = await detectStreamingMode(response, defaultOptions);
  
  try {
    if (mode === "streaming") {
      // Parse as SSE stream
      return await parseStream(response.body!, defaultOptions);
    } else {
      // Parse as JSON
      return await parseJson(response, defaultOptions);
    }
  } catch (error) {
    // Re-throw with context about which mode failed
    const modeMsg = mode === "streaming" ? "streaming" : "JSON";
    throw new Error(`Failed to parse response (${modeMsg} mode): ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Convenience function to fetch and parse in one call
 * @param url Target URL
 * @param init Fetch options
 * @param parseOptions Additional parsing options
 */
export async function fetchAndParseLLM(
  url: string,
  init: RequestInit,
  parseOptions: ParseOptions = {}
): Promise<ParsedLLMResponse> {
  const response = await fetch(url, init);
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  
  return parseLLMResponse(response, parseOptions);
}

/**
 * Experimental: Parse streaming response line-by-line with progress callback
 * Useful for showing loading state during long generations
 * @deprecated Use parseLLMResponse instead - this function has compatibility issues
 */
export async function* streamLLMResponse(
  _response: Response,
  _options: ParseOptions & {
    onProgress?: (current: string, complete: () => void) => void;
  } = {}
): AsyncGenerator<string, ParsedLLMResponse, unknown> {
  void _options;
  throw new Error("streamLLMResponse is deprecated and not fully compatible yet");
}
