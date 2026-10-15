// @ts-nocheck
import { ListTodo } from "lucide-react";
import PriorityBadge from "./PriorityBadge";
import TaskCard from "./TaskCard";

const formatDate = (date) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );

export default function TaskList({
  tasks,
  title,
  subtitle,
  empty = "No hay actividades registradas.",
  userId,
  compact = false,
  focusOnly = false,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  onAttachmentDelete,
}) {
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
                  <small>{task.subject} \u00b7 {formatDate(task.date)} \u00b7 {task.time}</small>
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
          <h3>{empty}</h3>
          <p>Las actividades que agregues aparecer\u00e1n aqu\u00ed.</p>
        </div>
      )}
    </section>
  );
}
