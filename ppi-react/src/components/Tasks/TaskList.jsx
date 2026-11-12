// @ts-nocheck
import { ListTodo } from "lucide-react";
import { useI18n } from "../../i18n";
import PriorityBadge from "./PriorityBadge";
import TaskCard from "./TaskCard";

const localeFor = (lang) => (lang === "en" ? "en-US" : "es-CO");

const formatDate = (date, lang) =>
  new Intl.DateTimeFormat(localeFor(lang), { day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );

export default function TaskList({
  tasks,
  title,
  subtitle,
  empty,
  userId,
  compact = false,
  focusOnly = false,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  onAttachmentDelete,
}) {
  const { t, lang } = useI18n();
  return (
    <section className={`task-list-section ${compact ? "compact-list" : ""}`}>
      {title && (
        <div className="section-title">
          <div>
            <span className="eyebrow">{title}</span>
            <h2>{subtitle}</h2>
          </div>
        </div>
      )}
      {tasks.length ? (
        <div className="tasks">
          {tasks.map((task) =>
            focusOnly ? (
              <button className="focus-choice" key={task.id} onClick={() => onFocus(task)}>
                <span className="focus-choice-icon"><ListTodo size={18} /></span>
                <span>
                  <b>{task.title}</b>
                  <small>{task.subject} \u00b7 {formatDate(task.date, lang)} \u00b7 {task.time}</small>
                </span>
                <PriorityBadge priority={task.priority} />
              </button>
            ) : (
              <TaskCard
                key={task.id}
                task={task}
                userId={userId}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onFocus={onFocus}
                onAttachmentDelete={onAttachmentDelete}
              />
            ),
          )}
        </div>
      ) : (
        <div className="empty-state">
          <ListTodo size={28} />
          <h3>{empty || t("tasks.list.emptyDefault")}</h3>
          <p>{t("tasks.list.emptyHint")}</p>
        </div>
      )}
    </section>
  );
}
