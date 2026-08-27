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

import { jsonrepair } from "jsonrepair";

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
const detectStreamingMode = async (
  response: Response,
  options: ParseOptions
): Promise<"streaming" | "json"> => {
  // Check Content-Type header first
  const contentType = response.headers.get("content-type") || "";
  
  if (options.logDebug) {
    console.log(`[SSE Parser] Content-Type: ${contentType}`);
  }
  
  // SSE/streaming indicators
  const isSSE = contentType.includes("text/event-stream") || 
                contentType.includes("application/x-ndjson");
  
  if (isSSE) {
    return "streaming";
  }
  
  // If user explicitly wants streaming, assume it even without header check
  if (options.preferStreaming === true) {
    if (options.logDebug) {
      console.log("[SSE Parser] Force streaming mode enabled");
    }
    return "streaming";
  }
  
  // Read first few bytes to check for SSE pattern
  const reader = response.body?.getReader();
  if (!reader) {
    return "json";
  }
  
  try {
    const { value, done } = await reader.read();
    if (done || !value) {
      return "json";
    }
    
    // Decode and check first chunk
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(value, { stream: true });
    
    // SSE streaming starts with "data:" or contains "[DONE]" marker
    const hasSSEPattern = text.startsWith("data:") || text.includes("[DONE]") || text.includes("choices");
    
    if (options.logDebug && hasSSEPattern) {
      console.log("[SSE Parser] Detected streaming pattern:", text.substring(0, 100));
    }
    
    if (hasSSEPattern) {
      return "streaming";
    } else {
      // Put the chunk back by creating new readable stream
      const restoredStream = new ReadableStream({
        start(controller) {
          controller.enqueue(value);
          controller.close();
        }
      });
      
      Object.defineProperty(response, 'body', { value: restoredStream, configurable: true, writable: true });
      
      if (options.logDebug) {
        console.log("[SSE Parser] Detected JSON mode:", text.substring(0, 50));
      }
    }
    
  } catch (error) {
    if (options.logDebug) {
      console.warn("[SSE Parser] Detection failed:", error);
    }
  } finally {
    reader.releaseLock();
  }
  
  return "json";
};

/** Parse SSE streaming response */
async function parseStream(
  body: ReadableStream<Uint8Array>,
  options: ParseOptions
): Promise<ParsedLLMResponse> {
  const decoder = new TextDecoder("utf-8");
  let fullContent = "";
  let usageInfo: Record<string, number> = {};
  let lastChunkForUsage: Record<string, any> | null = null;
  
  if (options.logDebug) {
    console.log("[SSE Parser] Starting streaming parse...");
  }
  
  const reader = body.getReader();
  const chunks: string[] = [];
  // Buffer antar network chunk: satu event SSE bisa kepotong di tengah
  // (umum via proxy/tunnel seperti Cloudflare). Tanpa buffer, JSON kepotong
  // → parse gagal → chunk dibuang diam-diam → konten JSON bolong →
  // 'JSON parsing gagal' di akhir pipeline.
  let lineBuffer = "";
  let streamDone = false;

  try {
    while (!streamDone) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk
      const text = decoder.decode(value, { stream: true });

      // Gabung dengan sisa chunk sebelumnya, baru split per baris.
      // Baris terakhir belum tentu utuh — simpan di buffer.
      const combined = lineBuffer + text;
      const lines = combined.split("\n");
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) continue;

        // Check for [DONE] marker — hentikan SELURUH pembacaan stream
        if (trimmed === "[DONE]" || trimmed === "data: [DONE]") {
          if (options.logDebug) {
            console.log("[SSE Parser] Stream completed");
          }
          streamDone = true;
          break;
        }
        
        // Parse SSE message (should start with "data:")
        if (trimmed.startsWith('data:')) {
          const jsonString = trimmed.slice(5).trim();
          
          // Skip empty or invalid JSON
          if (!jsonString) continue;
          
          try {
            const event = JSON.parse(jsonString);
            
            // Extract content from delta (streaming mode) or message (non-streaming)
            const choice = event.choices?.[0];
            if (choice) {
              const contentDelta = choice.delta?.content || choice.message?.content;
              
              if (contentDelta) {
                fullContent += contentDelta;
                
                // Call token callback if provided
                if (options.onToken) {
                  options.onToken(contentDelta);
                }
              }
            }
            
            // Capture token usage from final events
            if (event.usage) {
              usageInfo = event.usage;
            }
            
            // Also capture from choices.finish_reason events
            if (lastChunkForUsage && !usageInfo.total_tokens) {
              lastChunkForUsage = event;
            }
            
          } catch (e) {
            // Ignore malformed JSON (occasional during streaming)
            if (options.logDebug) {
              console.warn("[SSE Parser] Skipped malformed SSE event");
            }
          }
        }
      }
      
      chunks.push(text);
    }
    
    // Finalize usage info
    const usage: Record<string, number> = {
      prompt_tokens: usageInfo.prompt_tokens || 0,
      completion_tokens: usageInfo.completion_tokens || 0,
      total_tokens: usageInfo.total_tokens || 
                    (usageInfo.prompt_tokens + usageInfo.completion_tokens)
    };
    
    if (options.logDebug) {
      console.log(`[SSE Parser] Streaming complete: ${fullContent.length} chars, ${usage.total_tokens.toLocaleString()} tokens`);
      console.log(`[SSE Parser] Raw content preview: "${fullContent.substring(0, 200)}..."`);
    }
    
    return {
      content: fullContent,
      usage: usage as ParsedLLMResponse['usage'],
      mode: "streaming"
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (options.onError) {
      options.onError(new Error(`Streaming parse error: ${errorMsg}`));
    } else {
      console.error("[SSE Parser] Fatal streaming error:", error);
    }
    
    throw new Error(`Failed to parse streaming response: ${errorMsg}`);
    
  } finally {
    reader.releaseLock();
  }
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
  throw new Error("streamLLMResponse is deprecated and not fully compatible yet");
}
