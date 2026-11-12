import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import esMessages from "./messages/es.js";
import { setRuntimeLocale } from "./runtimeLocale.js";

const I18nContext = createContext(null);
const STORAGE_KEY = "recordate_language";
let englishPromise;

function readPreferredLanguage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    // Storage puede estar deshabilitado; continuar con el idioma del navegador.
  }
  // La página original abre en español; el inglés se elige con el selector.
  return "es";
}

function loadEnglish() {
  englishPromise ||= import("./messages/en.js").then((module) => module.default);
  return englishPromise;
}

function interpolate(value, params) {
  if (typeof value !== "string" || !params) return value;
  return value.replace(/\{([\w]+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

function I18nProvider({ children }) {
  const [lang, setLanguage] = useState("es");
  const [messages, setMessages] = useState(esMessages);
  const requestRef = useRef(0);
  const englishRef = useRef(null);

  const applyLanguage = useCallback(async (next, persist = true) => {
    if (next !== "es" && next !== "en") return;
    const requestId = ++requestRef.current;
    let nextMessages = esMessages;
    if (next === "en") {
      nextMessages = englishRef.current || await loadEnglish();
      englishRef.current = nextMessages;
    }
    if (requestId !== requestRef.current) return;
    const update = () => {
      setRuntimeLocale(next, nextMessages);
      setMessages(nextMessages);
      setLanguage(next);
      if (persist) {
        try { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next); } catch { /* Storage es opcional. */ }
      }
    };
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (typeof document !== "undefined" && typeof document.startViewTransition === "function" && !reduced) {
      document.startViewTransition(() => flushSync(update));
    } else update();
  }, []);

  const setLang = useCallback((next) => applyLanguage(next, true), [applyLanguage]);

  useEffect(() => {
    void applyLanguage(readPreferredLanguage(), false);
  }, [applyLanguage]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const syncWorker = () => {
      try { navigator.serviceWorker?.controller?.postMessage({ type: "SET_LANGUAGE", lang }); } catch { /* Service worker aún no disponible. */ }
    };
    syncWorker();
    navigator.serviceWorker?.ready?.then((registration) => {
      registration.active?.postMessage({ type: "SET_LANGUAGE", lang });
    }).catch(() => {});
  }, [lang]);

  const t = useCallback((key, params) => {
    let selectedKey = key;
    if (params && Object.prototype.hasOwnProperty.call(params, "count")) {
      const category = new Intl.PluralRules(lang).select(Number(params.count));
      const pluralKey = `${key}_${category}`;
      const fallbackKey = `${key}_other`;
      if (Object.prototype.hasOwnProperty.call(messages, pluralKey)) selectedKey = pluralKey;
      else if (Object.prototype.hasOwnProperty.call(messages, fallbackKey)) selectedKey = fallbackKey;
    }
    const value = messages[selectedKey] ?? (lang === "es" ? esMessages[selectedKey] : undefined) ?? key;
    return interpolate(value, params);
  }, [lang, messages]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t("meta.title");
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }
    description.content = t("meta.description");
    for (const [property, key] of [["og:title", "meta.ogTitle"], ["og:description", "meta.ogDescription"]]) {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.content = t(key);
    }
  }, [lang, t]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n debe usarse dentro de I18nProvider");
  return context;
}

export { I18nProvider, useI18n, STORAGE_KEY };
