// @ts-nocheck
import { useState } from "react";
import { useI18n } from "../../i18n";

export default function TaskForm({ task, assignTarget, onSave, onCancel }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    subject: task?.subject || "",
    date: task?.date || localDate(),
    time: task?.time || "08:00",
    priority: task?.priority || "Media",
    reminder: task?.reminder || "30 minutos antes",
    completed: task?.completed || false,
    timeZone: task?.timeZone || deviceTimeZone(),
  });

  const reminderOptions = [
    ["Al momento", 0],
    ["5 minutos antes", 5 * 60 * 1000],
    ["10 minutos antes", 10 * 60 * 1000],
    ["30 minutos antes", 30 * 60 * 1000],
    ["1 hora antes", 60 * 60 * 1000],
    ["3 horas antes", 3 * 60 * 60 * 1000],
    ["12 horas antes", 12 * 60 * 60 * 1000],
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
          <label htmlFor="task-title">{t("tasks.form.title")}</label>
          <input
            id="task-title"
            autoFocus
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder={t("tasks.form.titlePlaceholder")}
            maxLength={120}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="task-subject">{t("tasks.form.subject")}</label>
          <input
            id="task-subject"
            value={form.subject}
            onChange={(event) => update("subject", event.target.value)}
            placeholder={t("tasks.form.subjectPlaceholder")}
            maxLength={60}
            required
          />
        </div>
        <div className="form-group full-width">
          <label htmlFor="task-description">{t("tasks.form.description")}</label>
          <textarea
            id="task-description"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder={t("tasks.form.descriptionPlaceholder")}
            rows={3}
            maxLength={500}
          />
          <span className="char-count">{form.description.length}/500</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-date">{t("tasks.form.date")}</label>
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
            <label htmlFor="task-time">{t("tasks.form.time")}</label>
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
            <label htmlFor="task-priority">{t("tasks.form.priority")}</label>
            <select
              id="task-priority"
              value={form.priority}
              onChange={(event) => update("priority", event.target.value)}
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`tasks.priority.${option === "Alta" ? "high" : option === "Media" ? "medium" : "low"}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="task-reminder">{t("tasks.form.reminder")}</label>
            <select
              id="task-reminder"
              value={form.reminder}
              onChange={(event) => update("reminder", event.target.value)}
            >
              {reminderOptions.map(([label]) => (
                <option key={label} value={label}>
                  {label === "Al momento" ? t("tasks.form.reminderNow") : label.startsWith("5 ") || label.startsWith("10 ") || label.startsWith("30 ") ? t("tasks.form.reminderMinutes", { count: Number.parseInt(label) }) : label.startsWith("1 hora") ? t("tasks.form.reminderHour", { count: 1 }) : label.startsWith("3 ") || label.startsWith("12 ") ? t("tasks.form.reminderHours", { count: Number.parseInt(label) }) : t("tasks.form.reminderDay")}
                </option>
              ))}
            </select>
          </div>
        </div>
        {assignTarget && (
          <div className="form-group">
            <label>{t("tasks.form.assignedTo", { name: assignTarget.full_name || assignTarget.email })}</label>
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="text-button" onClick={onCancel}>
            {t("tasks.form.cancel")}
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!canSave}
          >
            {task ? t("tasks.form.save") : t("tasks.form.create")}
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

function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota";
  } catch {
    return "America/Bogota";
  }
}
