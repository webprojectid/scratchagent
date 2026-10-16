export class RequestJsonError extends Error {
  constructor(public status: 400 | 413, public code: "INVALID_JSON" | "PAYLOAD_TOO_LARGE") {
    super(code);
  }
}

export async function readRequestJson(request: Request, maxBytes = 65_536): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > maxBytes) throw new RequestJsonError(413, "PAYLOAD_TOO_LARGE");
  if (!request.body) throw new RequestJsonError(400, "INVALID_JSON");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new RequestJsonError(413, "PAYLOAD_TOO_LARGE");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try { return JSON.parse(text); }
  catch { throw new RequestJsonError(400, "INVALID_JSON"); }
}
