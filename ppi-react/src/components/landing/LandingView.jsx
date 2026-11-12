import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { useI18n } from "../../i18n";
import { Brand } from "../../Brand";
import LanguageSwitcher from "../LanguageSwitcher";
import { subjectColor } from "../../lib/subject";
import { Reveal, useSpotlight } from "../../motion/kit";

const localeFor = (lang) => (lang === "en" ? "en-US" : "es-CO");

function useInView(options = { threshold: 0.35 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setVisible(entry.isIntersecting));
    }, options);
    observer.observe(node);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, visible];
}

/* Cuenta regresiva viva del hero: misma lógica que usará la app. */
function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "hidden") setNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function HeroPreview({ t, lang }) {
  const now = useCountdown();
  const due = useMemo(() => {
    const date = new Date();
    date.setHours(14, 0, 0, 0);
    if (date.getTime() < Date.now()) date.setDate(date.getDate() + 1);
    return date;
  }, []);
  const minutes = Math.max(1, Math.round((due.getTime() - now) / 60_000));
  const countdown = minutes < 60
    ? new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "auto" }).format(minutes, "minute")
    : new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "auto" }).format(Math.round(minutes / 60), "hour");

  return (
    <div className="hero-scene">
      <article className="hero-next" style={{ "--tone": "var(--subject-4)" }}>
        <span className="hero-next__tab" aria-hidden="true" />
        <p className="hero-next__label">{t("core.landing.preview.next")}</p>
        <p className="hero-next__time num">{new Intl.DateTimeFormat(localeFor(lang), { hour: "2-digit", minute: "2-digit", hour12: false }).format(due)}</p>
        <p className="hero-next__subject">{t("core.landing.preview.math")}</p>
        <h2 className="hero-next__title">{t("core.landing.preview.workshop")}</h2>
        <p className="hero-next__count num">{countdown}</p>
      </article>
      <ul className="hero-agenda" aria-label={t("core.landing.preview.today")}>
        <li>
          <time className="num">07:00</time>
          <i aria-hidden="true" style={{ background: subjectColor("English") }} />
          <span><b>{t("core.landing.preview.english")}</b> · {t("core.landing.preview.quiz")}</span>
        </li>
        <li>
          <time className="num">10:30</time>
          <i aria-hidden="true" style={{ background: subjectColor("Physics") }} />
          <span><b>{t("core.landing.preview.physics")}</b> · {t("core.landing.preview.lab")}</span>
        </li>
      </ul>
      <div className="hero-week" aria-hidden="true">
        <span>{t("core.landing.preview.week")}</span>
        <div>{Array.from({ length: 7 }, (_, index) => <i key={index} className={index === 3 ? "is-today" : ""} />)}</div>
      </div>
    </div>
  );
}

function DemoAgenda() {
  return (
    <div className="demo demo-agenda" aria-hidden="true">
      <div className="demo-agenda__row"><span className="demo-check is-done" /><span className="demo-line w-70" /><time>08:00</time></div>
      <div className="demo-agenda__row demo-agenda__row--enter"><span className="demo-check" /><span className="demo-line w-90" /><time>10:00</time></div>
      <div className="demo-agenda__row"><span className="demo-check" /><span className="demo-line w-55" /><time>14:00</time></div>
    </div>
  );
}

function DemoBell() {
  return (
    <div className="demo demo-bell" aria-hidden="true">
      <span className="demo-bell__icon"><Icons.Bell size={22} /></span>
      <div className="demo-toast">
        <b>10:00</b>
        <span>Matemáticas</span>
      </div>
    </div>
  );
}

function DemoFocus() {
  return (
    <div className="demo demo-focus" aria-hidden="true">
      <svg viewBox="0 0 120 120" role="presentation">
        <circle className="demo-focus__track" cx="60" cy="60" r="48" />
        <circle className="demo-focus__ring" cx="60" cy="60" r="48" />
      </svg>
      <span className="num">25:00</span>
    </div>
  );
}

