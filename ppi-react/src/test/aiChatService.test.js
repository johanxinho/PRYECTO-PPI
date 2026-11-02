import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabaseClient", () => ({ supabase: null }));

import { translateAiError } from "../services/aiChatService";

describe("AI client error messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("explains upstream timeouts without exposing provider details", () => {
    expect(translateAiError({ error: "gemini_timeout" }, "fallback")).toMatch(/tardó demasiado/i);
  });

  it("explains account and conversation access errors", () => {
    expect(translateAiError({ error: "account_inactive" }, "fallback")).toMatch(/cuenta no está activa/i);
    expect(translateAiError({ error: "conversation_not_found" }, "fallback")).toMatch(/chat nuevo/i);
    expect(translateAiError({ error: "invalid_conversation" }, "fallback")).toMatch(/chat nuevo/i);
  });

  it("keeps the displayed total upload limit aligned with the server", () => {
    expect(translateAiError({ error: "payload_too_large" }, "fallback")).toMatch(/13 MB/i);
  });
});
