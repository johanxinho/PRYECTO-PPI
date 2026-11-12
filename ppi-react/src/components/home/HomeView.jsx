import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { useI18n } from "../../i18n";
import { taskDueAtMs } from "../../services/alarmSchedule";
import { firstName, subjectColor } from "../../lib/subject";
import { m, AnimatePresence, AnimatedNumber, useSpotlight, useMagnetic } from "../../motion/kit";

const localeFor = (lang) => (lang === "en" ? "en-US" : "es-CO");

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "hidden") setNow(Date.now());
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
  return now;
}

function relativeLabel(task, now, t, lang) {
  const due = taskDueAtMs(task);
  if (!Number.isFinite(due)) return "";
  const minutes = Math.ceil((due - now) / 60_000);
  if (minutes < 0) return t("core.app.dashboard.overdue");
  const amount = minutes < 60
    ? [Math.max(1, minutes), "minute"]
    : minutes < 1_440
      ? [Math.ceil(minutes / 60), "hour"]
      : [Math.ceil(minutes / 1_440), "day"];
  return new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "auto" }).format(amount[0], amount[1]);
}

function greeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t("core.app.greeting.morning");
  if (hour < 18) return t("core.app.greeting.afternoon");
  return t("core.app.greeting.evening");
}

function TaskLine({ task, lang, onOpen, onToggle, onEdit, onDelete, onFocus }) {
  const { t } = useI18n();
  const color = subjectColor(task.subject);
  const high = task.priority === "Alta";
  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`today-line ${task.completed ? "is-done" : ""}`}
      style={{ "--tone": color }}
    >
      <time className="num today-line__time" dateTime={`${task.date}T${task.time}`}>{task.time}</time>
      <button
        type="button"
        className="today-line__check"
        aria-label={task.completed ? t("core.taskCard.markPending") : t("core.taskCard.markComplete")}
        aria-pressed={task.completed}
        onClick={() => onToggle(task.id)}
      >
        {task.completed ? <Icons.Check size={12} aria-hidden="true" /> : null}
      </button>
      <button type="button" className="today-line__body" onClick={() => onOpen(task)}>
        <span className={`today-line__title ${high ? "is-high" : ""}`}>{task.title}</span>
        <span className="today-line__meta">
          {task.subject}
          {high ? <span className="today-line__flag">{t("core.app.home.priorityHigh")}</span> : null}
        </span>
      </button>
      <div className="today-line__actions">
        <button type="button" aria-label={t("core.taskCard.openFocus")} title={t("core.taskCard.focus")} onClick={() => onFocus(task)}>
          <Icons.Focus size={15} aria-hidden="true" />
        </button>
        <button type="button" aria-label={t("core.taskCard.edit")} title={t("core.taskCard.edit")} onClick={() => onEdit(task)}>
          <Icons.Pencil size={15} aria-hidden="true" />
        </button>
        <button type="button" aria-label={t("core.taskCard.delete")} title={t("core.taskCard.delete")} onClick={() => onDelete(task)}>
          <Icons.Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </m.li>
  );
}

