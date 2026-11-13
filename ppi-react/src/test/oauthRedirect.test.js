import { describe, expect, it, vi } from "vitest";

vi.mock("../supabaseClient", () => ({ supabase: null, hasSupabaseConfig: false }));

const { readOAuthErrorFromLocation } = await import("../services/authService");

describe("readOAuthErrorFromLocation", () => {
  it("lee el error que llega en la query", () => {
    expect(
      readOAuthErrorFromLocation({
        search: "?error=access_denied&error_description=Denied+by+user&state=abc",
        hash: "",
      })
    ).toEqual({ code: "access_denied", description: "Denied by user" });
  });

  it("lee el error que llega en el hash", () => {
    expect(
      readOAuthErrorFromLocation({
        search: "",
        hash: "#error=server_error&error_code=org_internal",
      })
    ).toEqual({ code: "server_error", description: "org_internal" });
  });

  it("devuelve null cuando no hay error", () => {
    expect(readOAuthErrorFromLocation({ search: "?view=login", hash: "" })).toBeNull();
    expect(readOAuthErrorFromLocation({ search: "", hash: "" })).toBeNull();
    expect(readOAuthErrorFromLocation(null)).toBeNull();
  });
});