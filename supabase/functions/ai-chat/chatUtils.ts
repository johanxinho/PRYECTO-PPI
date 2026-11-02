export const MAX_CHAT_HISTORY = 16;

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Converts newest-first database rows into a bounded, chronological Gemini history. */
export function recentChronologicalHistory(
  newestFirstRows: unknown,
  limit = MAX_CHAT_HISTORY,
): ChatMessage[] {
  if (!Array.isArray(newestFirstRows)) return [];
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : MAX_CHAT_HISTORY;
  return newestFirstRows
    .filter(
      (row): row is ChatMessage =>
        Boolean(row) &&
        typeof row === "object" &&
        ((row as ChatMessage).role === "user" || (row as ChatMessage).role === "assistant") &&
        typeof (row as ChatMessage).content === "string",
    )
    .slice(0, safeLimit)
    .reverse();
}

/** Parses JSON while enforcing the body limit even when Content-Length is absent. */
export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("INVALID_MAX_BODY_BYTES");
  }

  const contentLength = request.headers.get("Content-Length");
  if (contentLength !== null) {
    const trimmedLength = contentLength.trim();
    if (!/^\d+$/.test(trimmedLength)) throw new Error("INVALID_CONTENT_LENGTH");
    if (Number(trimmedLength) > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  }
  if (!request.body) return {};

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("INVALID_JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("INVALID_JSON");
  }
  return parsed as Record<string, unknown>;
}

/** Bounds both Gemini response headers and body reading with a cancellable timeout. */
export async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
): Promise<{ response: Response; payload: unknown }> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new Error("INVALID_TIMEOUT");
  }
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetcher(url, { ...init, signal: controller.signal });
    const payload = await response.json();
    return { response, payload };
  } catch (error) {
    if (timedOut) throw new Error("GEMINI_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
