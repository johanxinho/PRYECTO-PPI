// @ts-nocheck
// RECORDATE: portada, acceso y panel (tareas, mensajes, perfil).
import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import * as Icons from "lucide-react";
import Login from "./components/Login";
const AiChat = lazy(() => import("./components/AiChat")); // Carga diferida: solo pesa cuando hay sesión real.
const GoogleDrivePanel = lazy(() => import("./components/GoogleDrivePanel"));
import UsersDirectory from "./components/UsersDirectory";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { useI18n } from "./i18n";
import { Brand } from "./Brand";
import WebGLBackground from "./components/WebGLBackground";
import AsciiEffect from "./components/AsciiEffect";
import { MorphingText } from "./components/ui/morphing-text";
import { DiaTextReveal } from "./components/ui/dia-text-reveal";
import { hasSupabaseConfig, supabase } from "./supabaseClient";
import { DEMO_SESSION, demoApi, isDemoSession } from "./demoStore";
import { currentPath, pushRoute, resolveCurrentRoute } from "./paths";
import { ALARM_SOUNDS, DEFAULT_ALARM_SOUND, DEFAULT_ALARM_VOLUME, playAlarm, startAlarm, unlockAlarmAudio, normalizeAlarmVolume } from "./services/alarmService";
import { canUseBrowserNotifications, registerRecordateServiceWorker, requestBrowserNotificationPermission, showBrowserNotification } from "./services/notificationService";
import { enqueueAlarmTasks, removeAlarmTask } from "./services/alarmQueue";
import { taskDueAtMs } from "./services/alarmSchedule";
import { useModalFocus } from "./hooks/useModalFocus";
import GoogleClassroomPanel from "./components/GoogleClassroomPanel";
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
  SELF_ROLE_OPTIONS,
  roleLabel,
  isStaffRole,
  isAdminRole,
  isAccountDisabled,
  listManagedUsers,
  setUserStatus,
  setUserRole,
  assignTaskToUser,
} from "./dataService";
import "./recordate.css";

