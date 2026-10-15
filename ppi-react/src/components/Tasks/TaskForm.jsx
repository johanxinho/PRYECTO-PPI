// @ts-nocheck
import { useState } from "react";

export default function TaskForm({ task, assignTarget, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    subject: task?.subject || "",
    date: task?.date || localDate(),
    time: task?.time || "08:00",
    priority: task?.priority || "Media",
    reminder: task?.reminder || "30 minutos antes",
    completed: task?.completed || false,
  });

  const reminderOptions = [
    ["Al momento", 0],
    ["5 minutos antes", 5 * 60 * 1000],
    ["10 minutos antes", 10 * 60 * 1000],
    ["30 minutos antes", 30 * 60 * 1000],
    ["1 hora antes", 60 * 60 * 1000],
    ["3 horas antes", 3 * 60 * 60 * 1000],
    ["12 horas antes", 12 * 60 * 60 * 1000],
    ["24 horas antes", 24 * 60 * 60 * 1000],
    ["1 d\u00eda antes", 24 * 60 * 60 * 1000],
  ];

  const priorityOptions = ["Alta", "Media", "Baja"];

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      id: task?.id,
      assignedBy: assignTarget?.id || null,
    });
  };

  const canSave = form.title.trim() && form.subject.trim();

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="task-title">T\u00edtulo *</label>
          <input
            id="task-title"
            autoFocus
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Ej. Entrega de taller"
            maxLength={120}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="task-subject">Asignatura *</label>
          <input
            id="task-subject"
            value={form.subject}
            onChange={(event) => update("subject", event.target.value)}
            placeholder="Ej. Matem\u00e1ticas"
            maxLength={60}
            required
          />
        </div>
        <div className="form-group full-width">
          <label htmlFor="task-description">Descripci\u00f3n (opcional)</label>
          <textarea
            id="task-description"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Ej. Resolver los ejercicios 4 a 9 y adjuntar el procedimiento."
            rows={3}
            maxLength={500}
          />
          <span className="char-count">{form.description.length}/500</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-date">Fecha</label>
            <input
              id="task-date"
              type="date"
              value={form.date}
              onChange={(event) => update("date", event.target.value)}
              min={localDate()}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-time">Hora</label>
            <input
              id="task-time"
              type="time"
              value={form.time}
              onChange={(event) => update("time", event.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-priority">Prioridad</label>
            <select
              id="task-priority"
              value={form.priority}
              onChange={(event) => update("priority", event.target.value)}
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="task-reminder">Recordatorio</label>
            <select
              id="task-reminder"
              value={form.reminder}
              onChange={(event) => update("reminder", event.target.value)}
            >
              {reminderOptions.map(([label]) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {assignTarget && (
          <div className="form-group">
            <label>Asignado a: {assignTarget.full_name || assignTarget.email}</label>
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="text-button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!canSave}
          >
            {task ? "Guardar cambios" : "Crear actividad"}
          </button>
        </div>
      </div>
    </form>
  );
}

// Helper function
function localDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
