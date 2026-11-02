import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(dialog) {
  return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true",
  );
}

/** Keeps keyboard focus inside an open dialog and restores the element that opened it. */
export function useModalFocus(open, dialogRef, previousFocusRef, onClose, suspended = false) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
      return undefined;
    }

    const dialog = dialogRef.current;
    if (!dialog || suspended) return undefined;

    const elements = focusableElements(dialog);
    if (!dialog.contains(document.activeElement)) {
      const preferred = dialog.querySelector("[data-modal-initial-focus]");
      const initial = elements.includes(preferred) ? preferred : elements[0] || dialog;
      initial.focus();
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const currentElements = focusableElements(dialog);
      if (!currentElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = currentElements[0];
      const last = currentElements[currentElements.length - 1];
      const currentIsOutside = !dialog.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || currentIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || currentIsOutside)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dialogRef, previousFocusRef, suspended]);
}
