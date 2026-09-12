// @ts-nocheck
// RECORDATE: portada, acceso y panel (tareas, mensajes, perfil).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  House,
  ListTodo,
  CalendarDays,
  Bell,
  Flag,
  Focus,
  Share2,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Plus,
  Search,
  Menu,
  X,
  Check,
  Pencil,
  Trash2,
  ArrowRight,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Camera,
  Inbox,
  Send,
  Reply,
} from "lucide-react";
import Login from "./components/Login";
import { Brand } from "./Brand";
import WebGLBackground from "./components/WebGLBackground";
import AsciiEffect from "./components/AsciiEffect";
import { MorphingText } from "./components/ui/morphing-text";
import { DiaTextReveal } from "./components/ui/dia-text-reveal";
import { hasSupabaseConfig, supabase } from "./supabaseClient";
import { DEMO_SESSION, demoApi, isDemoSession } from "./demoStore";
import { currentPath, pushRoute, assetUrl } from "./paths";
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
  listSharedTasks,
  revokeSharedTask,
  findUserByEmail,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  savePushSubscription,
  uploadTaskAttachment,
  getAttachmentUrl,
  deleteTaskAttachment,
  subscribeToNotifications,
  uploadAvatar,
  markMessagesRead,
  ROLE_OPTIONS,
  roleLabel,
} from "./dataService";
import "./recordate.css";

/* Rutas y etiquetas del menú del panel autenticado. */
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
const navIcons = [House, ListTodo, CalendarDays, Bell, Flag, Focus, Share2, MessageCircle];
const routeViews = {
  "/dashboard": "Inicio",
  "/tareas": "Mis tareas",
  "/calendario": "Calendario",
  "/recordatorios": "Recordatorios",
  "/prioridades": "Prioridades",
  "/enfoque": "Modo enfoque",
  "/compartir": "Compartir agendas",
  "/mensajes": "Mensajes",
  "/perfil": "Perfil",
  "/configuracion": "Configuración",
};
const viewRoutes = {
  Inicio: "/dashboard",
  "Mis tareas": "/tareas",
  Calendario: "/calendario",
  Recordatorios: "/recordatorios",
  Prioridades: "/prioridades",
  "Modo enfoque": "/enfoque",
  "Compartir agendas": "/compartir",
  Mensajes: "/mensajes",
  Perfil: "/perfil",
  Configuración: "/configuracion",
};
const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = localDate();
const reminderOptions = [
  ["Al momento", 0],
  ["5 minutos antes", 5 * 60 * 1000],
  ["10 minutos antes", 10 * 60 * 1000],
  ["30 minutos antes", 30 * 60 * 1000],
  ["1 hora antes", 60 * 60 * 1000],
  ["3 horas antes", 3 * 60 * 60 * 1000],
  ["12 horas antes", 12 * 60 * 60 * 1000],
  ["24 horas antes", 24 * 60 * 60 * 1000],
  ["1 día antes", 24 * 60 * 60 * 1000],
];
const formatDate = (date) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
const formatStamp = (value) =>
  new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
};
const vapidKey = (value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (character) => character.charCodeAt(0));
const supabaseErrorMessage = (error, fallback) => {
  const details = [error?.code && `Código: ${error.code}`, error?.message, error?.details && `Detalles: ${error.details}`, error?.hint && `Sugerencia: ${error.hint}`].filter(Boolean);
  return details.length ? `${fallback} ${details.join(" | ")}` : fallback;
};

