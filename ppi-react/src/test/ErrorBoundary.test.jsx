import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "../components/ErrorBoundary";

function Broken() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.lang = "es";
  });

  it("muestra un aviso en español y evita la pantalla en blanco", () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/algo salió mal/i);
    expect(screen.getByRole("button", { name: /recargar/i })).toBeInTheDocument();
  });

  it("usa el texto en inglés cuando el documento está en inglés", () => {
    document.documentElement.lang = "en";
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
  });
});