export default function HomeView({
  userName,
  tasks,
  pending,
  nextTask,
  dayTasks,
  progress,
  weekDays,
  selectedDate,
  onSelectDate,
  query,
  onQuery,
  onNew,
  onOpen,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  onNavigate,
  today,
}) {
  const { t, lang } = useI18n();
  const now = useNow();
  const spotlightRef = useSpotlight();
  const magnetic = useMagnetic(4);
  const dateLabel = new Intl.DateTimeFormat(localeFor(lang), { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const name = firstName(userName);

  const todayAll = tasks.filter((task) => task.date === today);
  const doneToday = todayAll.filter((task) => task.completed).length;
  const pendingTotal = pending.length;
  const completedTotal = tasks.filter((task) => task.completed).length;
  const undated = tasks.filter((task) => !task.completed && !task.date).slice(0, 3);
  const undatedCount = pending.filter((task) => !task.date).length;

  return (
    <div className="home">
      <header className="home-head">
        <div className="home-head__text">
          <p className="home-date">{dateLabel}</p>
          <h1 className="home-greeting">{greeting(t)}, {name}</h1>
        </div>
        <button type="button" className="home-cta" onClick={onNew}>
          <Icons.Plus size={17} aria-hidden="true" />
          {t("core.app.dashboard.newActivity")}
        </button>
      </header>

      <div className="home-grid">
        <div className="home-main">
          <section className="nextup-wrap" aria-labelledby="nextup-title">
            {nextTask ? (
              <article ref={spotlightRef} className="nextup spotlight" style={{ "--tone": subjectColor(nextTask.subject) }}>
                <span className="nextup__tab" aria-hidden="true" />
                <p className="nextup__label">{t("core.app.home.nextLabel")}</p>
                <h2 id="nextup-title" className="nextup__title">{nextTask.title}</h2>
                <p className="nextup__meta">
                  <span>{nextTask.subject}</span>
                  <span aria-hidden="true">·</span>
                  <time className="num" dateTime={`${nextTask.date}T${nextTask.time}`}>
                    {new Intl.DateTimeFormat(localeFor(lang), { day: "numeric", month: "short" }).format(new Date(`${nextTask.date}T12:00:00`))}, {nextTask.time}
                  </time>
                  <span aria-hidden="true">·</span>
                  <strong className="num">{relativeLabel(nextTask, now, t, lang)}</strong>
                </p>
                <div className="nextup__actions">
                  <m.button
                    type="button"
                    className="nextup__primary"
                    style={magnetic.style}
                    onPointerMove={magnetic.onPointerMove}
                    onPointerLeave={magnetic.onPointerLeave}
                    onClick={() => onOpen(nextTask)}
                  >
                    {t("core.app.dashboard.openNext")}
                  </m.button>
                  <button type="button" className="nextup__ghost" onClick={() => onToggle(nextTask.id)}>
                    <Icons.Check size={15} aria-hidden="true" />
                    {t("core.app.dashboard.completeNext")}
                  </button>
                </div>
              </article>
            ) : (
              <div className="nextup nextup--empty">
                <p className="nextup__label">{t("core.app.home.nextLabel")}</p>
                <p className="nextup__emptyText">{t("core.app.home.emptyNext")}</p>
                <button type="button" className="nextup__ghost" onClick={onNew}>
                  {t("core.app.home.addActivity")}
                </button>
              </div>
            )}
          </section>

          <section className="home-today" aria-labelledby="today-title">
            <header className="home-section-head">
              <h2 id="today-title">{t("core.app.home.today")}</h2>
              <p className="num home-count">
                {todayAll.length === 1
                  ? t("core.app.home.doneOfOne", { done: doneToday })
                  : t("core.app.home.doneOf", { done: doneToday, total: todayAll.length })}
              </p>
            </header>

            <div
              className="today-segments"
              role="img"
              aria-label={t("core.app.home.progressLine", { percent: progress })}
            >
              {todayAll.map((task) => (
                <span
                  key={task.id}
                  className={`today-segment ${task.completed ? "is-filled" : ""}`}
                  style={{ "--tone": subjectColor(task.subject) }}
                />
              ))}
            </div>
            <p className="today-progress">
              <strong className="num"><AnimatedNumber value={progress} suffix=" %" /></strong> {t("core.app.dashboard.progressCaption")}
            </p>

            <div className="home-search">
              <Icons.Search size={16} aria-hidden="true" />
              <input
                type="search"
                aria-label={t("core.app.dashboard.searchTasks")}
                placeholder={t("core.app.dashboard.searchTasks")}
                value={query}
                onChange={(event) => onQuery(event.target.value)}
              />
            </div>

            {dayTasks.length ? (
              <ul className="today-list">
                <AnimatePresence initial={false}>
                {dayTasks.map((task) => (
                  <TaskLine
                    key={task.id}
                    task={task}
                    lang={lang}
                    onOpen={onOpen}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onFocus={onFocus}
                  />
                ))}
                </AnimatePresence>
              </ul>
            ) : (
              <p className="home-quiet">{t("core.app.home.todayEmpty")}</p>
            )}

            <p className="home-figures">
              <span className="num">{pendingTotal}</span> {t("core.app.home.summaryPendingLabel")}
              <span aria-hidden="true">·</span>
              <span className="num">{completedTotal}</span> {t("core.app.home.summaryCompletedLabel")}
            </p>
          </section>
        </div>

        <aside className="home-side">
          <section className="home-week" aria-labelledby="week-title">
            <header className="home-section-head">
              <h2 id="week-title">{t("core.app.home.weekTitle")}</h2>
              <button type="button" className="home-textlink" onClick={() => onNavigate("Calendario")}>
                {t("core.app.dashboard.openCalendar")}
              </button>
            </header>
            <div className="week-row">
              {weekDays.map((day) => {
                const date = new Date(`${day}T12:00:00`);
                const daySubjects = [...new Set(pending.filter((task) => task.date === day).map((task) => task.subject))].slice(0, 3);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`week-cell ${selectedDate === day ? "is-selected" : ""} ${day === today ? "is-today" : ""}`}
                    aria-pressed={selectedDate === day}
                    aria-label={new Intl.DateTimeFormat(localeFor(lang), { weekday: "long", day: "numeric", month: "long" }).format(date)}
                    onClick={() => onSelectDate(day)}
                  >
                    <span className="week-cell__day">{new Intl.DateTimeFormat(localeFor(lang), { weekday: "narrow" }).format(date)}</span>
                    <span className="week-cell__num num">{date.getDate()}</span>
                    {selectedDate === day && (
                      <m.span
                        layoutId="week-indicator"
                        className="week-cell__indicator"
                        transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="week-cell__dots" aria-hidden="true">
                      {daySubjects.map((subject) => (
                        <i key={subject} style={{ background: subjectColor(subject) }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="home-undated" aria-labelledby="undated-title">
            <header className="home-section-head">
              <h2 id="undated-title">{t("core.app.home.undatedTitle")}</h2>
              {undatedCount ? <span className="num home-count">{undatedCount}</span> : null}
            </header>
            {undated.length ? (
              <ul className="undated-list">
                {undated.map((task) => (
                  <li key={task.id}>
                    <button type="button" onClick={() => onOpen(task)}>
                      <i aria-hidden="true" style={{ background: subjectColor(task.subject) }} />
                      <span>{task.title}</span>
                      <small>{task.subject}</small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-quiet">{t("core.app.home.allDated")}</p>
            )}
          </section>

          <nav className="home-links" aria-label={t("core.app.home.goTo")}>
            <p className="home-links__label">{t("core.app.home.goTo")}</p>
            <button type="button" onClick={() => onNavigate("Mis tareas")}>{t("core.app.nav.items.tasks")}</button>
            <button type="button" onClick={() => onNavigate("Calendario")}>{t("core.app.nav.items.calendar")}</button>
            <button type="button" onClick={() => onNavigate("Recordatorios")}>{t("core.app.nav.items.reminders")}</button>
          </nav>
        </aside>
      </div>
    </div>
  );
}