const UserAvatar = ({ name = "?", url, size = "md", className = "" }) => {
  const initial = (name || "?").charAt(0).toUpperCase();
  const sizeClass = size === "lg" ? "profile-avatar" : size === "sm" ? "small-avatar" : "avatar";
  if (url) {
    return (
      <img
        className={`avatar-image ${sizeClass} ${className}`.trim()}
        src={url}
        alt={`Foto de ${name}`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return <span className={`${sizeClass} ${className}`.trim()}>{initial}</span>;
};

/* Portada pública: hero, características y FAQ. */
function Landing({ onStart }) {
  const gazeSrc = `${import.meta.env.BASE_URL}brand/electric-gaze.jpg`;
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand light />
        <nav className="landing-nav">
          <a href="#caracteristicas">Características</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#beneficios">Beneficios</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
        <button className="outline-button" onClick={onStart}>
          Iniciar sesión
        </button>
      </header>
      <section className="hero" id="inicio">
        <div className="hero-copy">
          <span className="eyebrow accent-label">
            <DiaTextReveal text="PPI · IE La Candelaria · Grado 11" />
          </span>
          <h1 className="hero-static">Tu día académico.</h1>
          <MorphingText
            className="hero-morph"
            texts={["Recuerda.", "Organiza.", "Prioriza.", "Avanza."]}
          />
          <p>
            RECORDATE es la agenda académica para estudiantes que quieren claridad:
            tareas, fechas, prioridades y recordatorios en un solo espacio.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onStart}>
              Comenzar ahora <ArrowRight size={16} />
            </button>
            <a className="text-button" href="#como-funciona">
              Conocer más <ArrowDown size={16} />
            </a>
          </div>
          <p className="demo-note">Puedes explorar la experiencia con el acceso de demostración.</p>
        </div>
        <div className="hero-visual">
          <div className="ascii-stage">
            <span className="logo-caption">Electric Gaze</span>
            <AsciiEffect
              src={gazeSrc}
              config={{
                cellSize: 6,
                brightness: 18,
                contrast: 118,
                density: 28,
              }}
            />
          </div>
        </div>
      </section>
      <section className="problem-band" id="como-funciona">
        <div>
          <span className="eyebrow">El reto del día a día</span>
          <h2>Menos olvido. Más control sobre tu tiempo.</h2>
        </div>
        <p>
          Cuando se acumulan tareas, trabajos y fechas importantes, priorizar se vuelve difícil.
          RECORDATE convierte esa carga en una agenda clara, pensada para estudiantes de la IE La Candelaria.
        </p>
      </section>
      <section className="feature-section" id="caracteristicas">
        <div className="section-heading">
          <span className="eyebrow accent-label">Todo en un mismo lugar</span>
          <h2>Una herramienta hecha para tu ritmo académico.</h2>
        </div>
        <div className="feature-grid">
          {[
            ["01", "Registra tus actividades", "Crea tareas con materia, fecha, hora, descripción y prioridad."],
            ["02", "Recibe recordatorios", "Configura avisos para llegar a tiempo a cada entrega."],
            ["03", "Concéntrate mejor", "El modo enfoque deja frente a ti una sola actividad."],
            ["04", "Coordina con tu equipo", "Comparte agendas y conversa con tus compañeros."],
            ["05", "Encuentra rápido", "Busca por título, materia o descripción en tiempo real."],
            ["06", "Marca tu avance", "Completa actividades y visualiza tu progreso real."],
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
          Abrir RECORDATE <ArrowRight size={16} />
        </button>
      </section>
      <section className="landing-faq" id="preguntas">
        <span className="eyebrow">Preguntas frecuentes</span>
        <div className="faq-grid">
          <div>
            <h3>¿Necesito crear una cuenta?</h3>
            <p>Sí, para guardar tu agenda en la nube con Supabase. También puedes explorar una demostración local.</p>
          </div>
          <div>
            <h3>¿Funciona en el celular?</h3>
            <p>Sí. La navegación se adapta a iPhone y Android con un menú inferior y pantallas pensadas para una mano.</p>
          </div>
          <div>
            <h3>¿Puedo compartir tareas?</h3>
            <p>Puedes compartir actividades con compañeros registrados y revocar el acceso cuando lo necesites.</p>
          </div>
          <div>
            <h3>¿Hay recordatorios?</h3>
            <p>Configura avisos por actividad. Las alarmas suenan mientras RECORDATE está abierto.</p>
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        <Brand light />
        <p>Sistema de recordatorio de actividades académicas · Medellín, Antioquia</p>
        <span>© 2026 PPI</span>
      </footer>
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
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.subject.trim() || !form.date || !form.time) {
      setError("Completa título, materia, fecha y hora para guardar la actividad.");
      return;
    }
    setSaving(true);
    onSave({
      ...form,
      attachmentFile,
      ...(task?.id ? { id: task.id } : {}),
      completed: task?.completed ?? false,
    }).finally(() => setSaving(false));
  };
  return (
    <form className="task-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <label>
          Título
          <input autoFocus value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Ej. Entrega de taller" />
        </label>
        <label>
          Materia
          <input value={form.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Ej. Matemáticas" />
        </label>
        <label>
          Fecha
          <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
        </label>
        <label>
          Hora
          <input type="time" value={form.time} onChange={(event) => update("time", event.target.value)} />
        </label>
        <label>
          Prioridad
          <select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
            <option>Alta</option>
            <option>Media</option>
            <option>Baja</option>
          </select>
        </label>
        <label>
          Recordatorio
          <select value={form.reminder} onChange={(event) => update("reminder", event.target.value)}>
            {reminderOptions.map(([label]) => <option key={label}>{label}</option>)}
          </select>
        </label>
      </div>
      <label>
        Descripción
        <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows="3" placeholder="Agrega detalles para recordar qué debes hacer..." />
      </label>
      <label>
        Adjuntar imagen
        <input type="file" accept="image/*" onChange={(event) => {
          const file = event.target.files?.[0] || null;
          if (file && file.size > 5 * 1024 * 1024) {
            setError("La imagen no puede superar los 5 MB.");
            setAttachmentFile(null);
            event.target.value = "";
            return;
          }
          setError("");
          setAttachmentFile(file);
        }} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Guardando..." : task ? "Guardar cambios" : "Crear tarea"}
        </button>
        <button className="text-button" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

function PriorityBadge({ priority }) {
  return <span className={`priority priority-${priority.toLowerCase()}`}>{priority}</span>;
}

function TaskCard({ task, userId, onToggle, onEdit, onDelete, onFocus, onAttachmentDelete }) {
  const canManage = task.userId === userId;
  const [attachmentError, setAttachmentError] = useState("");
  const openAttachment = async (attachment) => {
    try {
      setAttachmentError("");
      const url = await getAttachmentUrl(attachment.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setAttachmentError(supabaseErrorMessage(error, "No fue posible abrir la imagen."));
    }
  };
  return (
    <article className={`task-card ${task.completed ? "is-complete" : ""}`}>
      <button
        className="check-button"
        disabled={!canManage}
        aria-label={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
        onClick={() => onToggle(task.id)}
      >
        {task.completed ? <Check size={12} /> : ""}
      </button>
      <div className="task-content">
        <div className="task-heading">
          <h3>{task.title}</h3>
          <div className="task-heading-badges">
            {!canManage && <span className="shared-badge">Compartida</span>}
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <p className="task-meta">
          {task.subject} <span>·</span> {formatDate(task.date)} <span>·</span> {task.time}
        </p>
        {task.description && <p className="task-description">{task.description}</p>}
        {task.attachments?.map((attachment) => (
          <span className="task-attachment" key={attachment.id}>
            <button className="text-button" onClick={() => openAttachment(attachment)}>
              <Paperclip size={14} /> Ver imagen
            </button>
            {canManage && (
              <button className="text-button" onClick={() => onAttachmentDelete(task.id, attachment)} aria-label={`Eliminar ${attachment.file_name}`}>
                <X size={14} />
              </button>
            )}
          </span>
        ))}
        {attachmentError && <small className="form-error" role="alert">{attachmentError}</small>}
      </div>
      <div className="task-actions">
        <button className="icon-button" aria-label="Abrir modo enfoque" title="Modo enfoque" onClick={() => onFocus(task)}>
          <Focus size={16} />
        </button>
        {canManage && (
          <button className="icon-button" aria-label="Editar tarea" title="Editar tarea" onClick={() => onEdit(task)}>
            <Pencil size={16} />
          </button>
        )}
        {canManage && (
          <button className="icon-button danger" aria-label="Eliminar tarea" title="Eliminar tarea" onClick={() => onDelete(task.id)}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

function App() {
  /* Sesión, vista actual y datos de la agenda. */
  const [session, setSession] = useState(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("landing");
  const [view, setView] = useState("Inicio");
  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ priority: "", status: "", date: "" });
  const [editingTask, setEditingTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [focusTask, setFocusTask] = useState(null);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationAction, setNotificationAction] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shared, setShared] = useState([]);
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [alarmTask, setAlarmTask] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const alarmedTasks = useRef(new Set());
  const demo = isDemoSession(session);
  const enablePushNotifications = async () => {
    if (demo) {
      setNotice("Las notificaciones push no están disponibles en la demostración local.");
      return false;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      setNotice("Las notificaciones avanzadas requieren configurar Web Push.");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    const registration = await navigator.serviceWorker.register(assetUrl("/sw.js"));
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(import.meta.env.VITE_VAPID_PUBLIC_KEY) });
    await savePushSubscription(subscription);
    return true;
  };
  useEffect(() => {
    const privatePaths = Object.keys(routeViews);
    const handleRoute = () => {
      const path = currentPath();
      if (privatePaths.includes(path)) {
        setView(routeViews[path]);
        setScreen(session ? "app" : "auth");
      }
      if (path === "/login" && session) setScreen("app");
      if (path === "/reset-password") {
        setPasswordRecovery(true);
        setScreen("auth");
      }
    };
    handleRoute();
    window.addEventListener("popstate", handleRoute);
    return () => window.removeEventListener("popstate", handleRoute);
  }, [session]);
  const loadUserData = async (current) => {
    if (!current) {
      setProfile(null);
      setTasks([]);
      setShared([]);
      return;
    }
    setLoadingData(true);
    try {
      if (isDemoSession(current)) {
        const data = demoApi.load();
        setProfile(data.profile);
        setTasks(data.tasks);
        setShared(data.shares);
        setNotifications(data.notifications);
        setScreen("app");
        return;
      }
      const [currentProfile, currentTasks, currentShares, currentNotifications] = await Promise.all([
        ensureProfile(current.user),
        listTasks(),
        listSharedTasks(),
        listNotifications(),
      ]);
      setProfile(currentProfile);
      setTasks(currentTasks);
      setShared(
        currentShares.map((share) => {
          const localTask = currentTasks.find((task) => task.id === share.task_id);
          return {
            ...share,
            task: share.task_title || share.task || localTask?.title || "Tarea compartida",
            taskDetails: share.taskDetails
              ? {
                  ...share.taskDetails,
                  attachments: localTask?.attachments || share.taskDetails.attachments || [],
                }
              : localTask
                ? {
                    id: localTask.id,
                    title: localTask.title,
                    description: localTask.description,
                    subject: localTask.subject,
                    date: localTask.date,
                    time: localTask.time,
                    priority: localTask.priority,
                    reminder: localTask.reminder,
                    completed: localTask.completed,
                    attachments: localTask.attachments || [],
                  }
                : null,
          };
        }),
      );
      setNotifications(currentNotifications);
      setScreen("app");
    } catch (error) {
      setNotice(supabaseErrorMessage(error, "No fue posible cargar tu agenda."));
    } finally {
      setLoadingData(false);
    }
  };
  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      loadUserData(current);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, current) => {
      setSession(current);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setScreen("auth");
        return;
      }
      loadUserData(current);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session || demo) return undefined;
    const unsubscribe = subscribeToNotifications(session.user.id, (payload) =>
      setNotifications((current) => current.some((item) => item.id === payload.new.id) ? current : [payload.new, ...current]),
    );
    return unsubscribe;
  }, [session, demo]);
  useEffect(() => {
    if (!profile?.reminders_enabled) return undefined;
    const checkReminders = () => {
      const now = Date.now();
      tasks.filter((task) => !task.completed).forEach((task) => {
        const offset = reminderOptions.find(([label]) => label === task.reminder)?.[1] || 0;
        const reminderAt = new Date(`${task.date}T${task.time}`).getTime() - offset;
        if (now < reminderAt || now - reminderAt > 60 * 1000 || alarmedTasks.current.has(task.id)) return;
        alarmedTasks.current.add(task.id);
        if (profile.alarms_enabled) setAlarmTask(task);
        if (profile.alarms_enabled && "AudioContext" in window) {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.frequency.value = 740;
          gain.gain.setValueAtTime(0.12, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.6);
        }
        if (profile.browser_notifications_enabled && "Notification" in window && Notification.permission === "granted") {
          new Notification("Alarma de RECORDATE", { body: `${task.title} · ${task.subject} · Prioridad ${task.priority}` });
        }
      });
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(timer);
  }, [profile, tasks]);
  const userName = profile?.full_name || session?.user?.email?.split("@")[0] || "estudiante";
  const visibleTasks = useMemo(
    () =>
      (profile?.show_completed === false ? tasks.filter((task) => !task.completed) : tasks)
        .filter((task) => `${task.title} ${task.subject} ${task.description}`.toLowerCase().includes(query.toLowerCase()))
        .filter((task) =>
          (!filters.priority || task.priority === filters.priority) &&
          (!filters.status || (filters.status === "Completada" ? task.completed : !task.completed)) &&
          (!filters.date || task.date === filters.date),
        ),
    [tasks, query, filters, profile?.show_completed],
  );
  const pending = tasks.filter((task) => !task.completed);
  const stats = {
    pending: pending.length,
    today: pending.filter((task) => task.date === today).length,
    high: pending.filter((task) => task.priority === "Alta").length,
    done: tasks.filter((task) => task.completed).length,
  };
  const progress = tasks.length ? Math.round((stats.done / tasks.length) * 100) : 0;
  const saveTask = async (task) => {
    try {
      const saved = demo
        ? demoApi.saveTask({ ...task, id: editingTask?.id })
        : editingTask?.id
          ? await updateTask(task)
          : await createTask(task);
      const attachment = !demo && task.attachmentFile
        ? await uploadTaskAttachment(saved.id, task.attachmentFile)
        : null;
      const savedTask = attachment
        ? { ...saved, attachments: [...(saved.attachments || []), attachment] }
        : saved;
      setTasks((current) =>
        editingTask?.id
          ? current.map((item) => (item.id === savedTask.id ? savedTask : item))
          : [savedTask, ...current],
      );
      setShowForm(false);
      setEditingTask(null);
      setNotice("Actividad guardada correctamente.");
      return true;
    } catch (error) {
      setNotice(supabaseErrorMessage(error, "No fue posible guardar la actividad."));
      return false;
    }
  };
  const removeTask = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta tarea?")) return;
    try {
      if (demo) demoApi.deleteTask(id);
      else await deleteTask(id);
      setTasks((current) => current.filter((task) => task.id !== id));
      setNotice("Actividad eliminada.");
    } catch (error) {
      setNotice(supabaseErrorMessage(error, "No fue posible eliminar la actividad."));
    }
  };
  const toggleTask = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    try {
      const updated = demo
        ? demoApi.saveTask({ ...task, completed: !task.completed })
        : await updateTask({ ...task, completed: !task.completed });
      setTasks((current) => current.map((item) => (item.id === id ? updated : item)));
      setFocusTask((current) => (current?.id === id ? updated : current));
    } catch (error) {
      setNotice(supabaseErrorMessage(error, "No fue posible actualizar la actividad."));
    }
  };
  const completeAlarmTask = async () => {
    if (alarmTask) await toggleTask(alarmTask.id);
    setAlarmTask(null);
  };
  const removeAttachment = async (taskId, attachment) => {
    if (demo) {
      setNotice("Los adjuntos no están disponibles en la demostración local.");
      return;
    }
    try {
      await deleteTaskAttachment(attachment);
      setTasks((current) => current.map((task) => task.id === taskId ? { ...task, attachments: task.attachments.filter((item) => item.id !== attachment.id) } : task));
      setNotice("Imagen eliminada correctamente.");
    } catch (error) {
      setNotice(supabaseErrorMessage(error, "No fue posible eliminar la imagen."));
    }
  };
  const logout = async () => {
    if (supabase && !demo) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setTasks([]);
    setShared([]);
    setNotifications([]);
    setScreen("landing");
    pushRoute("/");
  };
  const markAllRead = async () => {
    setNotificationAction(true);
    try {
      if (demo) demoApi.markAllRead();
      else await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read_at: new Date().toISOString() })));
    } catch (error) {
      setNotice(supabaseErrorMessage(error, "No fue posible marcar las notificaciones."));
    } finally {
      setNotificationAction(false);
    }
  };
  const markOneRead = async (notification) => {
    if (notification.read_at) return;
    try {
      if (demo) demoApi.markOneRead(notification.id);
      else await markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch (error) {
      setNotice(supabaseErrorMessage(error, "No fue posible marcar la notificación."));
    }
  };
  const navigate = (nextView) => {
    setView(nextView);
    const route = viewRoutes[nextView];
    if (route && currentPath() !== route) pushRoute(route);
    setMobileNav(false);
    setFocusTask(null);
  };
  const openNewTask = () => {
    setEditingTask(null);
    setShowForm(true);
  };
  const taskHandlers = {
    userId: session?.user?.id,
    onToggle: toggleTask,
    onEdit: (task) => {
      setEditingTask(task);
      setShowForm(true);
    },
    onDelete: removeTask,
    onFocus: setFocusTask,
    onAttachmentDelete: removeAttachment,
  };
  const frame = (node) => (
    <div className="recordate-root">
      <WebGLBackground />
      <div className="recordate-ui">{node}</div>
    </div>
  );
  /* Landing → login/demo → panel. */
  if (screen === "landing") return frame(<Landing onStart={() => setScreen("auth")} />);
  if (!session || passwordRecovery) {
    return frame(
      <Login
        recovery={passwordRecovery}
        onDemo={() => {
          setSession(DEMO_SESSION);
          setPasswordRecovery(false);
          loadUserData(DEMO_SESSION);
        }}
        onLogin={(nextSession) => {
          setSession(nextSession);
          setPasswordRecovery(false);
          loadUserData(nextSession);
        }}
        onRecoveryDone={() => setPasswordRecovery(false)}
        onBack={() => setScreen("landing")}
      />
    );
  }
  const renderMain = () => {
    if (focusTask) {
      return (
        <section className="focus-panel">
          <div className="focus-orbit"><Focus size={28} /></div>
          <span className="eyebrow accent-label">Modo enfoque</span>
          <h2>{focusTask.title}</h2>
          <p className="task-meta">{focusTask.subject} · {formatDate(focusTask.date)} · {focusTask.time}</p>
          <p>{focusTask.description || "Concéntrate en completar esta actividad."}</p>
          <div className="focus-status">
            <PriorityBadge priority={focusTask.priority} />
            <span>{focusTask.completed ? "Actividad completada" : "Pendiente de completar"}</span>
          </div>
          <button className="primary-button" onClick={() => setFocusTask(null)}>Salir del modo enfoque</button>
        </section>
      );
    }
    if (view === "Calendario") {
      return <Calendar tasks={profile?.show_completed === false ? tasks.filter((task) => !task.completed) : tasks} onSelect={setFocusTask} />;
    }
    if (view === "Mis tareas") {
      return (
        <>
          <section className="section-title">
            <div>
              <span className="eyebrow">Tu agenda completa</span>
              <h2>Mis tareas</h2>
            </div>
            <button className="primary-button" onClick={openNewTask}><Plus size={16} /> Nueva actividad</button>
          </section>
          <div className="search-wrap" aria-label="Filtros de tareas">
            <select aria-label="Filtrar por prioridad" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
              <option value="">Todas las prioridades</option>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
            <select aria-label="Filtrar por estado" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">Todos los estados</option>
              <option>Pendiente</option>
              <option>Completada</option>
            </select>
            <input type="date" aria-label="Filtrar por fecha" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
          </div>
          <TaskList {...taskHandlers} tasks={visibleTasks} empty="No tienes actividades registradas." />
        </>
      );
    }
    if (view === "Recordatorios") {
      return <TaskList {...taskHandlers} title="Recordatorios" subtitle="Las próximas fechas que merecen tu atención." tasks={pending} empty="No tienes recordatorios pendientes." />;
    }
    if (view === "Prioridades") {
      return (
        <TaskList
          {...taskHandlers}
          title="Prioridades"
          subtitle="Ordena tu energía empezando por lo más importante."
          tasks={[...pending].sort((a, b) => ["Alta", "Media", "Baja"].indexOf(a.priority) - ["Alta", "Media", "Baja"].indexOf(b.priority))}
          empty="No tienes actividades priorizadas."
        />
      );
    }
    if (view === "Modo enfoque") {
      return (
        <TaskList
          {...taskHandlers}
          title="Modo enfoque"
          subtitle="Elige una actividad para trabajar sin distracciones."
          tasks={pending}
          onEdit={() => {}}
          onDelete={() => {}}
          empty="No hay actividades disponibles para enfocar."
          focusOnly
        />
      );
    }
    if (view === "Compartir agendas") {
      return (
        <SharePanel
          tasks={tasks}
          currentUserId={session.user.id}
          email={shareEmail}
          setEmail={setShareEmail}
          shared={shared}
          onOpenAttachment={async (attachment) => {
            try {
              const url = await getAttachmentUrl(attachment.storage_path);
              window.open(url, "_blank", "noopener,noreferrer");
            } catch (error) {
              setNotice(supabaseErrorMessage(error, "No fue posible abrir la imagen compartida."));
            }
          }}
          onRevoke={async (share) => {
            try {
              if (demo) demoApi.revoke(share.id);
              else await revokeSharedTask(share.id);
              setShared((current) => current.filter((item) => item.id !== share.id));
              setNotice("Acceso compartido revocado.");
            } catch (error) {
              setNotice(supabaseErrorMessage(error, "No fue posible revocar el acceso compartido."));
            }
          }}
          onShare={async (task) => {
            const normalizedEmail = shareEmail.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
              setNotice("Escribe un correo válido para compartir.");
              return false;
            }
            try {
              if (demo) {
                const createdShare = demoApi.share(task.id, normalizedEmail);
                setShared((current) => [...current, createdShare]);
                setShareEmail("");
                setNotice("Agenda compartida en la demostración local.");
                return true;
              }
              const recipient = await findUserByEmail(normalizedEmail);
              if (!recipient) {
                setNotice("No existe un usuario registrado con ese correo.");
                return false;
              }
              if (recipient.id === session.user.id) {
                setNotice("No puedes compartir una actividad contigo mismo.");
                return false;
              }
              if (shared.some((share) => share.task_id === task.id && share.recipient_id === recipient.id)) {
                setNotice("Esta actividad ya está compartida con ese usuario.");
                return false;
              }
              const createdShare = await shareTask(task.id, recipient.email);
              setShared((current) => [
                ...current,
                { ...createdShare, task: task.title, recipient_email: recipient.email, recipient_name: recipient.full_name },
              ]);
              setShareEmail("");
              setNotice("Agenda compartida correctamente.");
              return true;
            } catch (error) {
              setNotice(supabaseErrorMessage(error, "No fue posible compartir la agenda."));
              return false;
            }
          }}
        />
      );
    }
    if (view === "Mensajes") {
      return <Chat message={message} setMessage={setMessage} userId={session.user.id} demo={demo} />;
    }
    if (view === "Perfil" || view === "Configuración") {
      return (
        <Profile
          view={view}
          userName={userName}
          email={session.user.email}
          profile={profile}
          demo={demo}
          onEnablePush={enablePushNotifications}
          onAvatarUpload={async (file) => {
            try {
              if (demo) {
                const dataUrl = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                const updatedProfile = demoApi.saveAvatar(dataUrl);
                setProfile(updatedProfile);
                setNotice("Foto de perfil actualizada.");
                return;
              }
              const updatedProfile = await uploadAvatar(file);
              setProfile(updatedProfile);
              setNotice("Foto de perfil actualizada.");
            } catch (error) {
              setNotice(supabaseErrorMessage(error, "No fue posible actualizar la foto de perfil."));
            }
          }}
          onSettingsChange={async (settings) => {
            try {
              const updatedProfile = demo ? demoApi.saveProfile(settings) : await updateProfileSettings(settings);
              setProfile(updatedProfile);
              setNotice("Configuración guardada correctamente.");
            } catch (error) {
              setNotice(supabaseErrorMessage(error, "No fue posible guardar la configuración."));
            }
          }}
          onLogout={logout}
        />
      );
    }
    const todayTasks = pending.filter((task) => task.date === today);
    return (
      <>
        <section className="dash-hero">
          <div>
            <span className="eyebrow">{new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
            <h1>{greeting()}, {userName}.</h1>
            <p>
              {stats.today
                ? `Tienes ${stats.today} ${stats.today === 1 ? "actividad" : "actividades"} para hoy.`
                : "Hoy no tienes entregas. Revisa lo que viene."}
            </p>
          </div>
          <button className="primary-button add-task-button" onClick={openNewTask}>
            <Plus size={16} /> Nueva actividad
          </button>
        </section>
        <Stats stats={stats} />
        <div className="panel-card progress-card">
          <span className="eyebrow">Progreso</span>
          <strong>{progress}%</strong>
          <p className="lead">de tu agenda está completa.</p>
          <div className="progress-track" aria-hidden="true"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="dash-grid">
          <div>
            <section className="section-title">
              <div>
                <span className="eyebrow">Tu agenda</span>
                <h2>{query ? "Resultados de búsqueda" : "Tareas importantes"}</h2>
              </div>
              <button className="text-button" onClick={() => navigate("Mis tareas")}>Ver todas <ArrowRight size={14} /></button>
            </section>
            <div className="search-wrap">
              <Search size={16} />
              <input aria-label="Buscar por título o materia" placeholder="Buscar por título o materia" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <TaskList {...taskHandlers} tasks={visibleTasks.filter((task) => !task.completed).slice(0, 4)} empty="No tienes tareas pendientes." compact />
          </div>
          <aside className="panel-card">
            <span className="eyebrow">Hoy</span>
            <h2>Agenda del día</h2>
            {todayTasks.length ? todayTasks.map((task) => (
              <button className="agenda-task" key={task.id} onClick={() => setFocusTask(task)}>
                <span>
                  <b>{task.title}</b>
                  <small>{task.subject} · {task.time}</small>
                </span>
                <PriorityBadge priority={task.priority} />
              </button>
            )) : <p className="empty-copy">Nada programado para hoy.</p>}
            <button className="text-button calendar-link" onClick={() => navigate("Calendario")}>
              Abrir calendario <ArrowRight size={14} />
            </button>
          </aside>
        </div>
        <div className="quick-actions">
          <button className="quick-action" onClick={openNewTask}>
            <Plus size={18} />
            <b>Crear tarea</b>
            <small>Registra una entrega en segundos.</small>
          </button>
          <button className="quick-action" onClick={() => navigate("Modo enfoque")}>
            <Focus size={18} />
            <b>Modo enfoque</b>
            <small>Una sola actividad en pantalla.</small>
          </button>
          <button className="quick-action" onClick={() => navigate("Mensajes")}>
            <MessageCircle size={18} />
            <b>Escribir</b>
            <small>Coordina con un compañero.</small>
          </button>
        </div>
      </>
    );
  };
  return frame(
    <main className="app-shell">
      {/* Menú lateral (en móvil se abre como cajón). */}
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="sidebar-head">
          <Brand light size="sm" />
          <button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <p className="sidebar-caption">Tu agenda académica</p>
        <nav aria-label="Navegación principal">
          {navItems.map((item, index) => {
            const Icon = navIcons[index];
            return (
              <button className={view === item ? "nav-item active" : "nav-item"} key={item} onClick={() => navigate(item)}>
                <span className="nav-symbol" aria-hidden="true"><Icon size={16} /></span>
                {item}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className={view === "Perfil" ? "nav-item active" : "nav-item"} onClick={() => navigate("Perfil")}>
            <span className="nav-symbol"><User size={16} /></span> Perfil
          </button>
          <button className={view === "Configuración" ? "nav-item active" : "nav-item"} onClick={() => navigate("Configuración")}>
            <span className="nav-symbol"><Settings size={16} /></span> Configuración
          </button>
          <button className="nav-item logout" onClick={logout}>
            <span className="nav-symbol"><LogOut size={16} /></span> Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="mobile-overlay" onClick={() => setMobileNav(false)} />
      <section className="workspace">
        {/* Encabezado + campana de avisos. */}
        <header className="workspace-header">
          <button className="menu-toggle" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={18} /></button>
          <div>
            <p className="eyebrow">IE La Candelaria · PPI grado 11{demo ? " · Demo" : ""}</p>
            <h1>{view === "Inicio" ? "Hoy" : view}</h1>
          </div>
          <div className="header-user">
            <button className="notification-button" aria-label="Ver notificaciones" onClick={() => setNotificationsOpen((current) => !current)}>
              <Bell size={16} />
              {notifications.some((item) => !item.read_at) && <span className="notification-dot" />}
            </button>
            {notificationsOpen && (
              <div className="notification-panel">
                <strong>Notificaciones</strong>
                <button className="text-button" onClick={markAllRead} disabled={notificationAction}>Marcar todas como leídas</button>
                <p>{notifications.length ? `${notifications.filter((item) => !item.read_at).length} sin leer.` : "No tienes notificaciones nuevas."}</p>
                {notifications.slice(0, 5).map((item) => (
                  <button className="notification-item" key={item.id} onClick={() => markOneRead(item)}>
                    {item.title}<small>{item.body || ""}</small>
                  </button>
                ))}
              </div>
            )}
            <UserAvatar name={userName} url={profile?.avatar_url} />
          </div>
        </header>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button aria-label="Cerrar mensaje" onClick={() => setNotice("")}><X size={16} /></button>
          </div>
        )}
        <div className="content-area">
          {/* Vista activa: inicio, tareas, calendario, mensajes, perfil. */}
          {loadingData ? (
            <div className="empty-state loading-state" role="status">
              <span className="loading-spinner" />
              Cargando tu agenda...
            </div>
          ) : renderMain()}
        </div>
      </section>
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {[
          ["Inicio", House],
          ["Mis tareas", ListTodo],
          ["Calendario", CalendarDays],
          ["Mensajes", MessageCircle],
          ["Perfil", User],
        ].map(([item, Icon]) => (
          <button key={item} className={view === item ? "active" : ""} onClick={() => navigate(item)}>
            <Icon size={18} />
            {item === "Mis tareas" ? "Tareas" : item}
          </button>
        ))}
      </nav>
      {showForm && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
            <div className="modal-header">
              <div>
                <span className="eyebrow accent-label">Agenda académica</span>
                <h2 id="task-modal-title">{editingTask ? "Editar actividad" : "Nueva actividad"}</h2>
              </div>
              <button className="icon-button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario"><X size={16} /></button>
            </div>
            <TaskForm key={editingTask?.id || "new-task"} task={editingTask} onSave={saveTask} onCancel={() => setShowForm(false)} />
          </section>
        </div>
      )}
      {alarmTask && (
        <div className="modal-backdrop">
          <section className="modal alarm-modal" role="alertdialog" aria-modal="true" aria-labelledby="alarm-title">
            <span className="eyebrow accent-label">Alarma de RECORDATE</span>
            <h2 id="alarm-title">Es hora de realizar esta actividad</h2>
            <h3>{alarmTask.title}</h3>
            <p>{alarmTask.subject} · Prioridad {alarmTask.priority}</p>
            <div className="form-actions center">
              <button className="primary-button" onClick={completeAlarmTask}>Marcar como completada</button>
              <button className="text-button" onClick={() => setAlarmTask(null)}>Posponer</button>
            </div>
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
  userId,
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onFocus,
  empty,
  compact = false,
  focusOnly = false,
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
                <span className="focus-choice-icon"><Focus size={18} /></span>
                <span>
                  <b>{task.title}</b>
                  <small>{task.subject} · {formatDate(task.date)} · {task.time}</small>
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
          <p>Las actividades que agregues aparecerán aquí.</p>
        </div>
      )}
    </section>
  );
}

function Calendar({ tasks, onSelect }) {
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
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
          <h2>Calendario académico</h2>
        </div>
        <div className="calendar-controls">
          <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={16} /></button>
          <span className="calendar-month">
            {new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(firstDay)}
          </span>
          <button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="calendar-layout">
        <div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}
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
        <div className="day-agenda">
          <span className="eyebrow">{selected ? formatDate(selected) : "Agenda"}</span>
          <h3>Actividades del día</h3>
          {dayTasks.length ? dayTasks.map((task) => (
            <button className="agenda-task" key={task.id} onClick={() => onSelect(task)}>
              <span>
                <b>{task.title}</b>
                <small>{task.subject} · {task.time}</small>
              </span>
              <PriorityBadge priority={task.priority} />
            </button>
          )) : <p className="empty-copy">No tienes actividades programadas para este día.</p>}
        </div>
      </div>
    </section>
  );
}

