import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLLMResponse } from "@/lib/sse-parser";

function response(chunks: string[], contentType?: string) {
  return new Response(new ReadableStream({ start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
    controller.close();
  } }), { headers: contentType ? { "Content-Type": contentType } : {} });
}

test("plain JSON keeps its first network chunk and usage", async () => {
  const parsed = await parseLLMResponse(response(['{"choices":[{"message":', '{"content":"hello"}}],"usage":{"total_tokens":5}}'], "application/json"));
  assert.equal(parsed.content, "hello"); assert.equal(parsed.mode, "json"); assert.equal(parsed.usage?.total_tokens, 5);
});
test("headerless SSE sniffing keeps the first event", async () => {
  const parsed = await parseLLMResponse(response(['data: {"choices":[{"delta":{"content":"first"}}]}\n\n', 'data: {"choices":[{"delta":{"content":" second"}}]}\n\ndata: [DONE]\n\n']));
  assert.equal(parsed.content, "first second");
});
test("SSE handles split events and an EOF event without trailing newline", async () => {
  const parsed = await parseLLMResponse(response(['data: {"choices":[{"delta":{"cont', 'ent":"split"}}]}\n\ndata: {"usage":{"prompt_tokens":2,"completion_tokens":3,"total_tokens":5}}'], "text/event-stream"));
  assert.equal(parsed.content, "split"); assert.equal(parsed.usage?.total_tokens, 5);
});
test("empty SSE reports finite zero token usage", async () => {
  const parsed = await parseLLMResponse(response(['data: [DONE]\n\n'], "text/event-stream"));
  assert.equal(parsed.content, ""); assert.equal(parsed.usage?.total_tokens, 0);
});