function DemoTeam() {
  return (
    <div className="demo demo-team" aria-hidden="true">
      <div className="demo-team__avatars">
        <span>A</span><span>M</span><span>J</span>
      </div>
      <p>Agenda compartida</p>
    </div>
  );
}

function DemoSearch() {
  return (
    <div className="demo demo-search" aria-hidden="true">
      <div className="demo-search__field"><Icons.Search size={14} /><span className="demo-typing">mate</span></div>
      <div className="demo-search__row w-80" />
      <div className="demo-search__row demo-search__row--out w-60" />
    </div>
  );
}

function DemoProgress() {
  return (
    <div className="demo demo-progress" aria-hidden="true">
      <div className="demo-progress__bar"><span /></div>
      <p><b className="num">72 %</b> completado</p>
    </div>
  );
}

const FEATURES = [
  { key: "1", title: "feature1Title", body: "feature1Body", span: "wide", Demo: DemoAgenda },
  { key: "2", title: "feature2Title", body: "feature2Body", span: "narrow", Demo: DemoBell },
  { key: "3", title: "feature3Title", body: "feature3Body", span: "third", Demo: DemoFocus },
  { key: "4", title: "feature4Title", body: "feature4Body", span: "third", Demo: DemoTeam },
  { key: "5", title: "feature5Title", body: "feature5Body", span: "third", Demo: DemoSearch },
  { key: "6", title: "feature6Title", body: "feature6Body", span: "full", Demo: DemoProgress },
];

function BentoTile({ item, t }) {
  const [ref, visible] = useInView({ threshold: 0.3 });
  const spot = useSpotlight();
  const setRefs = (node) => {
    ref.current = node;
    spot.current = node;
  };
  const { Demo } = item;
  return (
    <article ref={setRefs} className={`bento bento--${item.span} spotlight ${visible ? "is-inview" : ""}`}>
      <div className="bento__demo"><Demo /></div>
      <div className="bento__body">
        <h3>{t(`core.landing.${item.title}`)}</h3>
        <p>{t(`core.landing.${item.body}`)}</p>
      </div>
    </article>
  );
}

