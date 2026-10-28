import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", () => ({
  useReducedMotion: () => motionPreference.reduced,
}));

import { MorphingText } from "../components/ui/morphing-text";

let requestFrame;
let cancelFrame;
let frameId = 0;

beforeEach(() => {
  motionPreference.reduced = false;
  frameId = 0;
  requestFrame = vi.fn(() => ++frameId);
  cancelFrame = vi.fn();
  vi.stubGlobal("requestAnimationFrame", requestFrame);
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MorphingText", () => {
  it("conserva las dos capas y el filtro SVG del efecto visual original", () => {
    motionPreference.reduced = true;
    const { container } = render(
      <MorphingText className="hero-morph" texts={["Recuerda.", "Organiza."]} />
    );

    expect(container.querySelector(".morphing-text")).toHaveClass("hero-morph");
    expect(container.querySelectorAll(".morphing-line")).toHaveLength(2);
    expect(container.querySelector("#threshold feColorMatrix")).toBeInTheDocument();
    expect(container.querySelectorAll(".morphing-line")[1]).toHaveTextContent("Recuerda.");
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("cancela el bucle y muestra el texto estático al activar movimiento reducido", () => {
    const texts = ["Recuerda.", "Organiza."];
    const view = render(<MorphingText texts={texts} />);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    const scheduledFrame = requestFrame.mock.results[0].value;

    motionPreference.reduced = true;
    view.rerender(<MorphingText texts={texts} />);

    expect(cancelFrame).toHaveBeenCalledWith(scheduledFrame);
    expect(containerText(view.container)).toBe("Recuerda.");
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });
});

function containerText(container) {
  return container.querySelectorAll(".morphing-line")[1]?.textContent;
}
