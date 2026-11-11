// @ts-nocheck
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../../i18n";
import { TaskList } from "../Tasks";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function CalendarView({ tasks, onFocus, userId, onToggle, onEdit, onDelete, onAttachmentDelete }) {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${month}-${day}`;
  });

  const shiftMonth = (offset) => {
    const next = new Date(year, monthNumber - 1 + offset, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
    setSelected(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`);
  };

  const dayTasks = tasks.filter((task) => task.date === selected);

  return (
    <section className="calendar-view">
      <div className="section-title">
        <div>
          <span className="eyebrow">{t("tasks.calendar.agenda")}</span>
          <h2>{t("tasks.calendar.title")}</h2>
        </div>
        <div className="calendar-controls">
          <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label={t("tasks.calendar.previousMonth")}>
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-month">
            {new Intl.DateTimeFormat(lang === "es" ? "es-CO" : "en-US", { month: "long", year: "numeric" }).format(firstDay)}
          </span>
          <button className="icon-button" onClick={() => shiftMonth(1)} aria-label={t("tasks.calendar.nextMonth")}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="calendar-layout">
        <div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => (
              <span key={day}>{t(`tasks.calendar.weekday.${day}`)}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 }).map((_, index) => (
              <span className="calendar-day calendar-day-empty" key={`empty-${index}`} aria-hidden="true" />
            ))}
            {days.map((day) => (
              <button className={selected === day ? "calendar-day selected" : "calendar-day"} key={day} onClick={() => setSelected(day)}>
                <span>{new Intl.DateTimeFormat(lang === "es" ? "es-CO" : "en-US", { weekday: "short" }).format(new Date(`${day}T12:00:00`))}</span>
                <b>{new Date(`${day}T12:00:00`).getDate()}</b>
                <i className={tasks.some((task) => task.date === day && !task.completed) ? "has-task" : ""} />
              </button>
            ))}
          </div>
        </div>
        <div className="calendar-tasks">
          <TaskList
            title={t("tasks.calendar.tasksFor", { date: new Intl.DateTimeFormat(lang === "es" ? "es-CO" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${selected}T12:00:00`)) })}
            tasks={dayTasks}
            userId={userId}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onFocus={onFocus}
            onAttachmentDelete={onAttachmentDelete}
            empty={t("tasks.calendar.empty")}
          />
        </div>
      </div>
    </section>
  );
}
