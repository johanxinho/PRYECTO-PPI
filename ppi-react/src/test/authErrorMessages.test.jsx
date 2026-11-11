import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSignInWithPassword, mockSignUp } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({
  hasSupabaseConfig: true,
  supabase: { auth: { signInWithPassword: mockSignInWithPassword, signUp: mockSignUp } },
}));
vi.mock("../Brand", () => ({ Brand: () => null, LogoMark: () => null }));
vi.mock("../components/LanguageSwitcher", () => ({ default: () => null }));
vi.mock("../paths", () => ({
  appBase: "/PRYECTO-PPI",
  appUrl: (path) => `https://recordate.test/PRYECTO-PPI${path}`,
}));

import Login from "../components/Login";
import { I18nProvider } from "../i18n";

beforeEach(() => {
  mockSignInWithPassword.mockReset();
  mockSignUp.mockReset();
  mockSignInWithPassword.mockResolvedValue({ data: { session: null }, error: null });
  mockSignUp.mockResolvedValue({ data: { session: null, user: null }, error: null });
});

function renderLogin() {
  render(
    <I18nProvider>
      <Login onLogin={vi.fn()} onBack={vi.fn()} />
    </I18nProvider>,
  );
}

describe("mensajes localizados de autenticación", () => {
  it("muestra el motivo traducido cuando las credenciales son inválidas", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: "Invalid login credentials", code: "invalid_credentials" },
    });
    renderLogin();
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "estudiante@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "incorrecta123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByText("El correo o la contraseña son incorrectos.")).toBeInTheDocument();
  });

  it("muestra el motivo traducido cuando el correo ya está registrado", async () => {
    mockSignUp.mockResolvedValue({
      data: null,
      error: { message: "User already registered", code: "user_already_exists" },
    });
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /no tienes cuenta/i }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Estudiante" } });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "estudiante@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "correcta123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), {
      target: { value: "correcta123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear mi cuenta" }));

    expect(
      await screen.findByText("Ese correo ya está registrado. Inicia sesión o usa otro correo."),
    ).toBeInTheDocument();
  });
});