function FaqItem({ question, answer, id }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "is-open" : ""}`}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen((value) => !value)}>
          <span>{question}</span>
          <Icons.Plus size={16} aria-hidden="true" />
        </button>
      </h3>
      <div className="faq-panel" id={`${id}-panel`} role="region" aria-hidden={!open}>
        <div><p>{answer}</p></div>
      </div>
    </div>
  );
}

export default function LandingView({ onStart, lang = "es", onLangChange }) {
  const { t } = useI18n();
  const progressRef = useRef(null);

  // Barra de lectura: solo transform, sin recalcular el layout.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = progressRef.current;
      if (!node) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      node.style.transform = `scaleX(${ratio.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="land">
      <div className="land-progress" aria-hidden="true"><span ref={progressRef} /></div>

      <header className="land-header">
        <a className="land-brand" href="#inicio" aria-label="RECORDATE"><Brand light /></a>
        <nav className="land-nav" aria-label={t("core.app.aria.primaryNavigation")}>
          <a href="#caracteristicas">{t("core.landing.features")}</a>
          <a href="#como-funciona">{t("core.landing.howItWorks")}</a>
          <a href="#beneficios">{t("core.landing.benefits")}</a>
          <a href="#preguntas">{t("core.landing.questions")}</a>
          <a href="#manuales">{t("core.landing.manuals")}</a>
        </nav>
        <div className="land-actions">
          <LanguageSwitcher lang={lang} onChange={onLangChange} />
          <button type="button" className="land-signin" onClick={onStart}>{t("core.action.signIn")}</button>
        </div>
      </header>

      <main className="land-main">
        <section className="land-hero" id="inicio">
          <div className="land-hero__copy">
            <Reveal as="p" className="land-kicker" y={8}>{t("core.landing.eyebrow")}</Reveal>
            <h1 className="land-title">{t("core.landing.heroTitle")}</h1>
            <Reveal as="p" className="land-tagline" delay={0.08}>{t("core.landing.heroTagline")}</Reveal>
            <Reveal as="p" className="land-lead" delay={0.14}>{t("core.landing.heroDescription")}</Reveal>
            <Reveal className="land-hero__actions" delay={0.2}>
              <button type="button" className="land-cta" onClick={onStart}>
                {t("core.landing.startNow")}
                <Icons.ArrowRight size={17} aria-hidden="true" />
              </button>
              <a className="land-ghost" href="#como-funciona">{t("core.action.learnMore")}</a>
            </Reveal>
            <Reveal as="p" className="land-note" delay={0.26}>{t("core.landing.demoNote")}</Reveal>
          </div>
          <div className="land-hero__visual">
            <HeroPreview t={t} lang={lang} />
          </div>
        </section>

        <section className="land-statement" id="como-funciona">
          <Reveal as="h2">{t("core.landing.challengeTitle")}</Reveal>
          <Reveal as="p" delay={0.08}>{t("core.landing.challengeBody")}</Reveal>
        </section>

        <section className="land-bento" id="caracteristicas" aria-labelledby="features-title">
          <Reveal as="h2" id="features-title">{t("core.landing.featuresTitle")}</Reveal>
          <div className="bento-grid">
            {FEATURES.map((item) => <BentoTile key={item.key} item={item} t={t} />)}
          </div>
        </section>

        <section className="land-close" id="beneficios">
          <Reveal as="h2">{t("core.landing.benefitTitle")}</Reveal>
          <Reveal delay={0.08}><button type="button" className="land-cta" onClick={onStart}>{t("core.action.openRecordate")}</button></Reveal>
        </section>

        <section className="land-faq" id="preguntas" aria-labelledby="faq-title">
          <Reveal as="h2" id="faq-title">{t("core.landing.questions")}</Reveal>
          <div className="faq-list">
            <FaqItem id="faq-account" question={t("core.landing.faqAccountQ")} answer={t("core.landing.faqAccountA")} />
            <FaqItem id="faq-mobile" question={t("core.landing.faqMobileQ")} answer={t("core.landing.faqMobileA")} />
            <FaqItem id="faq-share" question={t("core.landing.faqShareQ")} answer={t("core.landing.faqShareA")} />
            <FaqItem id="faq-reminders" question={t("core.landing.faqRemindersQ")} answer={t("core.landing.faqRemindersA")} />
          </div>
        </section>

        <section className="land-docs" id="manuales" aria-labelledby="docs-title">
          <Reveal as="h2" id="docs-title">{t("core.landing.docsTitle")}</Reveal>
          <ul>
            {[
              ["MANUAL-DE-USUARIO.md", "manualUser", "manualUserDesc"],
              ["PROJECT-DOCUMENTATION.md", "manualProject", "manualProjectDesc"],
            ].map(([fileName, title, description]) => (
              <li key={fileName}>
                <div>
                  <h3>{t(`core.landing.${title}`)}</h3>
                  <p>{t(`core.landing.${description}`)}</p>
                </div>
                <a
                  className="land-download"
                  href={`${import.meta.env.BASE_URL}docs/${fileName}?v=${import.meta.env.VITE_DOCS_VERSION || "dev"}`}
                  download
                >
                  <Icons.Download size={16} aria-hidden="true" />
                  {t("core.action.downloadMd")}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="land-footer">
        <Brand light />
        <p>{t("core.landing.footerTagline")}</p>
        <p className="land-credit">
          {t("core.landing.createdBy")}{" "}
          <a translate="no" href="https://northboundbrothers.netlify.app/" target="_blank" rel="noopener noreferrer">
            Northbound Brothers
          </a>
        </p>
        <span>© 2026 PPI</span>
      </footer>
    </div>
  );
}