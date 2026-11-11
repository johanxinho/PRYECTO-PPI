import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("cambia el idioma mediante el contexto i18n sin cargar servicios externos", async () => {
    render(<I18nProvider><LanguageSwitcher /></I18nProvider>);
    expect(screen.getByRole("button", { name: /ES.*Español/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /EN.*English|EN.*Inglés/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /EN.*English/i })).toHaveAttribute("aria-pressed", "true"));
    expect(document.getElementById("google-translate-script")).toBeNull();
  });
});
