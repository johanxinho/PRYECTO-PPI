import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LanguageSwitcher from "../components/LanguageSwitcher";

afterEach(() => {
  cleanup();
  document.getElementById("google-translate-script")?.remove();
  delete window.google;
  delete window.googleTranslateElementInit;
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("LanguageSwitcher", () => {
  it("no solicita Google Translate mientras se mantiene el idioma español", () => {
    render(<LanguageSwitcher lang="es" onChange={vi.fn()} />);

    expect(document.getElementById("google-translate-script")).toBeNull();
  });

  it("carga Google Translate solo al pedir inglés y revierte la selección si el navegador lo bloquea", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<LanguageSwitcher lang="es" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    const script = document.getElementById("google-translate-script");
    expect(script).not.toBeNull();
    expect(script.src).toBe(
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
    );

    fireEvent.error(script);

    expect(onChange).toHaveBeenLastCalledWith("es");
    expect(screen.getByRole("status")).toHaveTextContent(/Google Translate no pudo cargarse/i);
  });
});
