// @ts-nocheck
import { CalendarDays, ArrowRight, ListTodo } from "lucide-react";
import Stats from "./Stats";
import QuickActions from "./QuickActions";
import { TaskList } from "../Tasks";

const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DashboardView({
  profile,
  tasks,
  stats,
  onNewTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onFocusTask,
  onNavigate,
}) {
  const todayTasks = tasks.filter(
    (task) => task.date === localDate() && !task.completed,
  );
  const recentTasks = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
    .slice(0, 3);

  return (
    <main className="dashboard-view">
      {/* Bienvenida */}
      <header className="welcome-header">
        <div className="welcome-content">
          <span className="eyebrow">Bienvenido a RECORDATE</span>
          <h1>
            {profile?.full_name || "Estudiante"}, ¡vamos a organizar tu d\u00eda!
          </h1>
          <p>Administra tus actividades acad\u00e9micas de manera sencilla y efectiva.</p>
        </div>
      </header>

      {/* Estad\u00edsticas */}
      <Stats stats={stats} />

      {/* Acciones r\u00e1pidas */}
      <QuickActions
        onNewTask={onNewTask}
        onFocus={() => onNavigate("Modo enfoque")}
        onMessages={() => onNavigate("Mensajes")}
      />

      {/* Tareas de hoy */}
      {todayTasks.length > 0 && (
        <TaskList
          title="Hoy"
          subtitle="Tus actividades para hoy"
          tasks={todayTasks}
          userId={profile?.id}
          onToggle={onToggleTask}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onFocus={onFocusTask}
          compact
        />
      )}

      {/* Pr\u00f3ximas tareas */}
      {recentTasks.length > 0 && (
        <TaskList
          title="Pr\u00f3ximamente"
          subtitle="Tus pr\u00f3ximas actividades"
          tasks={recentTasks}
          userId={profile?.id}
          onToggle={onToggleTask}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onFocus={onFocusTask}
          empty="No hay actividades pr\u00f3ximas"
          compact
        />
      )}

      {/* Navegaci\u00f3n r\u00e1pida */}
      <section className="dashboard-nav">
        <button className="nav-card" onClick={() => onNavigate("Mis tareas")}>
          <ListTodo size={24} />
          <span>Ver todas las tareas</span>
          <ArrowRight size={16} />
        </button>
        <button className="nav-card" onClick={() => onNavigate("Calendario")}>
          <CalendarDays size={24} />
          <span>Ver calendario completo</span>
          <ArrowRight size={16} />
        </button>
      </section>
    </main>
  );
}
