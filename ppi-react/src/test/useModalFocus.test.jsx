import { useCallback, useRef, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useModalFocus } from "../hooks/useModalFocus";

function DialogHarness({ noControls = false }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const show = () => {
    previousFocusRef.current = document.activeElement;
    setOpen(true);
  };

  useModalFocus(open, dialogRef, previousFocusRef, close);

  return (
    <>
      <button type="button" onClick={show}>Abrir diálogo</button>
      {open && (
        <section ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}>
          {!noControls && (
            <>
              <button type="button">Primero</button>
              <button type="button">Último</button>
            </>
          )}
        </section>
      )}
    </>
  );
}

describe("useModalFocus", () => {
  it("focuses the dialog, traps Tab in both directions, and restores focus on Escape", async () => {
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Abrir diálogo" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog");
    const first = screen.getByRole("button", { name: "Primero" });
    const last = screen.getByRole("button", { name: "Último" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("keeps focus on the dialog when there are no focusable controls", () => {
    render(<DialogHarness noControls />);
    const opener = screen.getByRole("button", { name: "Abrir diálogo" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);

    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    window.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog);
  });
});
