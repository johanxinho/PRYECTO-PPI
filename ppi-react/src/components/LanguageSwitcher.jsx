import { useI18n } from "../i18n";
import { m } from "../motion/kit";

function LanguageSwitcher({ lang: providedLang, onChange }) {
  const { lang: contextLang, setLang, t } = useI18n();
  const lang = providedLang ?? contextLang;
  const changeLanguage = (next) => {
    if (onChange) onChange(next); else setLang(next);
  };
  return (
    <div className="language-switcher" role="group" aria-label={t("auth.language.group_label")}>
      {lang === "es" && (
        <m.span
          layoutId="lang-indicator"
          className="lang-indicator"
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          aria-hidden="true"
        />
      )}
      {lang === "en" && (
        <m.span
          layoutId="lang-indicator"
          className="lang-indicator lang-indicator--right"
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          aria-hidden="true"
        />
      )}
      <button type="button" className={lang === "es" ? "lang-option active" : "lang-option"} onClick={() => changeLanguage("es")} aria-pressed={lang === "es"} aria-label={`ES — ${t("auth.language.spanish")}`}>ES</button>
      <button type="button" className={lang === "en" ? "lang-option active" : "lang-option"} onClick={() => changeLanguage("en")} aria-pressed={lang === "en"} aria-label={`EN — ${t("auth.language.english")}`}>EN</button>
    </div>
  );
}
export default LanguageSwitcher;