function SharePanel({ tasks, currentUserId, email, setEmail, shared, onShare, onRevoke, onOpenAttachment }) {
  const [sharingTaskId, setSharingTaskId] = useState(null);
  const [shareTab, setShareTab] = useState("recibidas");
  const shareableTasks = tasks.filter((task) => task.userId === currentUserId && !task.completed);
  const sentShares = shared.filter((item) => item.owner_id === currentUserId);
  const receivedShares = shared.filter((item) => item.recipient_id === currentUserId);
  const share = async (task) => {
    setSharingTaskId(task.id);
    try {
      await onShare(task);
    } finally {
      setSharingTaskId(null);
    }
  };
  return (
    <section className="panel-view">
      <span className="eyebrow accent-label">Coordina con tu equipo</span>
      <h2>Compartir agendas</h2>
      <p className="panel-intro">Comparte actividades con compañeros registrados y consulta el contenido completo de las que han compartido contigo, incluidas las imágenes.</p>
      <div className="share-form">
        <label>
          Correo del compañero
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="compañero@ejemplo.com" />
        </label>
        {shareableTasks.length ? (
          <div className="share-list" aria-label="Actividades pendientes para compartir">
            {shareableTasks.map((task) => (
              <div className="share-row" key={task.id}>
                <span className="share-row-person">
                  <b>{task.title}</b>
                  <small>{task.subject} · {formatDate(task.date)}</small>
                </span>
                <button className="outline-button" onClick={() => share(task)} disabled={sharingTaskId === task.id} type="button">
                  {sharingTaskId === task.id ? "Buscando..." : "Compartir"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="share-empty" role="status">
            <strong>No tienes actividades pendientes para compartir.</strong>
            <span>Crea una actividad pendiente para enviarla a un compañero.</span>
          </div>
        )}
      </div>
      <div className="message-tabs share-tabs" role="tablist" aria-label="Agendas compartidas">
        <button type="button" role="tab" aria-selected={shareTab === "recibidas"} className={shareTab === "recibidas" ? "message-tab active" : "message-tab"} onClick={() => setShareTab("recibidas")}>
          Compartidas conmigo ({receivedShares.length})
        </button>
        <button type="button" role="tab" aria-selected={shareTab === "enviadas"} className={shareTab === "enviadas" ? "message-tab active" : "message-tab"} onClick={() => setShareTab("enviadas")}>
          Que compartí ({sentShares.length})
        </button>
      </div>
      {shareTab === "enviadas" ? (
        <div className="shared-success">
          <b>Actividades que compartiste</b>
          {sentShares.length ? sentShares.map((item) => (
            <article className="shared-card" key={item.id}>
              <div className="shared-card-head">
                <UserAvatar name={item.recipient_name || item.recipient_email || "?"} url={item.recipient_avatar_url} size="sm" />
                <span>
                  <b>{item.task || item.task_title || "Tarea compartida"}</b>
                  <small>Para {item.recipient_name || item.recipient_email}{item.recipient_role ? ` · ${roleLabel(item.recipient_role)}` : ""}</small>
                </span>
                <button className="text-button" onClick={() => onRevoke(item)}>Revocar</button>
              </div>
            </article>
          )) : <small>Aún no has compartido actividades.</small>}
        </div>
      ) : (
        <div className="shared-success received-shares">
          <b>Actividades compartidas contigo</b>
          {receivedShares.length ? receivedShares.map((item) => {
            const details = item.taskDetails || {};
            return (
              <article className="shared-card received-card" key={item.id}>
                <div className="shared-card-head">
                  <UserAvatar name={item.owner_name || item.owner_email || "?"} url={item.owner_avatar_url} size="sm" />
                  <span>
                    <b>{details.title || item.task || item.task_title || "Tarea compartida"}</b>
                    <small>De {item.owner_name || item.owner_email}{item.owner_role ? ` · ${roleLabel(item.owner_role)}` : ""}</small>
                  </span>
                  {details.priority && <PriorityBadge priority={details.priority} />}
                </div>
                <p className="task-meta">
                  {(details.subject || item.task_subject || "Sin materia")}
                  {details.date || item.task_date ? <> <span>·</span> {formatDate(details.date || item.task_date)}</> : null}
                  {(details.time || item.task_time) ? <> <span>·</span> {details.time || item.task_time}</> : null}
                </p>
                {(details.description || item.task_description) && (
                  <p className="task-description">{details.description || item.task_description}</p>
                )}
                {(details.attachments || []).length > 0 && (
                  <div className="shared-attachments">
                    {details.attachments.map((attachment) => (
                      <button className="text-button" key={attachment.id} type="button" onClick={() => onOpenAttachment?.(attachment)}>
                        <Paperclip size={14} /> Ver imagen: {attachment.file_name || "adjunto"}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          }) : <small>No tienes actividades compartidas por otros usuarios.</small>}
        </div>
      )}
    </section>
  );
}

function Chat({ message, setMessage, userId, demo = false }) {
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState("recibidos");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipient, setRecipient] = useState(null);
  const [activePeerId, setActivePeerId] = useState(null);
  const [chatError, setChatError] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);

  const refreshMessages = async () => {
    const data = demo ? demoApi.listMessages() : await listMessages();
    setMessages(data);
    return data;
  };

  useEffect(() => {
    let mounted = true;
    refreshMessages()
      .then((data) => {
        if (!mounted) return;
        setMessages(data);
      })
      .catch(() => {
        if (mounted) setChatError("No fue posible cargar tus mensajes.");
      })
      .finally(() => {
        if (mounted) setLoadingMessages(false);
      });
    if (demo) return () => { mounted = false; };
    const unsubscribe = subscribeToMessages(userId, async (payload) => {
      if (payload.eventType === "INSERT" && (payload.new.sender_id === userId || payload.new.recipient_id === userId)) {
        try {
          const data = await listMessages();
          setMessages(data);
        } catch {
          setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]);
        }
      }
      if (payload.eventType === "UPDATE") {
        setMessages((current) => current.map((item) => (item.id === payload.new.id ? { ...item, ...payload.new } : item)));
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [userId, demo]);

  const inbox = messages.filter((item) => item.recipient_id === userId);
  const sent = messages.filter((item) => item.sender_id === userId);

  const groupByPeer = (list, peerKey) => {
    const map = new Map();
    list.forEach((item) => {
      const peerId = item[peerKey];
      if (!peerId) return;
      if (!map.has(peerId)) map.set(peerId, []);
      map.get(peerId).push(item);
    });
    return Array.from(map.entries())
      .map(([peerId, items]) => {
        const latest = items[items.length - 1];
        const unread = items.filter((item) => item.recipient_id === userId && !item.read_at).length;
        const isIncoming = peerKey === "sender_id";
        return {
          peerId,
          items,
          latest,
          unread,
          name: isIncoming
            ? latest.sender_name || "Usuario"
            : latest.recipient_name || "Usuario",
          email: isIncoming ? latest.sender_email || "" : latest.recipient_email || "",
          avatar: isIncoming ? latest.sender_avatar_url : latest.recipient_avatar_url,
          role: isIncoming ? latest.sender_role : latest.recipient_role,
        };
      })
      .sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at));
  };

  const inboxThreads = groupByPeer(inbox, "sender_id");
  const sentThreads = groupByPeer(sent, "recipient_id");
  const threads = tab === "recibidos" ? inboxThreads : sentThreads;
  const activeThread = threads.find((thread) => thread.peerId === activePeerId) || null;
  const conversation = activePeerId
    ? messages.filter((item) =>
        (item.sender_id === userId && item.recipient_id === activePeerId) ||
        (item.sender_id === activePeerId && item.recipient_id === userId),
      )
    : [];

  const openThread = async (thread) => {
    setActivePeerId(thread.peerId);
    setRecipient({
      id: thread.peerId,
      full_name: thread.name,
      email: thread.email,
      avatar_url: thread.avatar,
      role: thread.role,
    });
    setRecipientEmail(thread.email || "");
    const unreadIds = thread.items.filter((item) => item.recipient_id === userId && !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;
    try {
      if (demo) demoApi.markMessagesRead(unreadIds);
      else await markMessagesRead(unreadIds);
      setMessages((current) =>
        current.map((item) =>
          unreadIds.includes(item.id) ? { ...item, read_at: item.read_at || new Date().toISOString() } : item,
        ),
      );
    } catch {
      /* lectura opcional */
    }
  };

  const send = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    try {
      setChatError("");
      setSending(true);
      if (demo) {
        const target = recipient || {
          id: activePeerId || "demo-peer",
          email: recipientEmail || "compañero@recordate.local",
          full_name: (recipientEmail || "Compañero").split("@")[0],
        };
        setRecipient(target);
        setActivePeerId(target.id);
        const sentMsg = demoApi.sendMessage(message, target.id);
        setMessages((current) => current.some((item) => item.id === sentMsg.id) ? current : [...current, sentMsg]);
        setMessage("");
        setTab("enviados");
        return;
      }
      const target = recipient || (activePeerId ? { id: activePeerId, email: recipientEmail } : await findUserByEmail(recipientEmail));
      if (!target?.id) {
        const found = await findUserByEmail(recipientEmail);
        if (!found) {
          setChatError("No encontramos un usuario con ese correo.");
          return;
        }
        setRecipient(found);
        setActivePeerId(found.id);
        const sentMsg = await sendMessage(message, found.id);
        setMessages((current) => current.some((item) => item.id === sentMsg.id) ? current : [...current, { ...sentMsg, recipient_name: found.full_name, recipient_email: found.email, recipient_avatar_url: found.avatar_url, recipient_role: found.role }]);
        setMessage("");
        setTab("enviados");
        return;
      }
      setRecipient(target);
      setActivePeerId(target.id);
      const sentMsg = await sendMessage(message, target.id);
      setMessages((current) =>
        current.some((item) => item.id === sentMsg.id)
          ? current
          : [
              ...current,
              {
                ...sentMsg,
                recipient_name: target.full_name,
                recipient_email: target.email,
                recipient_avatar_url: target.avatar_url,
                recipient_role: target.role,
              },
            ],
      );
      setMessage("");
      setTab("enviados");
    } catch (error) {
      setChatError(supabaseErrorMessage(error, "No fue posible enviar el mensaje."));
    } finally {
      setSending(false);
    }
  };

  const startNew = () => {
    setActivePeerId(null);
    setRecipient(null);
    setRecipientEmail("");
  };

  return (
    <section className="panel-view chat-view">
      <span className="eyebrow accent-label">Comunicación interna</span>
      <h2>Mensajes</h2>
      <p className="panel-intro">Revisa tu bandeja de entrada, consulta lo que enviaste y responde a tus compañeros desde RECORDATE.</p>
      <div className="message-tabs" role="tablist" aria-label="Bandejas de mensajes">
        <button type="button" role="tab" aria-selected={tab === "recibidos"} className={tab === "recibidos" ? "message-tab active" : "message-tab"} onClick={() => { setTab("recibidos"); setActivePeerId(null); }}>
          <Inbox size={16} /> Recibidos ({inbox.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "enviados"} className={tab === "enviados" ? "message-tab active" : "message-tab"} onClick={() => { setTab("enviados"); setActivePeerId(null); }}>
          <Send size={16} /> Enviados ({sent.length})
        </button>
      </div>
      <div className="chat-layout">
        <aside className="chat-threads">
          <button className="outline-button new-message-button" type="button" onClick={startNew}>Nuevo mensaje</button>
          {loadingMessages && <p className="empty-copy" role="status">Cargando mensajes...</p>}
          {!loadingMessages && !threads.length && (
            <p className="empty-copy">{tab === "recibidos" ? "No tienes mensajes recibidos." : "Aún no has enviado mensajes."}</p>
          )}
          {threads.map((thread) => (
            <button
              key={thread.peerId}
              type="button"
              className={activePeerId === thread.peerId ? "thread-item active" : "thread-item"}
              onClick={() => openThread(thread)}
            >
              <UserAvatar name={thread.name} url={thread.avatar} size="sm" />
              <span className="thread-copy">
                <b>{thread.name}</b>
                <small>{thread.latest.body}</small>
                <small className="thread-meta">
                  {formatStamp(thread.latest.created_at)}
                  {thread.role ? ` · ${roleLabel(thread.role)}` : ""}
                </small>
              </span>
              {thread.unread > 0 && <span className="unread-pill">{thread.unread}</span>}
            </button>
          ))}
        </aside>
        <div className="chat-window">
          <div className="chat-contact">
            <UserAvatar name={recipient?.full_name || "?"} url={recipient?.avatar_url} size="sm" />
            <span>
              <b>{recipient?.full_name || (activeThread?.name) || "Nuevo mensaje"}</b>
              <small>
                {recipient?.email || "Escribe el correo del destinatario"}
                {recipient?.role ? ` · ${roleLabel(recipient.role)}` : ""}
              </small>
            </span>
            {activePeerId && tab === "recibidos" && (
              <span className="reply-hint"><Reply size={14} /> Responder</span>
            )}
          </div>
          {!recipient && (
            <label className="chat-recipient">
              Destinatario
              <input
                type="email"
                value={recipientEmail}
                onChange={(event) => {
                  setRecipientEmail(event.target.value);
                  setRecipient(null);
                  setActivePeerId(null);
                }}
                placeholder="compañero@ejemplo.com"
              />
            </label>
          )}
          <div className="chat-messages">
            {loadingMessages && <p className="empty-copy" role="status">Cargando conversación...</p>}
            {!loadingMessages && !activePeerId && !recipient && (
              <p className="empty-copy">Elige una conversación o escribe un correo para iniciar un mensaje nuevo.</p>
            )}
            {!loadingMessages && (activePeerId || recipient) && !conversation.length && (
              <p className="empty-copy">Aún no hay mensajes con este compañero.</p>
            )}
            {conversation.map((item, index) => (
              <p className={item.sender_id === userId ? "outgoing" : "incoming"} key={item.id || `${item.body}-${index}`}>
                {item.body}
                <span className="chat-meta">
                  {item.created_at ? formatStamp(item.created_at) : ""}
                  {item.sender_id !== userId && item.read_at ? " · Leído" : ""}
                  {item.sender_id === userId && item.read_at ? " · Leído por el destinatario" : ""}
                </span>
              </p>
            ))}
          </div>
          <form className="chat-input" onSubmit={send}>
            <input aria-label="Escribe un mensaje" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe un mensaje..." />
            <button className="primary-button" type="submit" disabled={sending || !message.trim()}>
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </form>
          {chatError && <p className="form-error" role="alert">{chatError}</p>}
        </div>
      </div>
    </section>
  );
}

function Profile({ view, userName, email, profile, demo = false, onSettingsChange, onLogout, onEnablePush, onAvatarUpload }) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef(null);
  const onPickAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      await onAvatarUpload?.(file);
    } finally {
      setUploadingAvatar(false);
    }
  };
  return (
    <section className="panel-view profile-view">
      <span className="eyebrow accent-label">Tu cuenta</span>
      <h2>{view}</h2>
      <div className="profile-card">
        <div className="profile-avatar-wrap">
          <UserAvatar name={userName} url={profile?.avatar_url} size="lg" />
          <button
            type="button"
            className="avatar-upload-button"
            aria-label="Cambiar foto de perfil"
            disabled={uploadingAvatar}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={14} />
            {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
        </div>
        <div>
          <h3>{userName}</h3>
          <p>{email}</p>
          <span className="demo-tag">{email?.includes("recordate.local") || demo ? "CUENTA DEMO" : "CUENTA SUPABASE"}</span>
          <p className="profile-role-line">{roleLabel(profile?.role)}</p>
        </div>
      </div>
      {view === "Configuración" ? (
        <div className="settings-list">
          <label className="settings-role">
            <span>
              <b>Rol en RECORDATE</b>
              <small>Indica si eres estudiante, padre, madre, profesor o trabajador.</small>
            </span>
            <select
              value={ROLE_OPTIONS.some((item) => item.value === profile?.role) ? profile.role : "estudiante"}
              onChange={(event) => onSettingsChange({ role: event.target.value })}
              aria-label="Seleccionar rol"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>
              <b>Recordatorios automáticos</b>
              <small>Recibe avisos antes de cada entrega.</small>
            </span>
            <input type="checkbox" checked={profile?.reminders_enabled ?? true} onChange={async (event) => { if (event.target.checked && "Notification" in window && Notification.permission === "default") await Notification.requestPermission(); onSettingsChange({ reminders_enabled: event.target.checked }); }} />
          </label>
          <label>
            <span>
              <b>Notificaciones del navegador</b>
              <small>Recibe avisos aunque estés en otra pestaña.</small>
            </span>
            <input type="checkbox" checked={profile?.browser_notifications_enabled ?? false} onChange={async (event) => { if (event.target.checked && !(await onEnablePush())) return; onSettingsChange({ browser_notifications_enabled: event.target.checked }); }} />
          </label>
          <label>
            <span>
              <b>Alarmas sonoras</b>
              <small>Emite un sonido mientras RECORDATE está abierto.</small>
            </span>
            <input type="checkbox" checked={profile?.alarms_enabled ?? true} onChange={(event) => onSettingsChange({ alarms_enabled: event.target.checked })} />
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
          <span>Rol</span>
          <b>{roleLabel(profile?.role)}</b>
          <span>Fecha de registro</span>
          <b>{profile?.created_at ? new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(profile.created_at)) : "No disponible"}</b>
          <span>Proyecto</span>
          <b>Proyecto Pedagógico Integrador · Grado 11</b>
          <div className="profile-role-editor">
            <span>Cambiar rol</span>
            <select
              value={ROLE_OPTIONS.some((item) => item.value === profile?.role) ? profile.role : "estudiante"}
              onChange={(event) => onSettingsChange({ role: event.target.value })}
              aria-label="Cambiar rol del perfil"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <button className="outline-button logout-profile" onClick={onLogout}>Cerrar sesión</button>
    </section>
  );
}

export default App;
