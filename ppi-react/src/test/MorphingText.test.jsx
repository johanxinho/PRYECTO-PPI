import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", () => ({
  useReducedMotion: () => motionPreference.reduced,
}));

import { MorphingText } from "../components/ui/morphing-text";

beforeEach(() => {
  vi.useFakeTimers();
  motionPreference.reduced = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("MorphingText", () => {
  it("rota el texto con un temporizador, sin una animación JavaScript por frame", () => {
    render(<MorphingText texts={["Recuerda.", "Organiza."]} />);

    expect(screen.getByText("Recuerda.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.getByText("Organiza.")).toBeInTheDocument();
  });

  it("mantiene el primer texto y detiene la rotación con movimiento reducido", () => {
    motionPreference.reduced = true;
    render(<MorphingText texts={["Recuerda.", "Organiza."]} />);

    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByText("Recuerda.")).toBeInTheDocument();
    expect(screen.queryByText("Organiza.")).not.toBeInTheDocument();
  });

  it("se detiene y vuelve a iniciar si cambia la preferencia durante la sesión", () => {
    const texts = ["Recuerda.", "Organiza."];
    const view = render(<MorphingText texts={texts} />);

    act(() => vi.advanceTimersByTime(2600));
    expect(screen.getByText("Organiza.")).toBeInTheDocument();

    motionPreference.reduced = true;
    view.rerender(<MorphingText texts={texts} />);
    expect(screen.getByText("Recuerda.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByText("Recuerda.")).toBeInTheDocument();

    motionPreference.reduced = false;
    view.rerender(<MorphingText texts={texts} />);
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.getByText("Organiza.")).toBeInTheDocument();
  });
});
