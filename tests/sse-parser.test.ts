import { test } from "node:test";
import assert from "node:assert/strict";
import { LLMStreamInterruptedError, parseLLMResponse } from "@/lib/sse-parser";

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
test("empty SSE leaves missing token usage unreported", async () => {
  const parsed = await parseLLMResponse(response(['data: [DONE]\n\n'], "text/event-stream"));
  assert.equal(parsed.content, ""); assert.equal(parsed.usage, undefined);
});

test("stream read interruption preserves only the partial draft and safe usage metadata", async () => {
  let sent = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'));
      } else {
        controller.error(new Error("synthetic socket reset"));
      }
    },
  });
  const interrupted = new Response(body, { headers: { "Content-Type": "text/event-stream" } });
  await assert.rejects(parseLLMResponse(interrupted, { onError: () => {} }), (error: unknown) => {
    assert.ok(error instanceof LLMStreamInterruptedError);
    assert.equal(error.partialContent, "partial");
    return true;
  });
});

test("SSE reports output-limit finish reason for bounded repair", async () => {
  const event = { choices: [{ delta: { content: '{"partial":true' }, finish_reason: "length" }] };
  const parsed = await parseLLMResponse(response([`data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`], "text/event-stream"));
  assert.equal(parsed.finishReason, "length");
});

test("usage preserves cache and reasoning counters separately", async () => {
  const usage = { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30, prompt_tokens_details: { cached_tokens: 8 }, completion_tokens_details: { reasoning_tokens: 4 } };
  for (const type of ["application/json", "text/event-stream"]) {
    const payload = { choices: [{ message: { content: "ok" } }], usage };
    const parsed = await parseLLMResponse(response([type === "application/json" ? JSON.stringify(payload) : `data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`], type));
    assert.deepEqual(parsed.usage, usage);
  }
});
