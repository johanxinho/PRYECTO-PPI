// @ts-nocheck
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TaskList } from "../Tasks";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function CalendarView({ tasks, onFocus, userId, onToggle, onEdit, onDelete, onAttachmentDelete }) {
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
          <span className="eyebrow">Vista de agenda</span>
          <h2>Calendario acad\u00e9mico</h2>
        </div>
        <div className="calendar-controls">
          <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-month">
            {new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(firstDay)}
          </span>
          <button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="calendar-layout">
        <div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["Lun", "Mar", "Mi\u00e9", "Jue", "Vie", "S\u00e1b", "Dom"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 }).map((_, index) => (
              <span className="calendar-day calendar-day-empty" key={`empty-${index}`} aria-hidden="true" />
            ))}
            {days.map((day) => (
              <button className={selected === day ? "calendar-day selected" : "calendar-day"} key={day} onClick={() => setSelected(day)}>
                <span>{new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(new Date(`${day}T12:00:00`))}</span>
                <b>{new Date(`${day}T12:00:00`).getDate()}</b>
                <i className={tasks.some((task) => task.date === day && !task.completed) ? "has-task" : ""} />
              </button>
            ))}
          </div>
        </div>
        <div className="calendar-tasks">
          <TaskList
            title={`Tareas para ${new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${selected}T12:00:00`))}`}
            tasks={dayTasks}
            userId={userId}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onFocus={onFocus}
            onAttachmentDelete={onAttachmentDelete}
            empty="No hay actividades para este d\u00eda"
          />
        </div>
      </div>
    </section>
  );
}

// Add useState import
import { useState } from "react";
