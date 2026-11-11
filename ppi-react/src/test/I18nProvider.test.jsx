import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, STORAGE_KEY, useI18n } from "../i18n";

function Harness() {
  const { lang, setLang, t } = useI18n();
  return (
    <div>
      <output data-testid="language">{lang}</output>
      <output data-testid="chat-read">{t("core.chat.read")}</output>
      <output data-testid="classroom-count">{t("integrations.classroom.failedCourses", { count: 2 })}</output>
      <output data-testid="project-title">{t("core.profile.projectTitle")}</output>
      <output data-testid="ai-brand">{t("integrations.ai.brandTitle")}</output>
      <button type="button" onClick={() => void setLang("en")}>Switch to English</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, "es");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = "es";
});

describe("I18nProvider", () => {
  it("loads English on demand and persists the selection without DOM text replacement", async () => {
    render(<I18nProvider><Harness /></I18nProvider>);
    expect(screen.getByTestId("language")).toHaveTextContent("es");
    expect(screen.getByTestId("chat-read")).toHaveTextContent("Leído");
    expect(screen.getByTestId("project-title")).toHaveTextContent("Proyecto Pedagógico Integrador · Grado 11");
    expect(screen.getByTestId("ai-brand")).toHaveTextContent("Recórdate IA");

    fireEvent.click(screen.getByRole("button", { name: "Switch to English" }));

    await waitFor(() => expect(screen.getByTestId("language")).toHaveTextContent("en"));
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("en");
    expect(screen.getByTestId("chat-read")).toHaveTextContent("Read");
    expect(screen.getByTestId("classroom-count")).toHaveTextContent("2 courses could not be queried");
    expect(screen.getByTestId("project-title")).toHaveTextContent("Integrated Pedagogical Project · Grade 11");
    expect(screen.getByTestId("ai-brand")).toHaveTextContent("RECORDATE AI");
    await waitFor(() => expect(document.title).toBe("RECORDATE | Academic planner"));
    await waitFor(() => expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute("content", "RECORDATE, your academic planner"));
  });
});