/* Rutas y etiquetas del menú del panel autenticado. */
const navGroups = [
  { label: "Agenda", items: [["Inicio", Icons.House], ["Mis tareas", Icons.ListTodo], ["Calendario", Icons.CalendarDays]] },
  { label: "Seguimiento", items: [["Recordatorios", Icons.Bell], ["Prioridades", Icons.Flag], ["Modo enfoque", Icons.Focus]] },
  { label: "Conecta", items: [["Compartir agendas", Icons.Share2], ["Mensajes", Icons.MessageCircle], ["Google Classroom", Icons.BookOpen], ["Google Drive", Icons.FolderOpen]] },
];
const mobilePrimaryViews = ["Inicio", "Mis tareas", "Calendario", "Mensajes"];
const routeViews = {
  "/dashboard": "Inicio",
  "/tareas": "Mis tareas",
  "/calendario": "Calendario",
  "/recordatorios": "Recordatorios",
  "/prioridades": "Prioridades",
  "/enfoque": "Modo enfoque",
  "/compartir": "Compartir agendas",
  "/mensajes": "Mensajes",
  "/classroom": "Google Classroom",
  "/drive": "Google Drive",
  "/administracion": "Administración",
  "/asignar": "Asignar tareas",
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
  "Google Classroom": "/classroom",
  "Google Drive": "/drive",
  Administración: "/administracion",
  "Asignar tareas": "/asignar",
  Perfil: "/perfil",
  Configuración: "/configuracion",
};
const navGroupKeys = {
  Agenda: "core.app.nav.groups.agenda",
  Seguimiento: "core.app.nav.groups.tracking",
  Conecta: "core.app.nav.groups.connect",
};
const viewLabelKeys = {
  Inicio: "core.app.nav.items.home",
  "Mis tareas": "core.app.nav.items.tasks",
  Calendario: "core.app.nav.items.calendar",
  Recordatorios: "core.app.nav.items.reminders",
  Prioridades: "core.app.nav.items.priorities",
  "Modo enfoque": "core.app.nav.items.focus",
  "Compartir agendas": "core.app.nav.items.share",
  Mensajes: "core.app.nav.items.messages",
  "Google Classroom": "core.app.nav.items.classroom",
  "Google Drive": "core.app.nav.items.drive",
  Administración: "core.app.nav.items.administration",
  "Asignar tareas": "core.app.nav.items.assignTasks",
  Perfil: "core.app.nav.items.profile",
  Configuración: "core.app.nav.items.settings",
};
const roleKeys = {
  estudiante: "core.app.roles.student",
  profesor: "core.app.roles.teacher",
  administrador: "core.app.roles.administrator",
  padre: "core.app.roles.father",
  madre: "core.app.roles.mother",
  trabajador: "core.app.roles.worker",
};
const priorityKeys = {
  Alta: "core.priority.high",
  Media: "core.priority.medium",
  Baja: "core.priority.low",
};
const alarmSoundKeys = {
  classic: "services.alarm.classic",
  digital: "services.alarm.digital",
  chime: "services.alarm.chime",
  gentle: "services.alarm.gentle",
};
const reminderKeys = {
  "Al momento": ["tasks.form.reminderNow"],
  "5 minutos antes": ["tasks.form.reminderMinutes", 5],
  "10 minutos antes": ["tasks.form.reminderMinutes", 10],
  "30 minutos antes": ["tasks.form.reminderMinutes", 30],
  "1 hora antes": ["tasks.form.reminderHour", 1],
  "3 horas antes": ["tasks.form.reminderHours", 3],
  "12 horas antes": ["tasks.form.reminderHours", 12],
  "24 horas antes": ["tasks.form.reminderHours", 24],
  "1 día antes": ["tasks.form.reminderDay"],
};
const localeFor = (lang) => (lang === "en" ? "en-US" : "es-CO");
const viewLabel = (t, name) => (viewLabelKeys[name] ? t(viewLabelKeys[name]) : name);
const roleText = (t, role) => t(roleKeys[role] || "core.app.roles.student");
const priorityText = (t, value) => (priorityKeys[value] ? t(priorityKeys[value]) : value);
const reminderLabel = (t, label) => {
  const entry = reminderKeys[label];
  if (!entry) return label;
  return entry.length > 1 ? t(entry[0], { count: entry[1] }) : t(entry[0]);
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
const reminderOffsets = new Map([
  ...reminderOptions,
  ["24 horas antes", 24 * 60 * 60 * 1000],
]);
const formatDate = (date, locale = "es-CO") =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
const formatStamp = (value, locale = "es-CO") =>
  new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const greeting = (t) => {
  const hour = new Date().getHours();
  if (hour < 12) return t("core.app.greeting.morning");
  if (hour < 18) return t("core.app.greeting.afternoon");
  return t("core.app.greeting.evening");
};
const vapidKey = (value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (character) => character.charCodeAt(0));
const supabaseErrorMessage = (error, fallback) => {
  const raw = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  if (/disabled_at|PGRST202|schema cache|does not exist/i.test(raw)) {
    return fallback;
  }
  const details = [error?.message].filter(Boolean);
  return details.length ? `${fallback} ${details.join(" ")}` : fallback;
};

const UserAvatar = ({ name = "?", url, size = "md", className = "" }) => {
  const { t } = useI18n();
  const initial = (name || "?").charAt(0).toUpperCase();
  const sizeClass = size === "lg" ? "profile-avatar" : size === "sm" ? "small-avatar" : "avatar";
  if (url) {
    return (
      <img
        className={`avatar-image ${sizeClass} ${className}`.trim()}
        src={url}
        alt={`Foto de ${name}`}
        alt={t("core.app.aria.avatar", { name })}
        referrerPolicy="no-referrer"
      />
    );
  }
  return <span className={`${sizeClass} ${className}`.trim()}>{initial}</span>;
};

/* Portada pública: hero, características y FAQ. */
const HERO_MORPH_TEXTS = {
  es: ["Recuerda.", "Organiza.", "Prioriza.", "Avanza."],
  en: ["Remember.", "Organize.", "Prioritize.", "Advance."],
};
function Landing({ onStart, lang = "es", onLangChange }) {
  const { t } = useI18n();
  const gazeSrc = `${import.meta.env.BASE_URL}brand/electric-gaze.jpg`;
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand light />
        <nav className="landing-nav">
          <a href="#caracteristicas">{t("core.landing.features")}</a>
          <a href="#como-funciona">{t("core.landing.howItWorks")}</a>
          <a href="#beneficios">{t("core.landing.benefits")}</a>
          <a href="#preguntas">{t("core.landing.questions")}</a>
          <a href="#manuales">{t("core.landing.manuals")}</a>
        </nav>
        <div className="landing-header-actions">
          <LanguageSwitcher lang={lang} onChange={onLangChange} />
          <button className="outline-button" onClick={onStart}>
            {t("core.action.signIn")}
          </button>
        </div>
      </header>
      <section className="hero" id="inicio">
        <div className="hero-copy">
          <span className="eyebrow accent-label">
            <DiaTextReveal text={t("core.landing.eyebrow")} />
          </span>
          <h1 className="hero-static">{t("core.landing.heroTitle")}</h1>
          <MorphingText
            className="hero-morph notranslate"
            translate="no"
            texts={HERO_MORPH_TEXTS[lang] || HERO_MORPH_TEXTS.es}
          />
          <p>
            {t("core.landing.heroDescription")}
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onStart}>
              {t("core.landing.startNow")} <Icons.ArrowRight size={16} />
            </button>
            <a className="text-button" href="#como-funciona">
              {t("core.action.learnMore")} <Icons.ArrowDown size={16} />
            </a>
          </div>
          <p className="demo-note">{t("core.landing.demoNote")}</p>
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
          <span className="eyebrow">{t("core.landing.challenge")}</span>
          <h2>{t("core.landing.challengeTitle")}</h2>
        </div>
        <p>
          {t("core.landing.challengeBody")}
        </p>
      </section>
      <section className="feature-section" id="caracteristicas">
        <div className="section-heading">
          <span className="eyebrow accent-label">{t("core.landing.featuresEyebrow")}</span>
          <h2>{t("core.landing.featuresTitle")}</h2>
        </div>
        <div className="feature-grid">
          {[
            ["01", "core.landing.feature1Title", "core.landing.feature1Body"],
            ["02", "core.landing.feature2Title", "core.landing.feature2Body"],
            ["03", "core.landing.feature3Title", "core.landing.feature3Body"],
            ["04", "core.landing.feature4Title", "core.landing.feature4Body"],
            ["05", "core.landing.feature5Title", "core.landing.feature5Body"],
            ["06", "core.landing.feature6Title", "core.landing.feature6Body"],
          ].map(([number, title, description]) => (
            <article className="feature-item" key={number}>
              <span>{number}</span>
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="benefit-band" id="beneficios">
        <div>
          <span className="eyebrow">{t("core.landing.benefitEyebrow")}</span>
          <h2>{t("core.landing.benefitTitle")}</h2>
        </div>
        <button className="primary-button" onClick={onStart}>
          {t("core.action.openRecordate")} <Icons.ArrowRight size={16} />
        </button>
      </section>
      <section className="landing-faq" id="preguntas">
        <span className="eyebrow">{t("core.landing.faqTitle")}</span>
        <div className="faq-grid">
          <div>
            <h3>{t("core.landing.faqAccountQ")}</h3>
            <p>{t("core.landing.faqAccountA")}</p>
          </div>
          <div>
            <h3>{t("core.landing.faqMobileQ")}</h3>
            <p>{t("core.landing.faqMobileA")}</p>
          </div>
          <div>
            <h3>{t("core.landing.faqShareQ")}</h3>
            <p>{t("core.landing.faqShareA")}</p>
          </div>
          <div>
            <h3>{t("core.landing.faqRemindersQ")}</h3>
            <p>{t("core.landing.faqRemindersA")}</p>
          </div>
        </div>
      </section>
      <section className="manuals-section" id="manuales">
        <div className="section-heading">
          <span className="eyebrow accent-label">{t("core.landing.docsEyebrow")}</span>
          <h2>{t("core.landing.docsTitle")}</h2>
        </div>
        <div className="manuals-list">
          {[
            ["MANUAL-DE-USUARIO.md", "core.landing.manualUser", "core.landing.manualUserDesc"],
            ["EXPLICACION-EQUIPO-RECORDATE.md", "core.landing.manualTechnical", "core.landing.manualTechnicalDesc"],
            ["PROJECT-DOCUMENTATION.md", "core.landing.manualProject", "core.landing.manualProjectDesc"],
          ].map(([fileName, title, description]) => (
            <article className="manual-item" key={fileName}>
              <div>
                <h3>{t(title)}</h3>
                <p>{t(description)}</p>
              </div>
              <a
                className="manual-download"
                href={`${import.meta.env.BASE_URL}docs/${fileName}?v=${import.meta.env.VITE_DOCS_VERSION || "dev"}`}
                download
              >
                <Icons.Download size={16} aria-hidden="true" />
                {t("core.action.downloadMd")}
              </a>
            </article>
          ))}
        </div>
      </section>
      <footer className="landing-footer">
        <Brand light />
        <p>{t("core.landing.footerTagline")}</p>
        <p className="footer-credit">
          {t("core.landing.createdBy")}{" "}
          <a href="https://northboundbrothers.netlify.app/" target="_blank" rel="noopener noreferrer">
            Northbound Brothers
          </a>
        </p>
        <span>© 2026 PPI</span>
      </footer>
    </div>
  );
}

function TaskForm({ task, onSave, onCancel, assignTarget = null }) {
  const { t } = useI18n();
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
      setError(t("core.taskForm.required"));
      return;
    }
    if (form.title.trim().length > 120 || form.subject.trim().length > 60 || form.description.trim().length > 1000) {
      setError(t("core.taskForm.limit"));
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
      {assignTarget && (
        <p className="assign-banner">
          {t("core.app.taskForm.assignBanner", { name: assignTarget.full_name, email: assignTarget.email })}
        </p>
      )}
      <div className="form-grid">
        <label>
          {t("core.taskForm.title")}
          <input data-modal-initial-focus maxLength={120} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder={t("tasks.form.titlePlaceholder")} />
        </label>
        <label>
          {t("core.taskForm.subject")}
          <input maxLength={60} value={form.subject} onChange={(event) => update("subject", event.target.value)} placeholder={t("tasks.form.subjectPlaceholder")} />
        </label>
        <label>
          {t("core.taskForm.date")}
          <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
        </label>
        <label>
          {t("core.taskForm.time")}
          <input type="time" value={form.time} onChange={(event) => update("time", event.target.value)} />
        </label>
        <label>
          {t("core.taskForm.priority")}
          <select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
            <option value="Alta">{t("core.priority.high")}</option>
            <option value="Media">{t("core.priority.medium")}</option>
            <option value="Baja">{t("core.priority.low")}</option>
          </select>
        </label>
        <label>
          {t("core.taskForm.reminder")}
          <select value={form.reminder} onChange={(event) => update("reminder", event.target.value)}>
            {reminderOptions.map(([label]) => <option key={label} value={label}>{reminderLabel(t, label)}</option>)}
          </select>
        </label>
      </div>
      <label>
        {t("core.taskForm.description")}
        <textarea maxLength={1000} value={form.description} onChange={(event) => update("description", event.target.value)} rows="3" placeholder={t("core.taskForm.descriptionPlaceholder")} />
      </label>
      <label>
        {t("core.taskForm.attach")}
        <input type="file" accept="image/*" onChange={(event) => {
          const file = event.target.files?.[0] || null;
          if (file && file.size > 5 * 1024 * 1024) {
            setError(t("services.task.imageMax"));
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
          {saving ? t("core.taskForm.saving") : task ? t("core.taskForm.save") : assignTarget ? t("core.taskForm.assign") : t("core.taskForm.create")}
        </button>
        <button className="text-button" type="button" onClick={onCancel}>{t("core.taskForm.cancel")}</button>
      </div>
    </form>
  );
}

function PriorityBadge({ priority }) {
  const { t } = useI18n();
  return <span className={`priority priority-${priority.toLowerCase()}`}>{priorityText(t, priority)}</span>;
}

function TaskCard({ task, userId, onToggle, onEdit, onDelete, onFocus, onAttachmentDelete }) {
  const { t, lang } = useI18n();
  const canManage = task.userId === userId || task.assignedBy === userId;
  const [attachmentError, setAttachmentError] = useState("");
  const openAttachment = async (attachment) => {
    try {
      setAttachmentError("");
      const url = await getAttachmentUrl(attachment.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setAttachmentError(supabaseErrorMessage(error, t("core.taskCard.openError")));
    }
  };
  return (
    <article className={`task-card ${task.completed ? "is-complete" : ""}`}>
      <button
        className="check-button"
        disabled={!canManage}
        aria-label={task.completed ? t("core.taskCard.markPending") : t("core.taskCard.markComplete")}
        onClick={() => onToggle(task.id)}
      >
        {task.completed ? <Icons.Check size={12} /> : ""}
      </button>
      <div className="task-content">
        <div className="task-heading">
          <h3>{task.title}</h3>
          <div className="task-heading-badges">
            {!canManage && <span className="shared-badge">{t("core.taskCard.shared")}</span>}
            {task.assignedBy && <span className="shared-badge">{t("core.taskCard.assigned")}</span>}
            {task.source === "google_classroom" && <span className="shared-badge">Classroom</span>}
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <p className="task-meta">
          {task.subject} <span>·</span> {formatDate(task.date, localeFor(lang))} <span>·</span> {task.time}
        </p>
        {task.description && <p className="task-description">{task.description}</p>}
        {task.attachments?.map((attachment) => (
          <span className="task-attachment" key={attachment.id}>
            <button className="text-button" onClick={() => openAttachment(attachment)}>
              <Icons.Paperclip size={14} /> {t("core.taskCard.viewImage")}
            </button>
            {canManage && (
              <button className="text-button" onClick={() => onAttachmentDelete(task.id, attachment)} aria-label={t("core.taskCard.deleteAttachment", { name: attachment.file_name })}>
                <Icons.X size={14} />
              </button>
            )}
          </span>
        ))}
        {attachmentError && <small className="form-error" role="alert">{attachmentError}</small>}
      </div>
      <div className="task-actions">
        <button className="icon-button" aria-label={t("core.taskCard.openFocus")} title={t("core.taskCard.focus")} onClick={() => onFocus(task)}>
          <Icons.Focus size={16} />
        </button>
        {canManage && (
          <button className="icon-button" aria-label={t("core.taskCard.edit")} title={t("core.taskCard.edit")} onClick={() => onEdit(task)}>
            <Icons.Pencil size={16} />
          </button>
        )}
        {canManage && (
          <button className="icon-button danger" aria-label={t("core.taskCard.delete")} title={t("core.taskCard.delete")} onClick={() => onDelete(task.id)}>
            <Icons.Trash2 size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

function App() {
  const { t, lang, setLang } = useI18n();
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
  const [alarmQueue, setAlarmQueue] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [directory, setDirectory] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const alarmTask = alarmQueue[0] || null;
  const activeAlarmTaskId = alarmTask?.id;
  const alarmedTasks = useRef(new Set());
  const snoozedUntil = useRef(new Map());
  const activeAlarm = useRef(null);
  const alarmDialogRef = useRef(null);
  const alarmPreviousFocus = useRef(null);
  const taskDialogRef = useRef(null);
  const taskPreviousFocus = useRef(null);
  const notificationButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const menuToggleRef = useRef(null);
  const wasMobileNavOpen = useRef(false);
  const demo = isDemoSession(session);
  const admin = isAdminRole(profile?.role);
  const teacher = profile?.role === "profesor" || admin;
  const closeTaskForm = useCallback(() => {
    setShowForm(false);
    setEditingTask(null);
    setAssignTarget(null);
  }, []);
  useModalFocus(showForm, taskDialogRef, taskPreviousFocus, closeTaskForm, Boolean(activeAlarmTaskId));
  useEffect(() => {
    const unlockFromGesture = () => { void unlockAlarmAudio(); };
    window.addEventListener("pointerdown", unlockFromGesture, { once: true, passive: true });
    window.addEventListener("keydown", unlockFromGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockFromGesture);
      window.removeEventListener("keydown", unlockFromGesture);
    };
  }, []);
  useEffect(() => {
    if (!mobileNav || activeAlarmTaskId) return undefined;
    const panel = sidebarRef.current;
    const focusable = panel?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || [];
    focusable[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNav(false);
        return;
      }
      if (event.key !== "Tab" || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNav, activeAlarmTaskId]);
  useEffect(() => {
    if (wasMobileNavOpen.current && !mobileNav) menuToggleRef.current?.focus();
    wasMobileNavOpen.current = mobileNav;
  }, [mobileNav]);
  const enableBrowserNotifications = async () => {
    if (demo) {
      setNotice(t("core.app.demoNotifications"));
      return false;
    }
    if (!canUseBrowserNotifications()) {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      setNotice(isIos
        ? t("core.app.iosNotifications")
        : t("core.app.unsupportedNotifications"));
      return false;
    }
    if (Notification.permission === "denied") {
      setNotice(t("core.app.blockedNotifications"));
      return false;
    }
    if (!(await requestBrowserNotificationPermission())) {
      setNotice(t("core.app.permissionDenied"));
      return false;
    }
    void unlockAlarmAudio();
    let pushReady = false;
    let pushSetupFailed = false;
    let serviceWorkerRegistration = null;
    try {
      serviceWorkerRegistration = await registerRecordateServiceWorker();
      if (!serviceWorkerRegistration) setNotice(t("core.app.serviceWorkerFailNotice"));
    } catch {
      setNotice(t("core.app.serviceWorkerFailCatch"));
    }
    if ("serviceWorker" in navigator && "PushManager" in window && import.meta.env.VITE_VAPID_PUBLIC_KEY && serviceWorkerRegistration) {
      try {
        const existing = await serviceWorkerRegistration.pushManager.getSubscription();
        const subscription = existing || await serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(import.meta.env.VITE_VAPID_PUBLIC_KEY) });
        await savePushSubscription(subscription);
        pushReady = true;
      } catch {
        pushSetupFailed = true;
      }
    } else if ("serviceWorker" in navigator && "PushManager" in window) {
      pushSetupFailed = true;
    }
    if (pushReady) {
      setNotice(t("core.app.pushEnabled"));
    } else if (pushSetupFailed) {
      setNotice(t("core.app.pushSetupFailed"));
    } else {
      setNotice(t("core.app.localNotificationsEnabled"));
    }
    return true;
  };
  useEffect(() => {
    const privatePaths = Object.keys(routeViews);
    const handleRoute = () => {
      const path = currentPath();
      const routedPath = resolveCurrentRoute(privatePaths);
      if (privatePaths.includes(routedPath)) {
        setView(routeViews[routedPath]);
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
      const settled = await Promise.allSettled([
        ensureProfile(current.user),
        listTasks(),
        listSharedTasks(),
        listNotifications(),
      ]);
      const fulfilled = (result, fallback) => (result.status === "fulfilled" ? result.value : fallback);
      if (settled[0].status === "rejected") {
        const { data: activeState } = await supabase.rpc("is_active_account");
        if (activeState === false) {
          await supabase.auth.signOut();
          setSession(null);
          setScreen("auth");
          setNotice(t("core.app.accountDisabled"));
          return;
        }
        throw settled[0].reason;
      }
      if (settled[1].status === "rejected") throw settled[1].reason;
      const currentProfile = fulfilled(settled[0], null);
      const currentTasks = fulfilled(settled[1], []);
      const currentShares = fulfilled(settled[2], []);
      const currentNotifications = fulfilled(settled[3], []);
      if (settled[2].status === "rejected" || settled[3].status === "rejected") {
        setNotice(t("core.app.partialLoad"));
      }
      setProfile(
        currentProfile,
      );
      if (isAccountDisabled(currentProfile)) {
        if (!isDemoSession(current) && supabase) await supabase.auth.signOut();
        setSession(null);
        setScreen("auth");
        setNotice(t("core.app.accountDisabled"));
        return;
      }
      setTasks(currentTasks);
      setShared(
        currentShares.map((share) => {
          const localTask = currentTasks.find((task) => task.id === share.task_id);
          return {
            ...share,
            task: share.task_title || share.task || localTask?.title || t("core.share.taskFallback"),
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
      setNotice(supabaseErrorMessage(error, t("core.app.loadError")));
    } finally {
      setLoadingData(false);
    }
  };
  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;
    let cancelled = false;
    const clearAuthParams = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("code") && !url.hash.includes("access_token")) return;
      url.searchParams.delete("code");
      url.searchParams.delete("type");
      url.hash = "";
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    };
    supabase.auth.getSession().then(({ data: { session: current }, error }) => {
      if (cancelled) return;
      if (error) {
        setNotice(t("core.app.sessionError"));
        return;
      }
      clearAuthParams();
      setSession(current);
      loadUserData(current);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, current) => {
      if (cancelled) return;
      setSession(current);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setScreen("auth");
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") clearAuthParams();
      loadUserData(current);
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session || demo) return undefined;
    const unsubscribe = subscribeToNotifications(session.user.id, (payload) => {
      const item = payload.new;
      setNotifications((current) => current.some((notification) => notification.id === item.id) ? current : [item, ...current]);
      if (profile?.browser_notifications_enabled && item.type !== "system") {
        void showBrowserNotification({
          title: item.title || t("core.app.notificationTitle"),
          body: item.body || t("core.app.notificationBody"),
          taskId: item.task_id,
          tag: `recordate-${item.id}`,
        });
      }
    });
    return unsubscribe;
  }, [session, demo, profile?.browser_notifications_enabled]);
  useEffect(() => {
    if (!profile?.reminders_enabled) return undefined;
    const checkReminders = () => {
      const now = Date.now();
      const dueAlarms = [];
      tasks.filter((task) => !task.completed).forEach((task) => {
        const offset = reminderOffsets.get(task.reminder) ?? 0;
        const dueAt = taskDueAtMs(task);
        if (!Number.isFinite(dueAt)) return;
        const reminderAt = snoozedUntil.current.get(task.id) || (dueAt - offset);
        if (now < reminderAt || now > dueAt + 60 * 60 * 1000 || alarmedTasks.current.has(task.id)) return;
        alarmedTasks.current.add(task.id);
        snoozedUntil.current.delete(task.id);
        if (profile.alarms_enabled) dueAlarms.push(task);
        if (profile.browser_notifications_enabled) {
          void showBrowserNotification({
            title: t("core.app.alarmTitle"),
            body: t("core.app.alarmBody", { title: task.title, subject: task.subject, priority: priorityText(t, task.priority) }),
            taskId: task.id,
            tag: `recordate-alarm-${task.id}`,
          });
        }
      });
      if (dueAlarms.length) {
        setAlarmQueue((current) => enqueueAlarmTasks(current, dueAlarms));
      }
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") checkReminders();
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 15000);
    window.addEventListener("focus", checkReminders);
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkReminders);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [profile, tasks]);
  useEffect(() => {
    if (!activeAlarmTaskId || !profile?.alarms_enabled) return undefined;
    let cancelled = false;
    void startAlarm(profile.alarm_sound || DEFAULT_ALARM_SOUND, profile.alarm_volume ?? DEFAULT_ALARM_VOLUME)
      .then((handle) => {
        if (cancelled) {
          handle?.stop();
          return;
        }
        activeAlarm.current = handle;
        if (!handle) setNotice(t("core.app.alarmBlocked"));
      });
    return () => {
      cancelled = true;
      activeAlarm.current?.stop();
      activeAlarm.current = null;
    };
  }, [activeAlarmTaskId, profile?.alarms_enabled, profile?.alarm_sound, profile?.alarm_volume]);
  const userName = profile?.full_name || session?.user?.email?.split("@")[0] || t("core.app.roles.student");
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
  const modalOpen = showForm || Boolean(activeAlarmTaskId);
  const saveTask = async (task) => {
    try {
      let saved;
      if (assignTarget && !editingTask?.id) {
        saved = demo
          ? demoApi.assignTask(assignTarget.id, task)
          : await assignTaskToUser(assignTarget.id, task);
      } else {
        saved = demo
          ? demoApi.saveTask({ ...task, id: editingTask?.id })
          : editingTask?.id
            ? await updateTask(task)
            : await createTask(task);
      }
      const attachment = !demo && !assignTarget && task.attachmentFile
        ? await uploadTaskAttachment(saved.id, task.attachmentFile)
        : null;
      const savedTask = attachment
        ? { ...saved, attachments: [...(saved.attachments || []), attachment] }
        : saved;
      const scheduleChanged = editingTask?.id && (
        editingTask.date !== savedTask.date ||
        String(editingTask.time || "").slice(0, 5) !== String(savedTask.time || "").slice(0, 5) ||
        (editingTask.timeZone || "America/Bogota") !== (savedTask.timeZone || "America/Bogota") ||
        editingTask.reminder !== savedTask.reminder
      );
      if (scheduleChanged) {
        alarmedTasks.current.delete(savedTask.id);
        snoozedUntil.current.delete(savedTask.id);
        setAlarmQueue((current) => removeAlarmTask(current, savedTask.id));
      }
      setTasks((current) =>
        editingTask?.id
          ? current.map((item) => (item.id === savedTask.id ? savedTask : item))
          : [savedTask, ...current],
      );
      closeTaskForm();
      setNotice(assignTarget ? t("core.app.taskAssigned", { name: assignTarget.full_name }) : t("core.app.taskSaved"));
      return true;
    } catch (error) {
      setNotice(supabaseErrorMessage(error, t("core.app.saveError")));
      return false;
    }
  };
  const removeTask = async (id) => {
    if (!window.confirm(t("core.app.confirmDeleteTask"))) return;
    try {
      if (demo) demoApi.deleteTask(id);
      else await deleteTask(id);
      setTasks((current) => current.filter((task) => task.id !== id));
      setAlarmQueue((current) => removeAlarmTask(current, id));
      alarmedTasks.current.delete(id);
      snoozedUntil.current.delete(id);
      setNotice(t("core.app.taskDeleted"));
    } catch (error) {
      setNotice(supabaseErrorMessage(error, t("core.app.deleteTaskError")));
    }
  };
  const toggleTask = async (id) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return false;
    try {
      const updated = demo
        ? demoApi.saveTask({ ...task, completed: !task.completed })
        : await updateTask({ ...task, completed: !task.completed });
      setTasks((current) => current.map((item) => (item.id === id ? updated : item)));
      setFocusTask((current) => (current?.id === id ? updated : current));
      if (updated.completed) {
        setAlarmQueue((current) => removeAlarmTask(current, id));
        snoozedUntil.current.delete(id);
      }
      return true;
    } catch (error) {
      setNotice(supabaseErrorMessage(error, t("core.app.updateTaskError")));
      return false;
    }
  };
  const completeAlarmTask = async () => {
    activeAlarm.current?.stop();
    activeAlarm.current = null;
    if (alarmTask) {
      const completed = await toggleTask(alarmTask.id);
      if (completed) setAlarmQueue((current) => removeAlarmTask(current, alarmTask.id));
    }
  };
  const snoozeAlarmTask = () => {
    if (!alarmTask) return;
    activeAlarm.current?.stop();
    activeAlarm.current = null;
    snoozedUntil.current.set(alarmTask.id, Date.now() + 5 * 60 * 1000);
    alarmedTasks.current.delete(alarmTask.id);
    setAlarmQueue((current) => removeAlarmTask(current, alarmTask.id));
    setNotice(t("core.app.alarmSnoozed"));
  };
  const dismissAlarmTask = () => {
    activeAlarm.current?.stop();
    activeAlarm.current = null;
    if (alarmTask) setAlarmQueue((current) => removeAlarmTask(current, alarmTask.id));
  };
  const retryAlarmSound = async () => {
    activeAlarm.current?.stop();
    activeAlarm.current = null;
    const handle = await startAlarm(profile?.alarm_sound || DEFAULT_ALARM_SOUND, profile?.alarm_volume ?? DEFAULT_ALARM_VOLUME);
    if (!handle) {
      setNotice(t("core.app.alarmStartError"));
      return;
    }
    activeAlarm.current = handle;
    setNotice(t("core.app.alarmSoundEnabled"));
  };
  useEffect(() => {
    if (!activeAlarmTaskId) {
      const previousFocus = alarmPreviousFocus.current;
      alarmPreviousFocus.current = null;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      return undefined;
    }
    const dialog = alarmDialogRef.current;
    if (!alarmPreviousFocus.current) alarmPreviousFocus.current = document.activeElement;
    const focusable = dialog?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || [];
    dialog?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        activeAlarm.current?.stop();
        activeAlarm.current = null;
        setAlarmQueue((current) => removeAlarmTask(current, activeAlarmTaskId));
        return;
      }
      if (event.key !== "Tab" || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusIsOutside = !dialog?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog || focusIsOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog || focusIsOutside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeAlarmTaskId]);
  const previewAlarm = async (sound, volume) => {
    const played = await playAlarm(sound, volume);
    setNotice(played
      ? t("core.app.alarmPreviewSuccess")
      : (Number(volume) === 0 ? t("core.app.alarmVolumeZero") : t("core.app.alarmPreviewBlocked")));
  };
  const testBrowserNotification = async () => {
    if (!(await enableBrowserNotifications())) return;
    const shown = await showBrowserNotification({
      title: t("core.app.testNotificationTitle"),
      body: t("core.app.testNotificationBody"),
      tag: "recordate-test-notification",
    });
    if (!shown) setNotice(t("core.app.testNotificationError"));
  };
  const importClassroomTask = async (assignment, reminder = "30 minutos antes") => {
    if (demo) {
      setNotice(t("core.app.classroomLoginRequired"));
      return false;
    }
    if (tasks.some((task) => task.source === "google_classroom" && task.externalId === assignment.externalId)) {
      setNotice(t("core.app.classroomDuplicate"));
      return false;
    }
    try {
      const imported = await createTask({ ...assignment, reminder });
      setTasks((current) => [imported, ...current]);
      const alarmsActive = (profile?.reminders_enabled ?? true) && (profile?.alarms_enabled ?? true);
      setNotice(alarmsActive
        ? t("core.app.classroomAlarmAdded", { title: assignment.title, reminder: reminderLabel(t, reminder) })
        : t("core.app.classroomTaskAdded", { title: assignment.title }));
      return true;
    } catch (error) {
      setNotice(supabaseErrorMessage(error, t("core.app.classroomImportError")));
      return false;
    }
  };
  const removeAttachment = async (taskId, attachment) => {
    if (demo) {
      setNotice(t("core.app.attachmentsDemo"));
      return;
    }
    try {
      await deleteTaskAttachment(attachment);
      setTasks((current) => current.map((task) => task.id === taskId ? { ...task, attachments: task.attachments.filter((item) => item.id !== attachment.id) } : task));
      setNotice(t("core.app.imageDeleted"));
    } catch (error) {
      setNotice(supabaseErrorMessage(error, t("core.app.imageDeleteError")));
    }
  };
  const logout = async () => {
    if (supabase && !demo) await supabase.auth.signOut();
    activeAlarm.current?.stop();
    activeAlarm.current = null;
    alarmPreviousFocus.current = null;
    alarmedTasks.current.clear();
    snoozedUntil.current.clear();
    setAlarmQueue([]);
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
      setNotice(supabaseErrorMessage(error, t("core.app.markAllNotificationsError")));
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
      setNotice(supabaseErrorMessage(error, t("core.app.markNotificationError")));
    }
  };
  const openTaskForm = (task = null, target = null, previousFocus = document.activeElement) => {
    taskPreviousFocus.current = previousFocus instanceof HTMLElement ? previousFocus : null;
    setEditingTask(task);
    setAssignTarget(target);
    setShowForm(true);
  };
  const openNotification = async (notification) => {
    const opener = notificationButtonRef.current;
    await markOneRead(notification);
    setNotificationsOpen(false);
    if (!notification.task_id) return;
    const task = tasks.find((item) => item.id === notification.task_id);
    navigate("Mis tareas");
    if (!task) {
      setNotice(t("core.app.notificationTaskMissing"));
      return;
    }
    openTaskForm(task, null, opener);
  };
  const navigate = (nextView) => {
    setView(nextView);
    const route = viewRoutes[nextView];
    if (route && currentPath() !== route) pushRoute(route);
    setMobileNav(false);
    setFocusTask(null);
  };
  const openNewTask = () => openTaskForm();
  const loadDirectory = useCallback(async () => {
    if (!isStaffRole(profile?.role)) return;
    setDirectoryLoading(true);
    try {
      const rows = demo ? demoApi.listUsers() : await listManagedUsers();
      setDirectory(rows);
    } catch (error) {
      setNotice(supabaseErrorMessage(error, t("core.app.directoryError")));
    } finally {
      setDirectoryLoading(false);
    }
  }, [demo, profile?.role]);
  useEffect(() => {
    if ((view === "Administración" || view === "Asignar tareas") && isStaffRole(profile?.role)) {
      const timer = window.setTimeout(() => { void loadDirectory(); }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [view, loadDirectory, profile?.role]);
  const taskHandlers = {
    userId: session?.user?.id,
    onToggle: toggleTask,
    onEdit: (task) => openTaskForm(task),
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
  if (screen === "landing") return frame(<Landing onStart={() => setScreen("auth")} lang={lang} onLangChange={setLang} />);
  if (!session || passwordRecovery) {
    return frame(
      <Login
        recovery={passwordRecovery}
        lang={lang}
        onLangChange={setLang}
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
          <div className="focus-orbit"><Icons.Focus size={28} /></div>
          <span className="eyebrow accent-label">{t("core.app.focus.eyebrow")}</span>
          <h2>{focusTask.title}</h2>
          <p className="task-meta">{focusTask.subject} · {formatDate(focusTask.date, localeFor(lang))} · {focusTask.time}</p>
          <p>{focusTask.description || t("core.app.focus.description")}</p>
          <div className="focus-status">
            <PriorityBadge priority={focusTask.priority} />
            <span>{focusTask.completed ? t("core.app.focus.completed") : t("core.app.focus.pending")}</span>
          </div>
          <button className="primary-button" onClick={() => setFocusTask(null)}>{t("core.app.focus.exit")}</button>
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
              <span className="eyebrow">{t("core.app.tasks.subtitle")}</span>
              <h2>{t("core.app.tasks.title")}</h2>
            </div>
            <button className="primary-button" onClick={openNewTask}><Icons.Plus size={16} /> {t("core.app.tasks.newActivity")}</button>
          </section>
          <div className="search-wrap" aria-label={t("core.app.tasks.filters")}>
            <select aria-label={t("core.app.tasks.filterPriority")} value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
              <option value="">{t("core.app.tasks.allPriorities")}</option>
              <option value="Alta">{t("core.priority.high")}</option>
              <option value="Media">{t("core.priority.medium")}</option>
              <option value="Baja">{t("core.priority.low")}</option>
            </select>
            <select aria-label={t("core.app.tasks.filterStatus")} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">{t("core.app.tasks.allStatuses")}</option>
              <option value="Pendiente">{t("core.app.tasks.pending")}</option>
              <option value="Completada">{t("core.app.tasks.completed")}</option>
            </select>
            <input type="date" aria-label={t("core.app.tasks.filterDate")} value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
          </div>
          <TaskList {...taskHandlers} tasks={visibleTasks} empty={t("core.app.tasks.empty")} />
        </>
      );
    }
    if (view === "Recordatorios") {
      return <TaskList {...taskHandlers} title={t("core.app.reminders.title")} subtitle={t("core.app.reminders.subtitle")} tasks={pending} empty={t("core.app.reminders.empty")} />;
    }
    if (view === "Prioridades") {
      return (
        <TaskList
          {...taskHandlers}
          title={t("core.app.priorities.title")}
          subtitle={t("core.app.priorities.subtitle")}
          tasks={[...pending].sort((a, b) => ["Alta", "Media", "Baja"].indexOf(a.priority) - ["Alta", "Media", "Baja"].indexOf(b.priority))}
          empty={t("core.app.priorities.empty")}
        />
      );
    }
    if (view === "Modo enfoque") {
      return (
        <TaskList
          {...taskHandlers}
          title={t("core.app.focus.eyebrow")}
          subtitle={t("core.app.focus.subtitle")}
          tasks={pending}
          onEdit={() => {}}
          onDelete={() => {}}
          empty={t("core.app.focus.empty")}
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
              setNotice(supabaseErrorMessage(error, t("core.app.share.openImageError")));
            }
          }}
          onRevoke={async (share) => {
            try {
              if (demo) demoApi.revoke(share.id);
              else await revokeSharedTask(share.id);
              setShared((current) => current.filter((item) => item.id !== share.id));
              setNotice(t("core.app.share.revoked"));
            } catch (error) {
              setNotice(supabaseErrorMessage(error, t("core.app.share.revokeError")));
            }
          }}
          onShare={async (task) => {
            const normalizedEmail = shareEmail.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
              setNotice(t("core.app.share.invalidEmail"));
              return false;
            }
            try {
              if (demo) {
                const createdShare = demoApi.share(task.id, normalizedEmail);
                setShared((current) => [...current, createdShare]);
                setShareEmail("");
                setNotice(t("core.app.share.demoSuccess"));
                return true;
              }
              const recipient = await findUserByEmail(normalizedEmail);
              if (!recipient) {
                setNotice(t("core.app.share.userMissing"));
                return false;
              }
              if (recipient.id === session.user.id) {
                setNotice(t("core.app.share.selfError"));
                return false;
              }
              if (shared.some((share) => share.task_id === task.id && share.recipient_id === recipient.id)) {
                setNotice(t("core.app.share.duplicate"));
                return false;
              }
              const createdShare = await shareTask(task.id, recipient.email);
              setShared((current) => [
                ...current,
                { ...createdShare, task: task.title, recipient_email: recipient.email, recipient_name: recipient.full_name },
              ]);
              setShareEmail("");
              setNotice(t("core.app.share.success"));
              return true;
            } catch (error) {
              setNotice(supabaseErrorMessage(error, t("core.app.share.error")));
              return false;
            }
          }}
        />
      );
    }
    if (view === "Mensajes") {
      return <Chat message={message} setMessage={setMessage} userId={session.user.id} demo={demo} />;
    }
    if (view === "Google Classroom") {
      return <GoogleClassroomPanel profile={profile} tasks={tasks} demo={demo} onImport={importClassroomTask} />;
    }
    if (view === "Google Drive") {
      return (
        <Suspense fallback={<p className="empty-copy" role="status">{t("core.app.drive.loading")}</p>}>
          <GoogleDrivePanel demo={demo} />
        </Suspense>
      );
    }
    if ((view === "Administración" && admin) || (view === "Asignar tareas" && teacher)) {
      return (
        <UsersDirectory
          mode={view === "Administración" ? "admin" : "teacher"}
          profile={profile}
          users={directory}
          loading={directoryLoading}
          busyId={busyUserId}
          onAssign={(user) => openTaskForm(null, user)}
          onSetRole={async (user, role) => {
            if (!window.confirm(t("core.app.admin.confirmRole", { name: user.full_name, role: roleText(t, role) }))) return;
            setBusyUserId(user.id);
            try {
              const updated = demo ? demoApi.setUserRole(user.id, role) : await setUserRole(user.id, role);
              setDirectory((current) => current.map((item) => (item.id === user.id ? { ...item, ...updated, role } : item)));
              setNotice(t("core.app.admin.roleChanged", { name: user.full_name, role: roleText(t, role).toLowerCase() }));
            } catch (error) {
              setNotice(supabaseErrorMessage(error, t("core.app.admin.roleError")));
            } finally {
              setBusyUserId(null);
            }
          }}
          onSetStatus={async (user, status) => {
            const label = status === "baja" ? t("core.app.admin.deactivate") : t("core.app.admin.reactivate");
            if (!window.confirm(t("core.app.admin.confirmStatus", { action: label, name: user.full_name }))) return;
            setBusyUserId(user.id);
            try {
              const updated = demo ? demoApi.setUserStatus(user.id, status) : await setUserStatus(user.id, status);
              setDirectory((current) => current.map((item) => (item.id === user.id ? { ...item, ...updated, status } : item)));
              setNotice(status === "baja" ? t("core.app.admin.deactivated", { name: user.full_name }) : t("core.app.admin.reactivated", { name: user.full_name }));
            } catch (error) {
              setNotice(supabaseErrorMessage(error, t("core.app.admin.statusError")));
            } finally {
              setBusyUserId(null);
            }
          }}
        />
      );
    }
    if (view === "Perfil" || view === "Configuración") {
      return (
        <Profile
          view={view}
          userName={userName}
          email={session.user.email}
          profile={profile}
          demo={demo}
          onEnableNotifications={enableBrowserNotifications}
          onTestNotification={testBrowserNotification}
          onPreviewAlarm={previewAlarm}
          onOpenClassroom={() => navigate("Google Classroom")}
          onOpenDrive={() => navigate("Google Drive")}
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
                setNotice(t("core.app.profile.avatarUpdated"));
                return;
              }
              const updatedProfile = await uploadAvatar(file);
              setProfile(updatedProfile);
              setNotice(t("core.app.profile.avatarUpdated"));
            } catch (error) {
              setNotice(supabaseErrorMessage(error, t("core.app.profile.avatarError")));
            }
          }}
          onSettingsChange={async (settings) => {
            try {
              const updatedProfile = demo ? demoApi.saveProfile(settings) : await updateProfileSettings(settings);
              setProfile(updatedProfile);
              setNotice(t("core.app.profile.settingsSaved"));
            } catch (error) {
              setNotice(supabaseErrorMessage(error, t("core.app.profile.settingsError")));
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
            <span className="eyebrow">{new Intl.DateTimeFormat(localeFor(lang), { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
            <h1>{greeting(t)}, {userName}.</h1>
            <p>
              {stats.today
                ? t(stats.today === 1 ? "core.app.dashboard.oneToday" : "core.app.dashboard.manyToday", { count: stats.today })
                : t("core.app.dashboard.noneToday")}
            </p>
          </div>
          <button className="primary-button add-task-button" onClick={openNewTask}>
            <Icons.Plus size={16} /> {t("core.app.dashboard.newActivity")}
          </button>
        </section>
        <Stats stats={stats} />
        <div className="panel-card progress-card">
          <span className="eyebrow">{t("core.app.dashboard.progress")}</span>
          <strong>{progress}%</strong>
          <p className="lead">{t("core.app.dashboard.progressCaption")}</p>
          <div className="progress-track" aria-hidden="true"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="dash-grid">
          <div>
            <section className="section-title">
              <div>
                <span className="eyebrow">{t("core.app.dashboard.planner")}</span>
                <h2>{query ? t("core.app.dashboard.searchResults") : t("core.app.dashboard.importantTasks")}</h2>
              </div>
              <button className="text-button" onClick={() => navigate("Mis tareas")}>{t("core.app.dashboard.viewAll")} <Icons.ArrowRight size={14} /></button>
            </section>
            <div className="search-wrap">
              <Icons.Search size={16} />
              <input aria-label={t("core.app.dashboard.searchLabel")} placeholder={t("core.app.dashboard.searchLabel")} value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <TaskList {...taskHandlers} tasks={visibleTasks.filter((task) => !task.completed).slice(0, 4)} empty={t("core.app.dashboard.noPending")} compact />
          </div>
          <aside className="panel-card">
            <span className="eyebrow">{t("core.app.dashboard.today")}</span>
            <h2>{t("core.app.dashboard.todayAgenda")}</h2>
            {todayTasks.length ? todayTasks.map((task) => (
              <button className="agenda-task" key={task.id} onClick={() => setFocusTask(task)}>
                <span>
                  <b>{task.title}</b>
                  <small>{task.subject} · {task.time}</small>
                </span>
                <PriorityBadge priority={task.priority} />
              </button>
            )) : <p className="empty-copy">{t("core.app.dashboard.nothingScheduled")}</p>}
            <button className="text-button calendar-link" onClick={() => navigate("Calendario")}>
              {t("core.app.dashboard.openCalendar")} <Icons.ArrowRight size={14} />
            </button>
          </aside>
        </div>
        <div className="quick-actions">
          <button className="quick-action" onClick={openNewTask}>
            <Icons.Plus size={18} />
            <b>{t("core.app.dashboard.createTask")}</b>
            <small>{t("core.app.dashboard.createTaskHint")}</small>
          </button>
          <button className="quick-action" onClick={() => navigate("Modo enfoque")}>
            <Icons.Focus size={18} />
            <b>{t("core.app.dashboard.focusMode")}</b>
            <small>{t("core.app.dashboard.focusHint")}</small>
          </button>
          <button className="quick-action" onClick={() => navigate("Mensajes")}>
            <Icons.MessageCircle size={18} />
            <b>{t("core.app.dashboard.writeMessage")}</b>
            <small>{t("core.app.dashboard.messageHint")}</small>
          </button>
        </div>
      </>
    );
  };
  return frame(
    <main className="app-shell">
      {/* Menú lateral con grupos para que las funciones nuevas sean fáciles de encontrar. */}
      <aside id="app-sidebar" ref={sidebarRef} className={`sidebar ${mobileNav ? "is-open" : ""}`} inert={modalOpen} aria-hidden={modalOpen ? "true" : undefined} role={mobileNav ? "dialog" : undefined} aria-modal={mobileNav ? "true" : undefined} aria-label={t("core.app.aria.mainMenu")}>
        <div className="sidebar-head">
          <Brand light size="sm" />
          <LanguageSwitcher lang={lang} onChange={setLang} />
          <button className="close-nav" onClick={() => setMobileNav(false)} aria-label={t("core.app.aria.closeMenu")}><Icons.X size={18} /></button>
        </div>
        <nav aria-label={t("core.app.aria.primaryNavigation")}>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="sidebar-caption">{navGroupKeys[group.label] ? t(navGroupKeys[group.label]) : group.label}</p>
              {group.items.map(([item, Icon]) => (
                <button className={view === item ? "nav-item active" : "nav-item"} key={item} onClick={() => navigate(item)}>
                  <span className="nav-symbol" aria-hidden="true"><Icon size={16} /></span>
                  {viewLabel(t, item)}
                </button>
              ))}
            </div>
          ))}
          {(admin || teacher) && (
            <div className="nav-group">
              <p className="sidebar-caption">{t("core.app.nav.management")}</p>
              {admin && <button className={view === "Administración" ? "nav-item active" : "nav-item"} onClick={() => navigate("Administración")}><span className="nav-symbol"><Icons.Shield size={16} /></span> {t("core.app.nav.administration")}</button>}
              {teacher && <button className={view === "Asignar tareas" ? "nav-item active" : "nav-item"} onClick={() => navigate("Asignar tareas")}><span className="nav-symbol"><Icons.Users size={16} /></span> {t("core.app.nav.assignTasks")}</button>}
            </div>
          )}
        </nav>
        <div className="sidebar-bottom">
          <button className={view === "Perfil" ? "nav-item active" : "nav-item"} onClick={() => navigate("Perfil")}>
            <span className="nav-symbol"><Icons.User size={16} /></span> {t("core.app.nav.profile")}
          </button>
          <button className={view === "Configuración" ? "nav-item active" : "nav-item"} onClick={() => navigate("Configuración")}>
            <span className="nav-symbol"><Icons.Settings size={16} /></span> {t("core.app.nav.settings")}
          </button>
          <button className="nav-item logout" onClick={logout}>
            <span className="nav-symbol"><Icons.LogOut size={16} /></span> {t("core.app.nav.logout")}
          </button>
        </div>
      </aside>
      <div className="mobile-overlay" inert={modalOpen} aria-hidden="true" onClick={() => setMobileNav(false)} />
      <section className="workspace" inert={mobileNav || modalOpen} aria-hidden={mobileNav || modalOpen ? "true" : undefined}>
        {/* Encabezado + campana de avisos. */}
        <header className="workspace-header">
          <button ref={menuToggleRef} className="menu-toggle" onClick={() => setMobileNav(true)} aria-label={t("core.app.aria.openMenu")} aria-expanded={mobileNav} aria-controls="app-sidebar"><Icons.Menu size={18} /></button>
          <div>
            <p className="eyebrow">{t("core.app.header.school")}{demo ? ` · ${t("core.app.header.demo")}` : ""}</p>
            <h1>{view === "Inicio" ? t("core.app.nav.today") : viewLabel(t, view)}</h1>
          </div>
          <div className="header-user">
            <button ref={notificationButtonRef} className="notification-button" aria-label={t("core.app.aria.notifications")} onClick={() => setNotificationsOpen((current) => !current)}>
              <Icons.Bell size={16} />
              {notifications.some((item) => !item.read_at) && <span className="notification-dot" />}
            </button>
            {notificationsOpen && (
              <div className="notification-panel">
                <strong>{t("core.profile.notifications")}</strong>
                <button className="text-button" onClick={markAllRead} disabled={notificationAction}>{t("core.app.notifications.markAllRead")}</button>
                <p>{notifications.length ? t("core.app.notifications.unread", { count: notifications.filter((item) => !item.read_at).length }) : t("core.app.notifications.none")}</p>
                {notifications.slice(0, 5).map((item) => (
                  <button className="notification-item" key={item.id} onClick={() => openNotification(item)}>
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
            <button aria-label={t("core.app.aria.closeMessage")} onClick={() => setNotice("")}><Icons.X size={16} /></button>
          </div>
        )}
        <div className="content-area">
          {/* Vista activa: inicio, tareas, calendario, mensajes, perfil. */}
          {loadingData ? (
            <div className="empty-state loading-state" role="status">
              <span className="loading-spinner" />
              {t("core.app.loading")}
            </div>
          ) : renderMain()}
        </div>
      </section>
      <nav className="bottom-nav" aria-label={t("core.app.aria.mobileNavigation")} inert={mobileNav || modalOpen} aria-hidden={mobileNav || modalOpen ? "true" : undefined}>
        {[
          ["Inicio", Icons.House],
          ["Mis tareas", Icons.ListTodo],
          ["Calendario", Icons.CalendarDays],
          ["Mensajes", Icons.MessageCircle],
        ].map(([item, Icon]) => (
          <button key={item} className={view === item ? "active" : ""} onClick={() => navigate(item)}>
            <Icon size={18} />
            {viewLabel(t, item)}
          </button>
        ))}
        <button className={!mobilePrimaryViews.includes(view) ? "active" : ""} aria-label={t("core.app.aria.moreSections")} aria-expanded={mobileNav} aria-controls="app-sidebar" onClick={() => setMobileNav(true)}>
          <Icons.MoreHorizontal size={18} />
          {t("core.app.nav.more")}
        </button>
      </nav>
      {showForm && (
        <div className="modal-backdrop" inert={Boolean(activeAlarmTaskId)} aria-hidden={activeAlarmTaskId ? "true" : undefined}>
          <section ref={taskDialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" tabIndex={-1}>
            <div className="modal-header">
              <div>
                <span className="eyebrow accent-label">{t("core.app.taskForm.eyebrow")}</span>
                <h2 id="task-modal-title">{editingTask ? t("core.app.taskForm.edit") : assignTarget ? t("core.app.taskForm.assign") : t("core.app.taskForm.new")}</h2>
              </div>
              <button className="icon-button" onClick={closeTaskForm} aria-label={t("core.app.aria.closeForm")}><Icons.X size={16} /></button>
            </div>
            <TaskForm
              key={editingTask?.id || assignTarget?.id || "new-task"}
              task={editingTask}
              assignTarget={assignTarget}
              onSave={saveTask}
              onCancel={closeTaskForm}
            />
          </section>
        </div>
      )}
      {!demo && hasSupabaseConfig && (
        <div inert={mobileNav || modalOpen} aria-hidden={mobileNav || modalOpen ? "true" : undefined}>
          <Suspense fallback={null}>
            <AiChat
              enabled
              onTaskCreated={(task) => {
                setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
                setNotice(t("core.app.alarmCreated", { title: task.title }));
              }}
            />
          </Suspense>
        </div>
      )}
      {alarmTask && (
        <div className="modal-backdrop">
          <section ref={alarmDialogRef} className="modal alarm-modal" role="alertdialog" aria-modal="true" aria-labelledby="alarm-title" tabIndex={-1}>
            <span className="eyebrow accent-label">{t("core.app.alarm.title")}</span>
            <h2 id="alarm-title">{t("core.app.alarm.prompt")}</h2>
            <h3>{alarmTask.title}</h3>
            <p>{alarmTask.subject} · {t("core.app.priority.label")} {priorityText(t, alarmTask.priority)}</p>
            <div className="form-actions center">
              <button className="primary-button" onClick={completeAlarmTask}>{t("core.app.alarm.complete")}</button>
              <button className="outline-button" onClick={retryAlarmSound}><Icons.Volume2 size={15} /> {t("core.app.alarm.retrySound")}</button>
              <button className="text-button" onClick={snoozeAlarmTask}>{t("core.app.alarm.snooze")}</button>
              <button className="text-button" onClick={dismissAlarmTask}>{t("core.app.alarm.stop")}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Stats({ stats }) {
  const { t } = useI18n();
  return (
    <section className="stats-grid">
      {[
        ["core.stats.pending", stats.pending, "core.stats.pendingCaption", "green"],
        ["core.stats.today", stats.today, "core.stats.todayCaption", "gold"],
        ["core.stats.high", stats.high, "core.stats.highCaption", "coral"],
        ["core.stats.done", stats.done, "core.stats.doneCaption", "ink"],
      ].map(([label, value, caption, tone]) => (
        <article className={`stat-card stat-${tone}`} key={label}>
          <span>{t(label)}</span>
          <strong>{value}</strong>
          <small>{t(caption)}</small>
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
                <span className="focus-choice-icon"><Icons.Focus size={18} /></span>
                <span>
                  <b>{task.title}</b>
                  <small>{task.subject} · {formatDate(task.date, localeFor(lang))} · {task.time}</small>
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
          <Icons.ListTodo size={28} />
          <h3>{empty}</h3>
          <p>{t("core.taskList.emptyHint")}</p>
        </div>
      )}
    </section>
  );
}

function Calendar({ tasks, onSelect }) {
  const { t, lang } = useI18n();
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
          <span className="eyebrow">{t("core.calendar.view")}</span>
          <h2>{t("core.calendar.title")}</h2>
        </div>
        <div className="calendar-controls">
          <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label={t("core.calendar.prev")}><Icons.ChevronLeft size={16} /></button>
          <span className="calendar-month">
            {new Intl.DateTimeFormat(localeFor(lang), { month: "long", year: "numeric" }).format(firstDay)}
          </span>
          <button className="icon-button" onClick={() => shiftMonth(1)} aria-label={t("core.calendar.next")}><Icons.ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="calendar-layout">
        <div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["tasks.calendar.weekday.mon", "tasks.calendar.weekday.tue", "tasks.calendar.weekday.wed", "tasks.calendar.weekday.thu", "tasks.calendar.weekday.fri", "tasks.calendar.weekday.sat", "tasks.calendar.weekday.sun"].map((day) => <span key={day}>{t(day)}</span>)}
          </div>
          <div className="calendar-days">
            {Array.from({ length: firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 }).map((_, index) => (
              <span className="calendar-day calendar-day-empty" key={`empty-${index}`} aria-hidden="true" />
            ))}
            {days.map((day) => (
              <button className={selected === day ? "calendar-day selected" : "calendar-day"} key={day} onClick={() => setSelected(day)}>
                <span>{new Intl.DateTimeFormat(localeFor(lang), { weekday: "short" }).format(new Date(`${day}T12:00:00`))}</span>
                <b>{new Date(`${day}T12:00:00`).getDate()}</b>
                <i className={tasks.some((task) => task.date === day && !task.completed) ? "has-task" : ""} />
              </button>
            ))}
          </div>
        </div>
        <div className="day-agenda">
          <span className="eyebrow">{selected ? formatDate(selected, localeFor(lang)) : t("core.app.nav.groups.agenda")}</span>
          <h3>{t("core.calendar.day")}</h3>
          {dayTasks.length ? dayTasks.map((task) => (
            <button className="agenda-task" key={task.id} onClick={() => onSelect(task)}>
              <span>
                <b>{task.title}</b>
                <small>{task.subject} · {task.time}</small>
              </span>
              <PriorityBadge priority={task.priority} />
            </button>
          )) : <p className="empty-copy">{t("core.calendar.empty")}</p>}
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
      <span className="eyebrow accent-label">{t("core.share.eyebrow")}</span>
      <h2>{t("core.share.title")}</h2>
      <p className="panel-intro">{t("core.share.intro")}</p>
      <div className="share-form">
        <label>
          {t("core.share.email")}
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("core.share.emailPlaceholder")} />
        </label>
        {shareableTasks.length ? (
          <div className="share-list" aria-label={t("core.share.pendingLabel")}>
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
                        <Icons.Paperclip size={14} /> Ver imagen: {attachment.file_name || "adjunto"}
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

  useEffect(() => {
    let mounted = true;
    const loadMessages = async () => {
      try {
        const data = await Promise.resolve().then(() => demo ? demoApi.listMessages() : listMessages());
        if (mounted) setMessages(data);
      } catch {
        if (mounted) setChatError("No fue posible cargar tus mensajes.");
      } finally {
        if (mounted) setLoadingMessages(false);
      }
    };
    const loadTimer = window.setTimeout(() => { void loadMessages(); }, 0);
    if (demo) return () => { mounted = false; window.clearTimeout(loadTimer); };
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
      window.clearTimeout(loadTimer);
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
          <Icons.Inbox size={16} /> Recibidos ({inbox.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "enviados"} className={tab === "enviados" ? "message-tab active" : "message-tab"} onClick={() => { setTab("enviados"); setActivePeerId(null); }}>
          <Icons.Send size={16} /> Enviados ({sent.length})
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
              <span className="reply-hint"><Icons.Reply size={14} /> Responder</span>
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
                placeholder={t("core.share.emailPlaceholder")}
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

function Profile({ view, userName, email, profile, demo = false, onSettingsChange, onLogout, onEnableNotifications, onTestNotification, onPreviewAlarm, onAvatarUpload, onOpenClassroom, onOpenDrive }) {
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
      <h2>{NAV_LABEL_KEYS[view] ? t(NAV_LABEL_KEYS[view]) : view}</h2>
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
            <Icons.Camera size={14} />
            {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
        </div>
        <div>
          <h3>{userName}</h3>
          <p>{email}</p>
          <span className="demo-tag">{email?.includes("recordate.local") || demo ? t("core.profile.demoAccount") : t("core.profile.cloudAccount")}</span>
          <p className="profile-role-line">{roleLabel(isAdminRole(profile?.role) ? "administrador" : profile?.role)}</p>
        </div>
      </div>
      {view === "Configuración" ? (
        <>
        <p className="settings-intro">{t("core.profile.settingsIntro")}</p>
        <div className="settings-list">
          <section className="settings-group">
            <div className="settings-group-heading"><Icons.UserRound size={17} /><div><h3>{t("core.profile.accountGroup")}</h3><p>{t("core.profile.personalize")}</p></div></div>
            <label>
              <span><b>{t("core.profile.role")}</b><small>{t("core.profile.roleHelp")}</small></span>
              <select value={SELF_ROLE_OPTIONS.some((item) => item.value === profile?.role) ? profile.role : (isStaffRole(profile?.role) ? profile.role : "estudiante")} onChange={(event) => onSettingsChange({ role: event.target.value })} aria-label={t("core.profile.selectRole")} disabled={isStaffRole(profile?.role)}>
                {(isStaffRole(profile?.role) ? ROLE_OPTIONS : SELF_ROLE_OPTIONS).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span><b>{t("core.profile.showCompleted")}</b><small>{t("core.profile.showCompletedHelp")}</small></span>
              <input type="checkbox" checked={profile?.show_completed ?? true} onChange={(event) => onSettingsChange({ show_completed: event.target.checked })} />
            </label>
          </section>
          <section className="settings-group">
            <div className="settings-group-heading"><Icons.CalendarClock size={17} /><div><h3>{t("core.profile.reminders")}</h3><p>{t("core.profile.remindersHelp")}</p></div></div>
            <label>
              <span><b>{t("core.profile.autoReminders")}</b><small>{t("core.profile.autoRemindersHelp")}</small></span>
              <input type="checkbox" checked={profile?.reminders_enabled ?? true} onChange={(event) => onSettingsChange({ reminders_enabled: event.target.checked })} />
            </label>
          </section>
          <section className="settings-group">
            <div className="settings-group-heading"><Icons.Volume2 size={17} /><div><h3>{t("core.profile.alarms")}</h3><p>{t("core.profile.alarmsHelp")}</p></div></div>
            <label>
              <span><b>{t("core.profile.soundAlarms")}</b><small>{t("core.profile.soundAlarmsHelp")}</small></span>
              <input type="checkbox" checked={profile?.alarms_enabled ?? true} onChange={(event) => onSettingsChange({ alarms_enabled: event.target.checked })} />
            </label>
            <div className="alarm-settings">
              <label>
                <span><b>{t("core.profile.alarmSound")}</b><small>{t("core.profile.alarmSoundHelp")}</small></span>
                <select value={profile?.alarm_sound || DEFAULT_ALARM_SOUND} onChange={(event) => onSettingsChange({ alarm_sound: event.target.value })}>{ALARM_SOUNDS.map((sound) => <option key={sound.value} value={sound.value}>{sound.label}</option>)}</select>
              </label>
              <label>
                <span><b>{t("core.profile.volume")}</b><small>{Math.round((profile?.alarm_volume ?? DEFAULT_ALARM_VOLUME) * 100)}%</small></span>
                <input type="range" min="0" max="1" step="0.05" value={profile?.alarm_volume ?? DEFAULT_ALARM_VOLUME} onChange={(event) => onSettingsChange({ alarm_volume: normalizeAlarmVolume(event.target.value) })} />
              </label>
              <button className="text-button" type="button" onClick={() => onPreviewAlarm?.(profile?.alarm_sound || DEFAULT_ALARM_SOUND, profile?.alarm_volume ?? DEFAULT_ALARM_VOLUME)}><Icons.Play size={15} /> {t("core.profile.previewAlarm")}</button>
            </div>
          </section>
          <section className="settings-group">
            <div className="settings-group-heading"><Icons.BellRing size={17} /><div><h3>{t("core.profile.notifications")}</h3><p>{t("core.profile.notificationsHelp")}</p></div></div>
            <label>
              <span><b>{t("core.profile.browserNotifications")}</b><small>{t("core.profile.browserNotificationsHelp")}</small></span>
              <input type="checkbox" checked={profile?.browser_notifications_enabled ?? false} onChange={async (event) => { if (event.target.checked && !(await onEnableNotifications())) return; onSettingsChange({ browser_notifications_enabled: event.target.checked }); }} />
            </label>
            <div className="settings-action-row">
              <span><b>{t("core.profile.testNotification")}</b><small>{t("core.profile.testHelp")}</small></span>
              <button className="outline-button" type="button" onClick={onTestNotification}>{t("core.profile.test")}</button>
            </div>
            <p className="settings-hint">{t("core.profile.pushHint")}</p>
          </section>
          <section className="settings-group">
            <div className="settings-group-heading"><Icons.Plug size={17} /><div><h3>{t("core.profile.integrations")}</h3><p>{t("core.profile.integrationsHelp")}</p></div></div>
            <div className="settings-action-row integration-action">
              <span><b>Google Classroom</b><small>{t("core.profile.classroomHelp")}</small></span>
              <button className="outline-button" type="button" onClick={onOpenClassroom}><Icons.BookOpen size={15} /> {t("core.profile.open")}</button>
            </div>
            <div className="settings-action-row integration-action">
              <span><b>Google Drive</b><small>{t("core.profile.driveHelp")}</small></span>
              <button className="outline-button" type="button" onClick={onOpenDrive}><Icons.FolderOpen size={15} /> {t("core.profile.open")}</button>
            </div>
            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && <p className="settings-hint">{t("core.profile.clientIdHint")}</p>}
            <p className="settings-hint">{t("core.profile.geminiHint")}</p>
          </section>
        </div>
        </>
      ) : (
        <div className="profile-info">
          <span>{t("core.profile.institution")}</span>
          <b>IE La Candelaria · Medellín</b>
          <span>{t("core.profile.roleShort")}</span>
          <b>{roleLabel(isAdminRole(profile?.role) ? "administrador" : profile?.role)}</b>
          <span>{t("core.profile.registrationDate")}</span>
          <b>{profile?.created_at ? new Intl.DateTimeFormat(localeFor(lang), { dateStyle: "long" }).format(new Date(profile.created_at)) : t("core.profile.unavailable")}</b>
          <span>{t("core.profile.project")}</span>
          <b>{t("core.profile.projectTitle")}</b>
          <div className="profile-role-editor">
            <span>{t("core.profile.changeRole")}</span>
            <select
              value={SELF_ROLE_OPTIONS.some((item) => item.value === profile?.role) ? profile.role : (isStaffRole(profile?.role) ? profile.role : "estudiante")}
              onChange={(event) => onSettingsChange({ role: event.target.value })}
              aria-label={t("core.profile.changeRoleAria")}
              disabled={isStaffRole(profile?.role)}
            >
              {(isStaffRole(profile?.role) ? ROLE_OPTIONS : SELF_ROLE_OPTIONS).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <button className="outline-button logout-profile" onClick={onLogout}>{t("core.profile.logout")}</button>
    </section>
  );
}

export default App;
