import { useEffect, useMemo, useState } from "react";
import Login from "./components/Login";
import { hasSupabaseConfig, supabase } from "./supabaseClient";
import {
  createTask,
  deleteTask,
  ensureProfile,
  listTasks,
  listMessages,
  sendMessage,
  shareTask,
  subscribeToMessages,
  updateProfileSettings,
  updateTask,
} from "./dataService";
import "./App.css";

const navItems = [
  "Inicio",
  "Mis tareas",
  "Calendario",
  "Recordatorios",
  "Prioridades",
  "Modo enfoque",
  "Compartir agendas",
  "Mensajes",
];
const today = new Date().toISOString().slice(0, 10);
const formatDate = (date) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">R</span>
      <span>RECORDATE</span>
    </div>
  );
}
function Landing({ onStart }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <nav className="landing-nav">
          <a href="#caracteristicas">Características</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#beneficios">Beneficios</a>
          <a href="#preguntas">Preguntas frecuentes</a>
        </nav>
        <button className="outline-button" onClick={onStart}>
          Iniciar sesión
        </button>
      </header>
      <section className="hero" id="inicio">
        <div className="hero-copy">
          <span className="eyebrow accent-label">
            PPI · IE La Candelaria · Grado 11
          </span>
          <h1>
            Organiza tus actividades. <em>Recuerda lo importante.</em>
          </h1>
          <p>
            RECORDATE te ayuda a organizar tus tareas, trabajos y actividades
            académicas para que no olvides ninguna fecha importante.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onStart}>
              Comenzar ahora <span>→</span>
            </button>
            <a className="text-button" href="#como-funciona">
              Conocer más <span>↓</span>
            </a>
          </div>
          <p className="demo-note">
            Puedes explorar la experiencia con el acceso DEMO.
          </p>
        </div>
        <DashboardPreview />
      </section>
      <section className="problem-band" id="como-funciona">
        <div>
          <span className="eyebrow">El reto del día a día</span>
          <h2>Menos olvido. Más control sobre tu tiempo.</h2>
        </div>
        <p>
          Cuando se acumulan tareas, trabajos y fechas importantes, priorizar se
          vuelve difícil. RECORDATE convierte esa carga en una agenda clara,
          pensada para estudiantes de la IE La Candelaria.
        </p>
      </section>
      <section className="feature-section" id="caracteristicas">
        <div className="section-heading">
          <span className="eyebrow accent-label">Todo en un mismo lugar</span>
          <h2>Una herramienta hecha para tu ritmo académico.</h2>
        </div>
        <div className="feature-grid">
          {[
            [
              "01",
              "Registra tus actividades",
              "Crea tareas con materia, fecha, hora, descripción y prioridad.",
            ],
            [
              "02",
              "Recibe recordatorios",
              "Configura avisos para llegar a tiempo a cada entrega.",
            ],
            [
              "03",
              "Concéntrate mejor",
              "El modo enfoque deja frente a ti una sola actividad.",
            ],
            [
              "04",
              "Coordina con tu equipo",
              "Comparte agendas y conversa con tus compañeros.",
            ],
            [
              "05",
              "Encuentra rápido",
              "Busca por título o materia en tiempo real.",
            ],
            [
              "06",
              "Marca tu avance",
              "Completa actividades y visualiza tu progreso real.",
            ],
          ].map(([number, title, description]) => (
            <article className="feature-item" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="benefit-band" id="beneficios">
        <div>
          <span className="eyebrow">Una idea del PPI hecha producto</span>
          <h2>Claridad para estudiar. Tranquilidad para avanzar.</h2>
        </div>
        <button className="primary-button" onClick={onStart}>
          Abrir RECORDATE <span>↗</span>
        </button>
      </section>
      <footer className="landing-footer" id="preguntas">
        <Brand />
        <p>
          Sistema de recordatorio de actividades académicas · Medellín,
          Antioquia
        </p>
        <span>© 2026 PPI</span>
      </footer>
    </div>
  );
}
function DashboardPreview() {
  return (
    <div className="dashboard-preview">
      <div className="preview-top">
        <span className="mini-mark">R</span>
        <span>Mi agenda</span>
        <span className="preview-avatar">A</span>
      </div>
      <div className="preview-body">
        <div className="preview-sidebar">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="preview-main">
          <span className="preview-kicker">HOY · MARTES 25</span>
          <strong>Buenos días, Andrea</strong>
          <div className="preview-stats">
            <span>
              <b>4</b>Pendientes
            </span>
            <span>
              <b>2</b>Para hoy
            </span>
          </div>
          <div className="preview-task">
            <span className="task-dot green" />
            <div>
              <b>Entrega de taller</b>
              <small>Matemáticas · 4:00 PM</small>
            </div>
            <em>Alta</em>
          </div>
          <div className="preview-task">
            <span className="task-dot gold" />
            <div>
              <b>Lectura de ciencias</b>
              <small>Ciencias sociales · Sáb 10:00 AM</small>
            </div>
            <em>Media</em>
          </div>
        </div>
      </div>
    </div>
  );
}
function TaskForm({ task, onSave, onCancel }) {
  const [form, setForm] = useState(
    task || {
      title: "",
      subject: "",
      date: "",
      time: "",
      priority: "Media",
      description: "",
      reminder: "30 minutos antes",
    },
  );
  const [error, setError] = useState("");
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (
      !form.title.trim() ||
      !form.subject.trim() ||
      !form.date ||
      !form.time
    ) {
      setError(
        "Completa título, materia, fecha y hora para guardar la actividad.",
      );
      return;
    }
    onSave({
      ...form,
      id: task?.id || Date.now(),
      completed: task?.completed || false,
    });
  };
  return (
    <form className="task-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <label>
          Título
          <input
            autoFocus
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Ej. Entrega de taller"
          />
        </label>
        <label>
          Materia
          <input
            value={form.subject}
            onChange={(event) => update("subject", event.target.value)}
            placeholder="Ej. Matemáticas"
          />
        </label>
        <label>
          Fecha
          <input
            type="date"
            value={form.date}
            onChange={(event) => update("date", event.target.value)}
          />
        </label>
        <label>
          Hora
          <input
            type="time"
            value={form.time}
            onChange={(event) => update("time", event.target.value)}
          />
        </label>
        <label>
          Prioridad
          <select
            value={form.priority}
            onChange={(event) => update("priority", event.target.value)}
          >
            <option>Alta</option>
            <option>Media</option>
            <option>Baja</option>
          </select>
        </label>
        <label>
          Recordatorio
          <select
            value={form.reminder}
            onChange={(event) => update("reminder", event.target.value)}
          >
            <option>Al momento</option>
            <option>30 minutos antes</option>
            <option>1 día antes</option>
          </select>
        </label>
      </div>
      <label>
        Descripción
        <textarea
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          rows="3"
          placeholder="Agrega detalles para recordar qué debes hacer..."
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="primary-button" type="submit">
          {task ? "Guardar cambios" : "Crear tarea"}
        </button>
        <button className="text-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
function PriorityBadge({ priority }) {
  return (
    <span className={`priority priority-${priority.toLowerCase()}`}>
      {priority}
    </span>
  );
}
function TaskCard({ task, onToggle, onEdit, onDelete, onFocus }) {
  return (
    <article className={`task-card ${task.completed ? "is-complete" : ""}`}>
      <button
        className="check-button"
        aria-label={
          task.completed ? "Marcar como pendiente" : "Marcar como completada"
        }
        onClick={() => onToggle(task.id)}
      >
        {task.completed ? "✓" : ""}
      </button>
      <div className="task-content">
        <div className="task-heading">
          <h3>{task.title}</h3>
          <PriorityBadge priority={task.priority} />
        </div>
        <p className="task-meta">
          {task.subject} <span>·</span> {formatDate(task.date)} <span>·</span>{" "}
          {task.time}
        </p>
        {task.description && (
          <p className="task-description">{task.description}</p>
        )}
      </div>
      <div className="task-actions">
        <button
          className="icon-button"
          aria-label="Abrir modo enfoque"
          title="Modo enfoque"
          onClick={() => onFocus(task)}
        >
          ◎
        </button>
        <button
          className="icon-button"
          aria-label="Editar tarea"
          title="Editar tarea"
          onClick={() => onEdit(task)}
        >
          ✎
        </button>
        <button
          className="icon-button danger"
          aria-label="Eliminar tarea"
          title="Eliminar tarea"
          onClick={() => onDelete(task.id)}
        >
          ×
        </button>
      </div>
    </article>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("landing");
  const [view, setView] = useState("Inicio");
  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [focusTask, setFocusTask] = useState(null);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shared, setShared] = useState([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const privatePaths = [
      "/dashboard",
      "/tareas",
      "/calendario",
      "/recordatorios",
      "/enfoque",
      "/compartir",
      "/mensajes",
      "/perfil",
      "/configuracion",
    ];
    const routeViews = { "/dashboard": "Inicio", "/tareas": "Mis tareas", "/calendario": "Calendario", "/recordatorios": "Recordatorios", "/enfoque": "Modo enfoque", "/compartir": "Compartir agendas", "/mensajes": "Mensajes", "/perfil": "Perfil", "/configuracion": "Configuración" };
    const handleRoute = () => {
      if (privatePaths.includes(window.location.pathname)) {
        setView(routeViews[window.location.pathname]);
        setScreen(session ? "app" : "auth");
      }
      if (window.location.pathname === "/login" && session) setScreen("app");
    };
    handleRoute();
    window.addEventListener("popstate", handleRoute);
    return () => window.removeEventListener("popstate", handleRoute);
  }, [session]);
  const loadUserData = async (current) => {
    if (!current) {
      setProfile(null);
      setTasks([]);
      return;
    }
    try {
      const [currentProfile, currentTasks] = await Promise.all([
        ensureProfile(current.user),
        listTasks(),
      ]);
      setProfile(currentProfile);
      setTasks(currentTasks);
      setScreen("app");
    } catch {
      setNotice(
        "No fue posible cargar tu agenda. Verifica la configuración de Supabase.",
      );
    }
  };
  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      loadUserData(current);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, current) => {
        setSession(current);
        loadUserData(current);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!profile?.reminders_enabled || !("Notification" in window) || Notification.permission !== "granted") return undefined;
    const timers = tasks.filter((task) => !task.completed).map((task) => {
      const offsets = { "Al momento": 0, "30 minutos antes": 30 * 60 * 1000, "1 día antes": 24 * 60 * 60 * 1000 };
      const dueAt = new Date(`${task.date}T${task.time}`).getTime() - (offsets[task.reminder] || 0);
      const delay = dueAt - Date.now();
      if (delay <= 0 || delay > 2147483647) return null;
      return window.setTimeout(() => new Notification("Recordatorio de RECORDATE", { body: `${task.title} · ${task.subject}` }), delay);
    }).filter(Boolean);
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [profile?.reminders_enabled, tasks]);
  const userName =
    profile?.full_name || session?.user?.email?.split("@")[0] || "estudiante";
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) =>
        `${task.title} ${task.subject}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [tasks, query],
  );
  const pending = tasks.filter((task) => !task.completed);
  const stats = {
    pending: pending.length,
    today: pending.filter((task) => task.date === today).length,
    high: pending.filter((task) => task.priority === "Alta").length,
    done: tasks.filter((task) => task.completed).length,
  };
  const saveTask = async (task) => {
    try {
      const saved = task.id ? await updateTask(task) : await createTask(task);
      setTasks((current) =>
        task.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setShowForm(false);
      setEditingTask(null);
      setNotice("Actividad guardada correctamente.");
    } catch {
      setNotice("No fue posible guardar la actividad.");
    }
  };
  const removeTask = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta tarea?")) return;
    try {
      await deleteTask(id);
      setTasks((current) => current.filter((task) => task.id !== id));
      setNotice("Actividad eliminada.");
    } catch {
      setNotice("No fue posible eliminar la actividad.");
    }
  };
  const toggleTask = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    try {
      const updated = await updateTask({ ...task, completed: !task.completed });
      setTasks((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setFocusTask((current) => (current?.id === id ? updated : current));
    } catch {
      setNotice("No fue posible actualizar la actividad.");
    }
  };
  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setTasks([]);
    setScreen("landing");
  };
  const navigate = (nextView) => {
    setView(nextView);
    const route = { Inicio: "/dashboard", "Mis tareas": "/tareas", Calendario: "/calendario", Recordatorios: "/recordatorios", Prioridades: "/prioridades", "Modo enfoque": "/enfoque", "Compartir agendas": "/compartir", Mensajes: "/mensajes", Perfil: "/perfil", Configuración: "/configuracion" }[nextView];
    if (route && window.location.pathname !== route) window.history.pushState({}, "", route);
    setMobileNav(false);
    setFocusTask(null);
  };
  if (screen === "landing")
    return <Landing onStart={() => setScreen("auth")} />;
  if (!session)
    return (
      <Login
        onLogin={(nextSession) => {
          setSession(nextSession);
          loadUserData(nextSession);
        }}
        onBack={() => setScreen("landing")}
      />
    );
  const renderMain = () => {
    if (focusTask)
      return (
        <section className="focus-panel">
          <div className="focus-orbit">◎</div>
          <span className="eyebrow accent-label">Modo enfoque</span>
          <h2>{focusTask.title}</h2>
          <p className="task-meta">
            {focusTask.subject} · {formatDate(focusTask.date)} ·{" "}
            {focusTask.time}
          </p>
          <p>
            {focusTask.description ||
              "Concéntrate en completar esta actividad."}
          </p>
          <div className="focus-status">
            <PriorityBadge priority={focusTask.priority} />
            <span>
              {focusTask.completed
                ? "Actividad completada"
                : "Pendiente de completar"}
            </span>
          </div>
          <button className="primary-button" onClick={() => setFocusTask(null)}>
            Salir del modo enfoque
          </button>
        </section>
      );
    if (view === "Calendario")
      return <Calendar tasks={tasks} onSelect={setFocusTask} />;
    if (view === "Mis tareas")
      return (
        <>
          <section className="section-title">
            <div>
              <span className="eyebrow">Tu agenda completa</span>
              <h2>Mis tareas</h2>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                setEditingTask(null);
                setShowForm(true);
              }}
            >
              + Nueva actividad
            </button>
          </section>
          <TaskList
            tasks={visibleTasks}
            onToggle={toggleTask}
            onEdit={(task) => {
              setEditingTask(task);
              setShowForm(true);
            }}
            onDelete={removeTask}
            onFocus={setFocusTask}
            empty="No tienes actividades registradas."
          />
        </>
      );
    if (view === "Recordatorios")
      return (
        <TaskList
          title="Recordatorios"
          subtitle="Las próximas fechas que merecen tu atención."
          tasks={pending}
          onToggle={toggleTask}
          onEdit={(task) => {
            setEditingTask(task);
            setShowForm(true);
          }}
          onDelete={removeTask}
          onFocus={setFocusTask}
          empty="No tienes recordatorios pendientes."
        />
      );
    if (view === "Prioridades")
      return (
        <TaskList
          title="Prioridades"
          subtitle="Ordena tu energía empezando por lo más importante."
          tasks={[...pending].sort(
            (a, b) =>
              ["Alta", "Media", "Baja"].indexOf(a.priority) -
              ["Alta", "Media", "Baja"].indexOf(b.priority),
          )}
          onToggle={toggleTask}
          onEdit={(task) => {
            setEditingTask(task);
            setShowForm(true);
          }}
          onDelete={removeTask}
          onFocus={setFocusTask}
          empty="No tienes actividades priorizadas."
        />
      );
    if (view === "Modo enfoque")
      return (
        <TaskList
          title="Modo enfoque"
          subtitle="Elige una actividad para trabajar sin distracciones."
          tasks={pending}
          onToggle={toggleTask}
          onEdit={() => {}}
          onDelete={() => {}}
          onFocus={setFocusTask}
          empty="No hay actividades disponibles para enfocar."
          focusOnly
        />
      );
    if (view === "Compartir agendas")
      return (
        <SharePanel
          tasks={tasks}
          email={shareEmail}
          setEmail={setShareEmail}
          shared={shared}
          onShare={async (task) => {
            if (!shareEmail.includes("@")) {
              setNotice("Escribe un correo válido para compartir.");
              return;
            }
            try {
              await shareTask(task.id, shareEmail);
              setShared((current) => [...current, { task: task.title, email: shareEmail }]);
              setShareEmail("");
              setNotice("Agenda compartida correctamente.");
            } catch (error) {
              setNotice(error.message || "No fue posible compartir la agenda.");
            }
          }}
        />
      );
    if (view === "Mensajes")
      return <Chat message={message} setMessage={setMessage} userId={session.user.id} />;
    if (view === "Perfil" || view === "Configuración")
      return (
        <Profile
          view={view}
          userName={userName}
          email={session.user.email}
          profile={profile}
          onSettingsChange={async (settings) => {
            try {
              const updatedProfile = await updateProfileSettings(settings);
              setProfile(updatedProfile);
              setNotice("Configuración guardada correctamente.");
            } catch {
              setNotice("No fue posible guardar la configuración.");
            }
          }}
          onLogout={logout}
        />
      );
    return (
      <>
        <section className="welcome-row">
          <div>
            <p className="lead">Estas son tus actividades pendientes.</p>
            <div className="search-wrap">
              <span>⌕</span>
              <input
                aria-label="Buscar por título o materia"
                placeholder="Buscar por título o materia"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <button
            className="primary-button add-task-button"
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
          >
            + Nueva actividad
          </button>
        </section>
        <Stats stats={stats} />
        <section className="section-title">
          <div>
            <span className="eyebrow">Tu agenda</span>
            <h2>{query ? "Resultados de búsqueda" : "Próximas actividades"}</h2>
          </div>
          <button
            className="text-button"
            onClick={() => navigate("Mis tareas")}
          >
            Ver todas <span>→</span>
          </button>
        </section>
        <TaskList
          tasks={visibleTasks.filter((task) => !task.completed).slice(0, 4)}
          onToggle={toggleTask}
          onEdit={(task) => {
            setEditingTask(task);
            setShowForm(true);
          }}
          onDelete={removeTask}
          onFocus={setFocusTask}
          empty="No tienes tareas pendientes."
          compact
        />
      </>
    );
  };
  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="sidebar-head">
          <Brand />
          <button
            className="close-nav"
            onClick={() => setMobileNav(false)}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>
        <p className="sidebar-caption">Tu agenda académica</p>
        <nav aria-label="Navegación principal">
          {navItems.map((item, index) => (
            <button
              className={view === item ? "nav-item active" : "nav-item"}
              key={item}
              onClick={() => navigate(item)}
            >
              <span className="nav-symbol" aria-hidden="true">
                {["⌂", "✓", "▦", "◷", "↗", "◎", "⇄", "▢"][index]}
              </span>
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={view === "Perfil" ? "nav-item active" : "nav-item"}
            onClick={() => navigate("Perfil")}
          >
            ◯ <span>Perfil</span>
          </button>
          <button
            className={
              view === "Configuración" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("Configuración")}
          >
            ⚙ <span>Configuración</span>
          </button>
          <button className="nav-item logout" onClick={logout}>
            ↪ <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <div className="mobile-overlay" onClick={() => setMobileNav(false)} />
      <section className="workspace">
        <header className="workspace-header">
          <button
            className="menu-toggle"
            onClick={() => setMobileNav(true)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div>
            <p className="eyebrow">IE La Candelaria · PPI grado 11</p>
            <h1>{view === "Inicio" ? `Buenos días, ${userName}.` : view}</h1>
          </div>
          <div className="header-user">
            <button
              className="notification-button"
              aria-label="Ver notificaciones"
              onClick={() => setNotificationsOpen((current) => !current)}
            >
              ♢<span className="notification-dot" />
            </button>
            {notificationsOpen && (
              <div className="notification-panel">
                <strong>Notificaciones</strong>
                <p>
                  {pending.length
                    ? `Tienes ${pending.length} actividades pendientes.`
                    : "No hay novedades."}
                </p>
                {pending.slice(0, 2).map((task) => (
                  <span key={task.id}>
                    ◷ {task.title} · {formatDate(task.date)}
                  </span>
                ))}
              </div>
            )}
            <span className="avatar">{userName.charAt(0).toUpperCase()}</span>
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button aria-label="Cerrar mensaje" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        <div className="content-area">{renderMain()}</div>
      </section>
      {showForm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow accent-label">Agenda académica</span>
                <h2 id="task-modal-title">
                  {editingTask ? "Editar actividad" : "Nueva actividad"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowForm(false)}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>
            <TaskForm
              task={editingTask}
              onSave={saveTask}
              onCancel={() => setShowForm(false)}
            />
          </section>
        </div>
      )}
    </main>
  );
}
function Stats({ stats }) {
  return (
    <section className="stats-grid">
      {[
        ["Pendientes", stats.pending, "Actividades por completar", "green"],
        ["Para hoy", stats.today, "Fecha más cercana", "gold"],
        ["Alta prioridad", stats.high, "Requieren atención", "coral"],
        ["Completadas", stats.done, "Tu avance acumulado", "ink"],
      ].map(([label, value, caption, tone]) => (
        <article className={`stat-card stat-${tone}`} key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{caption}</small>
        </article>
      ))}
    </section>
  );
}
function TaskList({
  title,
  subtitle,
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  empty,
  compact = false,
  focusOnly = false,
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
              <button
                className="focus-choice"
                key={task.id}
                onClick={() => onFocus(task)}
              >
                <span className="focus-choice-icon">◎</span>
                <span>
                  <b>{task.title}</b>
                  <small>
                    {task.subject} · {formatDate(task.date)} · {task.time}
                  </small>
                </span>
                <PriorityBadge priority={task.priority} />
              </button>
            ) : (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onFocus={onFocus}
              />
            ),
          )}
        </div>
      ) : (
        <div className="empty-state">
          <span>✓</span>
          <h3>{empty}</h3>
          <p>Las actividades que agregues aparecerán aquí.</p>
        </div>
      )}
    </section>
  );
}
function Calendar({ tasks, onSelect }) {
  const [selected, setSelected] = useState(today);
  const days = [...new Set(tasks.map((task) => task.date))].sort();
  const dayTasks = tasks.filter((task) => task.date === selected);
  return (
    <section className="calendar-view">
      <div className="section-title">
        <div>
          <span className="eyebrow">Vista de agenda</span>
          <h2>Calendario académico</h2>
        </div>
        <span className="calendar-month">Agosto / Septiembre 2026</span>
      </div>
      <div className="calendar-layout">
        <div className="calendar-days">
          {days.length ? (
            days.map((day) => (
              <button
                className={
                  selected === day ? "calendar-day selected" : "calendar-day"
                }
                key={day}
                onClick={() => setSelected(day)}
              >
                <span>
                  {new Intl.DateTimeFormat("es-CO", {
                    weekday: "short",
                  }).format(new Date(`${day}T12:00:00`))}
                </span>
                <b>{new Date(`${day}T12:00:00`).getDate()}</b>
                <i
                  className={
                    tasks.some((task) => task.date === day && !task.completed)
                      ? "has-task"
                      : ""
                  }
                />
              </button>
            ))
          ) : (
            <p className="empty-copy">
              Agrega una tarea para verla en el calendario.
            </p>
          )}
        </div>
        <div className="day-agenda">
          <span className="eyebrow">
            {selected ? formatDate(selected) : "Agenda"}
          </span>
          <h3>Actividades del día</h3>
          {dayTasks.length ? (
            dayTasks.map((task) => (
              <button
                className="agenda-task"
                key={task.id}
                onClick={() => onSelect(task)}
              >
                <span>
                  <b>{task.title}</b>
                  <small>
                    {task.subject} · {task.time}
                  </small>
                </span>
                <PriorityBadge priority={task.priority} />
              </button>
            ))
          ) : (
            <p className="empty-copy">
              No tienes actividades programadas para este día.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
function SharePanel({ tasks, email, setEmail, shared, onShare }) {
  return (
    <section className="panel-view">
      <span className="eyebrow accent-label">Coordina con tu equipo</span>
      <h2>Compartir agendas</h2>
      <p className="panel-intro">
        Envía una actividad a un compañero. La conexión con usuarios reales se
        habilita al configurar el backend.
      </p>
      <div className="share-form">
        <label>
          Correo del compañero
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="compañero@ejemplo.com"
          />
        </label>
        <div className="share-list">
          {tasks
            .filter((task) => !task.completed)
            .map((task) => (
              <div className="share-row" key={task.id}>
                <span>
                  <b>{task.title}</b>
                  <small>
                    {task.subject} · {formatDate(task.date)}
                  </small>
                </span>
                <button
                  className="outline-button"
                  onClick={() => onShare(task)}
                >
                  Compartir
                </button>
              </div>
            ))}
        </div>
      </div>
      {shared.length > 0 && (
        <div className="shared-success">
          <b>Agendas preparadas</b>
          {shared.map((item, index) => (
            <span key={`${item.email}-${index}`}>
              ✓ {item.task} · {item.email}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
function Chat({ message, setMessage, userId }) {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    let mounted = true;
    listMessages().then((data) => {
      if (mounted) setMessages(data);
    }).catch(() => {});
    const unsubscribe = subscribeToMessages((payload) => {
      if (payload.eventType === "INSERT") setMessages((current) => [...current, payload.new]);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  const send = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      await sendMessage(message);
      setMessage("");
    } catch {
      return;
    }
  };
  return (
    <section className="panel-view chat-view">
      <span className="eyebrow accent-label">Comunicación interna</span>
      <h2>Mensajes</h2>
      <p className="panel-intro">
        Coordina horarios y actividades con tus compañeros desde RECORDATE.
      </p>
      <div className="chat-window">
        <div className="chat-contact">
          <span className="avatar small-avatar">E</span>
          <span>
            <b>Equipo PPI</b>
            <small>Conversación del equipo</small>
          </span>
          <i />
        </div>
        <div className="chat-messages">
          {messages.map((item, index) => (
            <p
              className={item.sender_id === userId ? "outgoing" : "incoming"}
              key={item.id || `${item.body}-${index}`}
            >
              {item.body}
            </p>
          ))}
        </div>
        <form className="chat-input" onSubmit={send}>
          <input
            aria-label="Escribe un mensaje"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escribe un mensaje..."
          />
          <button className="primary-button" type="submit">
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}
function Profile({ view, userName, email, profile, onSettingsChange, onLogout }) {
  return (
    <section className="panel-view profile-view">
      <span className="eyebrow accent-label">Tu cuenta</span>
      <h2>{view}</h2>
      <div className="profile-card">
        <span className="profile-avatar">
          {userName.charAt(0).toUpperCase()}
        </span>
        <div>
          <h3>{userName}</h3>
          <p>{email}</p>
          <span className="demo-tag">
            {email?.includes("recordate.local")
              ? "CUENTA DEMO"
              : "CUENTA SUPABASE"}
          </span>
        </div>
      </div>
      {view === "Configuración" ? (
        <div className="settings-list">
          <label>
            <span>
              <b>Recordatorios automáticos</b>
              <small>Recibe avisos antes de cada entrega.</small>
            </span>
            <input type="checkbox" checked={profile?.reminders_enabled ?? true} onChange={async (event) => { if (event.target.checked && "Notification" in window && Notification.permission === "default") await Notification.requestPermission(); onSettingsChange({ reminders_enabled: event.target.checked }); }} />
          </label>
          <label>
            <span>
              <b>Mostrar tareas completadas</b>
              <small>Conserva visible tu avance en la agenda.</small>
            </span>
            <input type="checkbox" checked={profile?.show_completed ?? true} onChange={(event) => onSettingsChange({ show_completed: event.target.checked })} />
          </label>
        </div>
      ) : (
        <div className="profile-info">
          <span>Institución</span>
          <b>IE La Candelaria · Medellín</b>
          <span>Proyecto</span>
          <b>Proyecto Pedagógico Integrador · Grado 11</b>
        </div>
      )}
      <button className="outline-button logout-profile" onClick={onLogout}>
        Cerrar sesión
      </button>
    </section>
  );
}
export default App;
