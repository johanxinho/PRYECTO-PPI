import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithI18n as render } from "./renderWithI18n";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSignInWithOAuth } = vi.hoisted(() => ({ mockSignInWithOAuth: vi.fn() }));

vi.mock("../supabaseClient", () => ({
  hasSupabaseConfig: true,
  supabase: { auth: { signInWithOAuth: mockSignInWithOAuth } },
}));
vi.mock("../Brand", () => ({ Brand: () => null, LogoMark: () => null }));
vi.mock("../components/ui/dia-text-reveal", () => ({ DiaTextReveal: ({ children }) => children }));
vi.mock("../components/LanguageSwitcher", () => ({ default: () => null }));
vi.mock("../paths", () => ({
  appBase: "/PRYECTO-PPI",
  appUrl: (path) => `https://recordate.test/PRYECTO-PPI${path}`,
}));

import Login from "../components/Login";

beforeEach(() => {
  mockSignInWithOAuth.mockReset();
  mockSignInWithOAuth.mockResolvedValue({
    data: { url: "https://accounts.google.com/" },
    error: null,
  });
});

describe("inicio con Google", () => {
  it("inicia OAuth de Supabase y vuelve a la app publicada", async () => {
    render(<Login onLogin={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /continuar con google/i }));

    await waitFor(() => expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/PRYECTO-PPI/",
        queryParams: { prompt: "select_account" },
      },
    });
  });

  it("explica cuando el proveedor Google todavía no está activo en Supabase", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: "Unsupported provider: provider is not enabled" },
    });
    render(<Login onLogin={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /continuar con google/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /aún no está habilitado en supabase/i
    );
  });
});
