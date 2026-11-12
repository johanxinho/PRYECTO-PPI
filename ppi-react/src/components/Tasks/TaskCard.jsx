// @ts-nocheck
import { Pencil, Trash2, Paperclip, X, Focus } from "lucide-react";
import { useI18n } from "../../i18n";

const localeFor = (lang) => (lang === "en" ? "en-US" : "es-CO");

const formatDate = (date, lang) =>
  new Intl.DateTimeFormat(localeFor(lang), { day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );

const PriorityBadge = ({ priority }) => {
  const { t } = useI18n();
  const labels = { Alta: t("tasks.priority.high"), Media: t("tasks.priority.medium"), Baja: t("tasks.priority.low") };
  const className = `priority-badge priority-${(priority || "Media").toLowerCase()}`;
  return <span className={className}>{labels[priority] || priority}</span>;
};

export default function TaskCard({ task, onToggle, onEdit, onDelete, onFocus, onAttachmentDelete }) {
  const { t, lang } = useI18n();
  const isOverdue = task.date < localDate() || (task.date === localDate() && task.time < localTime());
  const isToday = task.date === localDate();

  const handleToggleComplete = () => {
    onToggle(task);
  };

  return (
    <article className={`task-card ${task.completed ? "completed" : ""} ${isOverdue ? "overdue" : ""} ${isToday ? "today" : ""}`}>
      <header className="task-header">
        <div className="task-main">
          <label className="task-checkbox">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={handleToggleComplete}
              aria-label={t(task.completed ? "tasks.task.markPending" : "tasks.task.markComplete")}
            />
            <span className="task-title" data-completed={task.completed}>
              {task.title}
            </span>
          </label>
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="task-actions">
          <button
            className="icon-button small"
            aria-label={t("tasks.task.focus")}
            title={t("tasks.task.focus")}
            onClick={() => onFocus(task)}
          >
            <Focus size={16} />
          </button>
          <button
            className="icon-button small"
            aria-label={t("tasks.task.edit")}
            title={t("tasks.task.edit")}
            onClick={() => onEdit(task)}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button small"
            aria-label={t("tasks.task.delete")}
            title={t("tasks.task.delete")}
            onClick={() => onDelete(task)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>
      <div className="task-body">
        {task.description && <p className="task-description">{task.description}</p>}
        <div className="task-meta">
          <span className="task-subject">{task.subject}</span>
          <span className="task-datetime">
            {formatDate(task.date, lang)} {t("tasks.task.timeAt", { time: task.time })}
          </span>
          {task.reminder && <span className="task-reminder">\u00a0\u00b7 {t("tasks.task.reminder", { value: task.reminder })}</span>}
        </div>
      </div>
      {task.attachments?.length > 0 && (
        <footer className="task-attachments">
          {task.attachments.map((attachment) => (
            <div className="task-attachment" key={attachment.id || attachment.storage_path}>
              <span>
                <Paperclip size={14} /> {t("tasks.task.viewImage")}
              </span>
              {onAttachmentDelete && (
                <button
                  className="icon-button tiny"
                  aria-label={t("tasks.task.deleteAttachment")}
                  onClick={() => onAttachmentDelete(attachment)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </footer>
      )}
    </article>
  );
}

// Helper functions
function localDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
