// Alterna el idioma de toda la página entre español e inglés usando Google Translate.
import { useEffect } from "react";

const SCRIPT_ID = "google-translate-script";
const SCRIPT_SRC = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

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
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate) return;
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement(
        { pageLanguage: "es", includedLanguages: "es,en", autoDisplay: false },
        "google_translate_element",
      );
    };
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      window.googleTranslateElementInit();
    }
  }, []);

  const changeLanguage = (next) => {
    onChange?.(next);
    applyLanguage(next);
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
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;

