let currentLocale = { lang: "es", messages: null };

export function setRuntimeLocale(lang, messages) {
  if ((lang === "es" || lang === "en") && messages) currentLocale = { lang, messages };
}

export function getRuntimeLocale() {
  return currentLocale;
}
