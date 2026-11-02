import { describe, expect, it } from "vitest";
import {
  fetchJsonWithTimeout,
  MAX_CHAT_HISTORY,
  readBoundedJson,
  recentChronologicalHistory,
} from "../../../supabase/functions/ai-chat/chatUtils.ts";

describe("AI chat request safeguards", () => {
  it("keeps only the newest valid user/assistant messages in chronological order", () => {
    const newestFirst = Array.from({ length: 25 }, (_, index) => ({
      role: index % 2 === 0 ? "assistant" : "user",
      content: `mensaje-${25 - index}`,
    }));
    newestFirst.push({ role: "tool", content: "ignorado" });

    const history = recentChronologicalHistory(newestFirst);
    expect(history).toHaveLength(MAX_CHAT_HISTORY);
    expect(history[0].content).toBe("mensaje-10");
    expect(history.at(-1).content).toBe("mensaje-25");
    expect(history.every((row) => row.role === "user" || row.role === "assistant")).toBe(true);
  });

  it("enforces the streaming body limit when Content-Length is missing", async () => {
    const request = new Request("https://recordate.test", {
      method: "POST",
      body: JSON.stringify({ text: "más de ocho bytes" }),
    });
    await expect(readBoundedJson(request, 8)).rejects.toThrow("PAYLOAD_TOO_LARGE");
  });

  it("parses bounded JSON and rejects malformed JSON", async () => {
    const request = new Request("https://recordate.test", {
      method: "POST",
      body: JSON.stringify({ message: "hola" }),
    });
    await expect(readBoundedJson(request, 100)).resolves.toEqual({ message: "hola" });

    const malformed = new Request("https://recordate.test", { method: "POST", body: "{" });
    await expect(readBoundedJson(malformed, 100)).rejects.toThrow("INVALID_JSON");
  });

  it("returns a clear timeout error when Gemini does not respond in time", async () => {
    const stalledFetch = (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    await expect(
      fetchJsonWithTimeout("https://gemini.test", {}, 5, stalledFetch),
    ).rejects.toThrow("GEMINI_TIMEOUT");
  });
});
