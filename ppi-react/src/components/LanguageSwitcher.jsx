// Alterna el idioma de toda la página entre español e inglés usando Google Translate.
import { useState } from "react";

const SCRIPT_ID = "google-translate-script";
const SCRIPT_SRC =
  "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

function initializeGoogleTranslate() {
  const TranslateElement = window.google?.translate?.TranslateElement;
  if (typeof TranslateElement !== "function" || document.querySelector("select.goog-te-combo"))
    return;
  try {
    new TranslateElement(
      { pageLanguage: "es", includedLanguages: "es,en", autoDisplay: false },
      "google_translate_element"
    );
  } catch {
    // El selector propio sigue disponible aunque el widget remoto esté bloqueado.
  }
}

function loadGoogleTranslate(onError) {
  window.googleTranslateElementInit = initializeGoogleTranslate;
  if (window.google?.translate?.TranslateElement) {
    initializeGoogleTranslate();
    return;
  }
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.onerror = () => {
    script.remove();
    onError?.();
  };
  document.body.appendChild(script);
}

function applyLanguage(lang) {
  const trySwitch = () => {
    const select = document.querySelector("select.goog-te-combo");
    if (!select) return false;
    select.value = lang;
    select.dispatchEvent(new Event("change"));
    return true;
  };
  if (trySwitch()) return;
  let attempts = 0;
  const interval = setInterval(() => {
    attempts += 1;
    if (trySwitch() || attempts > 25) clearInterval(interval);
  }, 200);
}

function LanguageSwitcher({ lang = "es", onChange }) {
  const [translateUnavailable, setTranslateUnavailable] = useState(false);

  const changeLanguage = (next) => {
    setTranslateUnavailable(false);
    onChange?.(next);
    if (next === "en") {
      loadGoogleTranslate(() => {
        setTranslateUnavailable(true);
        onChange?.("es");
      });
      applyLanguage(next);
    } else if (window.google?.translate) {
      applyLanguage(next);
    }
  };

  return (
    <div className="language-switcher" role="group" aria-label="Cambiar idioma / Change language">
      <div id="google_translate_element" style={{ display: "none" }} aria-hidden="true" />
      <button
        type="button"
        className={lang === "es" ? "lang-option active" : "lang-option"}
        onClick={() => changeLanguage("es")}
        aria-pressed={lang === "es"}
      >
        ES
      </button>
      <button
        type="button"
        className={lang === "en" ? "lang-option active" : "lang-option"}
        onClick={() => changeLanguage("en")}
        aria-pressed={lang === "en"}
        title={
          translateUnavailable
            ? "Google Translate está bloqueado; permite su carga para cambiar a inglés."
            : undefined
        }
      >
        EN
      </button>
      {translateUnavailable && (
        <span className="sr-only" role="status">
          Google Translate no pudo cargarse. Revisa el bloqueador o la conexión e inténtalo de
          nuevo.
        </span>
      )}
    </div>
  );
}

export default LanguageSwitcher;
