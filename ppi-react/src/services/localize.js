import esServices from "../i18n/messages/es/services.js";
import { getRuntimeLocale } from "../i18n/runtimeLocale.js";

export function localizeService(key, params = {}) {
  const { lang, messages: activeMessages } = getRuntimeLocale();
  const messages = activeMessages || esServices;
  let message = messages[key];
  if (params.count !== undefined) {
    const category = new Intl.PluralRules(lang).select(Number(params.count));
    message = messages[`${key}_${category}`] ?? messages[`${key}_other`] ?? message;
  }
  if (typeof message !== "string") {
    return lang === "en" ? "Something went wrong. Please try again." : esServices[key] ?? key;
  }
  return message.replace(/\{([\w]+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}
