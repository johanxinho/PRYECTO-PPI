// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react"; // trae los hooks de React que usa la app
import { // abre la lista de iconos de Lucide
  House, // icono de inicio
  ListTodo, // icono de lista de tareas
  CalendarDays, // icono de calendario
  Bell, // icono de notificaciones
  Flag, // icono de prioridades
  Focus, // icono de modo enfoque
  Share2, // icono de compartir
  MessageCircle, // icono de mensajes
  User, // icono de perfil
  Settings, // icono de configuración
  LogOut, // icono de cerrar sesión
  Plus, // icono de agregar
  Search, // icono de búsqueda
  Menu, // icono del menú móvil
  X, // icono para cerrar
  Check, // icono de tarea completada
  Pencil, // icono de editar
  Trash2, // icono de eliminar
  ArrowRight, // flecha hacia la derecha
  ArrowDown, // flecha hacia abajo
  ChevronLeft, // chevron del mes anterior
  ChevronRight, // chevron del mes siguiente
  Paperclip, // icono de archivo adjunto
} from "lucide-react"; // cierra el import de iconos Lucide
import Login from "./components/Login"; // importa la pantalla de inicio de sesión
import { Brand } from "./Brand"; // importa el logo de RECORDATE
import WebGLBackground from "./components/WebGLBackground"; // importa el fondo animado WebGL
import AsciiEffect from "./components/AsciiEffect"; // importa el efecto ASCII de la landing
import { MorphingText } from "./components/ui/morphing-text"; // importa el texto que cambia de palabra
import { DiaTextReveal } from "./components/ui/dia-text-reveal"; // importa la revelación animada de texto
import { hasSupabaseConfig, supabase } from "./supabaseClient"; // importa el cliente y la bandera de Supabase
import { DEMO_SESSION, demoApi, isDemoSession } from "./demoStore"; // importa la sesión y API de demostración
import { currentPath, pushRoute, assetUrl } from "./paths"; // importa helpers de ruta y de assets
import { // abre las funciones del servicio de datos
  createTask, // crea una tarea en la base
  deleteTask, // elimina una tarea
  ensureProfile, // asegura que el perfil del usuario exista
  listTasks, // lista las tareas del usuario
  listMessages, // lista los mensajes
  sendMessage, // envía un mensaje
  shareTask, // comparte una tarea
  subscribeToMessages, // se suscribe a mensajes en vivo
  updateProfileSettings, // actualiza la configuración del perfil
  updateTask, // actualiza una tarea
  listSharedTasks, // lista las tareas compartidas
  revokeSharedTask, // revoca un acceso compartido
  findUserByEmail, // busca un usuario por correo
  listNotifications, // lista las notificaciones
  markNotificationRead, // marca una notificación como leída
  markAllNotificationsRead, // marca todas las notificaciones como leídas
  savePushSubscription, // guarda la suscripción Web Push
  uploadTaskAttachment, // sube una imagen adjunta
  getAttachmentUrl, // obtiene la URL de un adjunto
  deleteTaskAttachment, // elimina un adjunto
  subscribeToNotifications, // se suscribe a notificaciones en vivo
} from "./dataService"; // cierra el import del servicio de datos
import "./recordate.css"; // carga los estilos globales de RECORDATE

const navItems = [ // nombres de las vistas del menú lateral
  "Inicio", // vista del dashboard
  "Mis tareas", // vista de todas las tareas
  "Calendario", // vista de calendario
  "Recordatorios", // vista de recordatorios
  "Prioridades", // vista ordenada por prioridad
  "Modo enfoque", // vista para concentrarse
  "Compartir agendas", // vista para compartir tareas
  "Mensajes", // vista del chat
]; // cierra el arreglo de nombres del menú
const navIcons = [House, ListTodo, CalendarDays, Bell, Flag, Focus, Share2, MessageCircle]; // icono que corresponde a cada ítem del menú
const routeViews = { // mapea cada ruta de la URL a una vista
  "/dashboard": "Inicio", // dashboard principal
  "/tareas": "Mis tareas", // listado de tareas
  "/calendario": "Calendario", // calendario
  "/recordatorios": "Recordatorios", // recordatorios
  "/prioridades": "Prioridades", // prioridades
  "/enfoque": "Modo enfoque", // modo enfoque
  "/compartir": "Compartir agendas", // compartir
  "/mensajes": "Mensajes", // chat
  "/perfil": "Perfil", // perfil del usuario
  "/configuracion": "Configuración", // ajustes
}; // cierra el mapa ruta → vista
const viewRoutes = { // mapea cada vista a su ruta de URL
  Inicio: "/dashboard", // ruta del dashboard
  "Mis tareas": "/tareas", // ruta de tareas
  Calendario: "/calendario", // ruta del calendario
  Recordatorios: "/recordatorios", // ruta de recordatorios
  Prioridades: "/prioridades", // ruta de prioridades
  "Modo enfoque": "/enfoque", // ruta de enfoque
  "Compartir agendas": "/compartir", // ruta de compartir
  Mensajes: "/mensajes", // ruta de mensajes
  Perfil: "/perfil", // ruta de perfil
  Configuración: "/configuracion", // ruta de configuración
}; // cierra el mapa vista → ruta

/** Convierte una fecha a YYYY-MM-DD usando la zona local. */
const localDate = (date = new Date()) => { // formatea una fecha al formato ISO local
  const year = date.getFullYear(); // obtiene el año
  const month = String(date.getMonth() + 1).padStart(2, "0"); // mes con dos dígitos (enero = 01)
  const day = String(date.getDate()).padStart(2, "0"); // día con dos dígitos
  return `${year}-${month}-${day}`; // une año, mes y día con guiones
}; // cierra localDate
const today = localDate(); // guarda la fecha de hoy ya formateada
const reminderOptions = [ // opciones de recordatorio: texto y milisegundos de anticipación
  ["Al momento", 0], // avisa exactamente a la hora
  ["5 minutos antes", 5 * 60 * 1000], // 5 minutos en milisegundos
  ["10 minutos antes", 10 * 60 * 1000], // 10 minutos en milisegundos
  ["30 minutos antes", 30 * 60 * 1000], // 30 minutos en milisegundos
  ["1 hora antes", 60 * 60 * 1000], // 1 hora en milisegundos
  ["3 horas antes", 3 * 60 * 60 * 1000], // 3 horas en milisegundos
  ["12 horas antes", 12 * 60 * 60 * 1000], // 12 horas en milisegundos
  ["24 horas antes", 24 * 60 * 60 * 1000], // 24 horas en milisegundos
  ["1 día antes", 24 * 60 * 60 * 1000], // 1 día (igual a 24 horas)
]; // cierra las opciones de recordatorio
const formatDate = (date) => // formatea una fecha YYYY-MM-DD para mostrarla al usuario
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format( // usa formato colombiano corto
    new Date(`${date}T12:00:00`), // mediodía evita desfases de zona horaria
  ); // cierra el formatDate
const formatStamp = (value) => // formatea una hora (hora:minuto) para el chat
  new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); // convierte el valor a Date y lo formatea // * Devuelve el saludo según la hora actual del día.
const greeting = () => { // elige el saludo según la hora
  const hour = new Date().getHours(); // hora actual de 0 a 23
  if (hour < 12) return "Buenos días"; // mañana
  if (hour < 18) return "Buenas tardes"; // tarde
  return "Buenas noches"; // noche
}; // cierra greeting
const vapidKey = (value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (character) => character.charCodeAt(0)); // convierte la clave VAPID a bytes para Web Push // * Arma un mensaje de error legible a partir de un error de Supabase.
const supabaseErrorMessage = (error, fallback) => { // une código, mensaje y detalles del error
  const details = [error?.code && `Código: ${error.code}`, error?.message, error?.details && `Detalles: ${error.details}`, error?.hint && `Sugerencia: ${error.hint}`].filter(Boolean); // junta las partes que existan
  return details.length ? `${fallback} ${details.join(" | ")}` : fallback; // si hay detalles los agrega; si no, usa el fallback
}; // cierra supabaseErrorMessage

/** True si el aviso describe un error (para pintar el notice en rojo). */
const isErrorNotice = (text) => /no (fue|fue posible|encontramos|existe)|error|incorrect|inválid|imposible|falla|falló|requiere/i.test(text || "");

/** Valida un correo con un patrón simple (suficiente para UX). */
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

/** Traduce el rol de perfil a español para la ficha de cuenta. */
const roleLabel = (role) => ({ student: "Estudiante", teacher: "Docente", admin: "Administración" }[role] || role || "Estudiante");

/**
 * Landing: página pública de RECORDATE.
 * Se muestra cuando el usuario aún no ha iniciado sesión.
 */
function Landing({ onStart }) { // recibe el callback que abre el login
  const gazeSrc = `${import.meta.env.BASE_URL}brand/electric-gaze.jpg`; // ruta de la imagen del efecto ASCII
  return ( // empieza el JSX de la landing
    <div className="landing"> {/* contenedor de toda la página de bienvenida */}
      <header className="landing-header"> {/* cabecera con logo, menú y botón */}
        <Brand light /> {/* logo claro de RECORDATE */}
        <nav className="landing-nav" aria-label="Secciones de la página"> {/* menú de anclas de la landing */}
          <a href="#caracteristicas">Características</a> {/* salta a características */}
          <a href="#como-funciona">Cómo funciona</a> {/* salta a cómo funciona */}
          <a href="#beneficios">Beneficios</a> {/* salta a beneficios */}
          <a href="#preguntas">Preguntas</a> {/* salta a preguntas frecuentes */}
        </nav> {/* cierra el menú de anclas */}
        <button className="outline-button" onClick={onStart}> {/* abre el login */}
          Iniciar sesión // texto del botón
        </button> {/* cierra el botón de iniciar sesión */}
      </header> {/* cierra la cabecera */}
      <section className="hero" id="inicio"> {/* sección principal del héroe */}
        <div className="hero-copy"> {/* textos del héroe */}
          <span className="eyebrow accent-label"> {/* etiqueta superior del PPI */}
            <DiaTextReveal text="PPI · IE La Candelaria · Grado 11" /> {/* texto revelado del colegio */}
          </span> {/* cierra la etiqueta superior */}
          <h1 className="hero-static">Tu día académico.</h1> {/* título fijo */}
          <MorphingText // texto que rota entre verbos
            className="hero-morph" // clase del morph
            texts={["Recuerda.", "Organiza.", "Prioriza.", "Avanza."]} // palabras que se van sustituyendo
          /> {/* cierra MorphingText */}
          <p> {/* párrafo de presentación */}
            RECORDATE es la agenda académica para estudiantes que quieren claridad:
            tareas, fechas, prioridades y recordatorios en un solo espacio.
          </p> {/* cierra el párrafo de presentación */}
          <div className="hero-actions"> {/* botones de acción del héroe */}
            <button className="primary-button" onClick={onStart}> {/* empieza el registro/login */}
              Comenzar ahora <ArrowRight size={16} /> {/* texto e icono de avanzar */}
            </button> {/* cierra el botón primario */}
            <a className="text-button" href="#como-funciona"> {/* ancla a cómo funciona */}
              Conocer más <ArrowDown size={16} /> {/* texto e icono hacia abajo */}
            </a> {/* cierra el enlace de conocer más */}
          </div> {/* cierra las acciones del héroe */}
          <p className="demo-note">Puedes explorar la experiencia con el acceso de demostración.</p> {/* nota de la demo */}
        </div> {/* cierra los textos del héroe */}
        <div className="hero-visual"> {/* columna visual derecha */}
          <div className="ascii-stage"> {/* escenario del efecto ASCII */}
            <span className="logo-caption">Electric Gaze</span> {/* título de la ilustración */}
            <AsciiEffect // renderiza la foto como arte ASCII
              src={gazeSrc} // imagen de origen
              config={{ // parámetros visuales del efecto
                cellSize: 6, // tamaño de cada celda ASCII
                brightness: 18, // brillo
                contrast: 118, // contraste
                density: 28, // densidad de caracteres
              }} // cierra la config
            /> {/* cierra AsciiEffect */}
          </div> {/* cierra el escenario ASCII */}
        </div> {/* cierra la columna visual */}
      </section> {/* cierra el héroe */}
      <section className="problem-band" id="como-funciona"> {/* banda del problema */}
        <div> {/* bloque de título */}
          <span className="eyebrow">El reto del día a día</span> {/* etiqueta pequeña */}
          <h2>Menos olvido. Más control sobre tu tiempo.</h2> {/* título de la banda */}
        </div> {/* cierra el bloque de título */}
        <p> {/* explicación del problema */}
          Cuando se acumulan tareas, trabajos y fechas importantes, priorizar se vuelve difícil.
          RECORDATE convierte esa carga en una agenda clara, pensada para estudiantes de la IE La Candelaria.
        </p> {/* cierra la explicación */}
      </section> {/* cierra la banda del problema */}
      <section className="feature-section" id="caracteristicas"> {/* sección de características */}
        <div className="section-heading"> {/* encabezado de la sección */}
          <span className="eyebrow accent-label">Todo en un mismo lugar</span> {/* etiqueta */}
          <h2>Una herramienta hecha para tu ritmo académico.</h2> {/* título */}
        </div> {/* cierra el encabezado */}
        <div className="feature-grid"> {/* grilla de las 6 características */}
          {[ // arreglo de número, título y descripción
            ["01", "Registra tus actividades", "Crea tareas con materia, fecha, hora, descripción y prioridad."], // característica 1
            ["02", "Recibe recordatorios", "Configura avisos para llegar a tiempo a cada entrega."], // característica 2
            ["03", "Concéntrate mejor", "El modo enfoque deja frente a ti una sola actividad."], // característica 3
            ["04", "Coordina con tu equipo", "Comparte agendas y conversa con tus compañeros."], // característica 4
            ["05", "Encuentra rápido", "Busca por título, materia o descripción en tiempo real."], // característica 5
            ["06", "Marca tu avance", "Completa actividades y visualiza tu progreso real."], // característica 6
          ].map(([number, title, description]) => ( // recorre cada característica
            <article className="feature-item" key={number}> {/* tarjeta de una característica */}
              <span>{number}</span> {/* número de la tarjeta */}
              <h3>{title}</h3> {/* título de la tarjeta */}
              <p>{description}</p> {/* descripción de la tarjeta */}
            </article> // cierra la tarjeta
          ))} // cierra el map de características
        </div> {/* cierra la grilla */}
      </section> {/* cierra características */}
      <section className="benefit-band" id="beneficios"> {/* banda de beneficios */}
        <div> {/* bloque de texto */}
          <span className="eyebrow">Una idea del PPI hecha producto</span> {/* etiqueta */}
          <h2>Claridad para estudiar. Tranquilidad para avanzar.</h2> {/* título */}
        </div> {/* cierra el bloque de texto */}
        <button className="primary-button" onClick={onStart}> {/* llama al login */}
          Abrir RECORDATE <ArrowRight size={16} /> {/* texto e icono */}
        </button> {/* cierra el botón */}
      </section> {/* cierra beneficios */}
      <section className="landing-faq" id="preguntas"> {/* preguntas frecuentes */}
        <span className="eyebrow">Preguntas frecuentes</span> {/* etiqueta */}
        <div className="faq-grid"> {/* grilla de 4 preguntas */}
          <div> {/* pregunta 1 */}
            <h3>¿Necesito crear una cuenta?</h3> {/* enunciado */}
            <p>Sí, para guardar tu agenda en la nube con Supabase. También puedes explorar una demostración local.</p> {/* respuesta */}
          </div> {/* cierra pregunta 1 */}
          <div> {/* pregunta 2 */}
            <h3>¿Funciona en el celular?</h3> {/* enunciado */}
            <p>Sí. La navegación se adapta a iPhone y Android con un menú inferior y pantallas pensadas para una mano.</p> {/* respuesta */}
          </div> {/* cierra pregunta 2 */}
          <div> {/* pregunta 3 */}
            <h3>¿Puedo compartir tareas?</h3> {/* enunciado */}
            <p>Puedes compartir actividades con compañeros registrados y revocar el acceso cuando lo necesites.</p> {/* respuesta */}
          </div> {/* cierra pregunta 3 */}
          <div> {/* pregunta 4 */}
            <h3>¿Hay recordatorios?</h3> {/* enunciado */}
            <p>Configura avisos por actividad. Las alarmas suenan mientras RECORDATE está abierto.</p> {/* respuesta */}
          </div> {/* cierra pregunta 4 */}
        </div> {/* cierra la grilla FAQ */}
      </section> {/* cierra preguntas */}
      <footer className="landing-footer"> {/* pie de la landing */}
        <Brand light /> {/* logo claro */}
        <p>Sistema de recordatorio de actividades académicas · Medellín, Antioquia</p> {/* descripción institucional */}
        <span>© 2026 PPI</span> {/* créditos del proyecto */}
      </footer> {/* cierra el pie */}
    </div> // cierra el contenedor landing
  ); // cierra el return de Landing
} // cierra el componente Landing

/**
 * TaskForm: formulario para crear o editar una actividad.
 * Se abre en el modal cuando el usuario pulsa “Nueva actividad” o “Editar”.
 */
function TaskForm({ task, onSave, onCancel }) { // recibe la tarea (si edita) y los callbacks
  const [form, setForm] = useState( // estado de los campos del formulario
    task || { // si hay tarea, la usa; si no, valores vacíos
      title: "", // título vacío al crear
      subject: "", // materia vacía al crear
      date: "", // fecha vacía al crear
      time: "", // hora vacía al crear
      priority: "Media", // prioridad por defecto
      description: "", // descripción vacía
      reminder: "30 minutos antes", // recordatorio por defecto
    }, // cierra el objeto inicial
  ); // cierra el useState del formulario
  const [error, setError] = useState(""); // mensaje de validación
  const [attachmentFile, setAttachmentFile] = useState(null); // archivo de imagen elegido
  const [saving, setSaving] = useState(false); // indica si está guardando
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value })); // actualiza un campo sin perder los demás
  const submit = (event) => { // se ejecuta al enviar el formulario
    event.preventDefault(); // evita recargar la página
    if (!form.title.trim() || !form.subject.trim() || !form.date || !form.time) { // valida campos obligatorios
      setError("Completa título, materia, fecha y hora para guardar la actividad."); // muestra el error
      return; // no continúa el guardado
    } // cierra la validación
    setSaving(true); // marca que está guardando
    onSave({ // llama al padre con los datos
      ...form, // copia todos los campos
      attachmentFile, // incluye el archivo si hay
      ...(task?.id ? { id: task.id } : {}), // conserva el id si está editando
      completed: task?.completed ?? false, // conserva el estado de completada
    }).finally(() => setSaving(false)); // al terminar, quita el estado de guardado
  }; // cierra submit
  return ( // empieza el JSX del formulario
    <form className="task-form" onSubmit={submit} noValidate> {/* formulario sin validación nativa del navegador */}
      <div className="form-grid"> {/* grilla de campos cortos */}
        <label> {/* campo título */}
          Título // etiqueta visible
          <input autoFocus value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Ej. Entrega de taller" /> {/* input controlado del título */}
        </label> {/* cierra título */}
        <label> {/* campo materia */}
          Materia // etiqueta visible
          <input value={form.subject} onChange={(event) => update("subject", event.target.value)} placeholder="Ej. Matemáticas" /> {/* input controlado de la materia */}
        </label> {/* cierra materia */}
        <label> {/* campo fecha */}
          Fecha // etiqueta visible
          <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /> {/* selector de fecha */}
        </label> {/* cierra fecha */}
        <label> {/* campo hora */}
          Hora // etiqueta visible
          <input type="time" value={form.time} onChange={(event) => update("time", event.target.value)} /> {/* selector de hora */}
        </label> {/* cierra hora */}
        <label> {/* campo prioridad */}
          Prioridad // etiqueta visible
          <select value={form.priority} onChange={(event) => update("priority", event.target.value)}> {/* selector de prioridad */}
            <option>Alta</option> {/* opción alta */}
            <option>Media</option> {/* opción media */}
            <option>Baja</option> {/* opción baja */}
          </select> {/* cierra el select de prioridad */}
        </label> {/* cierra prioridad */}
        <label> {/* campo recordatorio */}
          Recordatorio // etiqueta visible
          <select value={form.reminder} onChange={(event) => update("reminder", event.target.value)}> {/* selector de aviso */}
            {reminderOptions.map(([label]) => <option key={label}>{label}</option>)} {/* una opción por cada etiqueta */}
          </select> {/* cierra el select de recordatorio */}
        </label> {/* cierra recordatorio */}
      </div> {/* cierra la grilla */}
      <label> {/* campo descripción */}
        Descripción // etiqueta visible
        <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows="3" placeholder="Agrega detalles para recordar qué debes hacer..." /> {/* área de texto */}
      </label> {/* cierra descripción */}
      <label> {/* campo de imagen */}
        Adjuntar imagen // etiqueta visible
        <input type="file" accept="image/*" onChange={(event) => { {/* solo acepta imágenes */}
          const file = event.target.files?.[0] || null; // toma el primer archivo o null
          if (file && file.size > 5 * 1024 * 1024) { // rechaza archivos mayores a 5 MB
            setError("La imagen no puede superar los 5 MB."); // avisa el límite
            setAttachmentFile(null); // no guarda el archivo
            event.target.value = ""; // limpia el input
            return; // sale del handler
          } // cierra la validación de tamaño
          setError(""); // limpia errores previos
          setAttachmentFile(file); // guarda el archivo válido
        }} /> {/* cierra el input de archivo */}
      </label> {/* cierra adjuntar imagen */}
      {error && <p className="form-error" role="alert">{error}</p>} {/* muestra el error si existe */}
      <div className="form-actions"> {/* botones del formulario */}
        <button className="primary-button" type="submit" disabled={saving}> {/* envía el formulario */}
          {saving ? "Guardando..." : task ? "Guardar cambios" : "Crear tarea"} // texto según el estado
        </button> {/* cierra el botón de guardar */}
        <button className="text-button" type="button" onClick={onCancel}>Cancelar</button> {/* cierra sin guardar */}
      </div> {/* cierra las acciones */}
    </form> // cierra el formulario
  ); // cierra el return de TaskForm
} // cierra el componente TaskForm

/**
 * PriorityBadge: etiqueta de color según Alta, Media o Baja.
 * Se usa en tarjetas, calendario y modo enfoque.
 */
function PriorityBadge({ priority }) { // recibe el texto de prioridad
  const label = priority || "Media"; // evita crash si falta el valor
  return <span className={`priority priority-${label.toLowerCase()}`}>{label}</span>; // pinta la clase CSS según la prioridad
} // cierra PriorityBadge

/**
 * TaskCard: tarjeta de una actividad con completar, editar, eliminar y enfoque.
 * Se renderiza dentro de TaskList.
 */
function TaskCard({ task, userId, onToggle, onEdit, onDelete, onFocus, onAttachmentDelete }) { // handlers que llegan del padre
  const canManage = task.userId === userId; // solo el dueño puede editar o completar
  const [attachmentError, setAttachmentError] = useState(""); // error al abrir la imagen
  const openAttachment = async (attachment) => { // abre el adjunto en una pestaña
    try { // intenta obtener la URL
      setAttachmentError(""); // limpia el error anterior
      const url = await getAttachmentUrl(attachment.storage_path); // pide la URL firmada
      window.open(url, "_blank", "noopener,noreferrer"); // abre en pestaña nueva de forma segura
    } catch (error) { // si falla
      setAttachmentError(supabaseErrorMessage(error, "No fue posible abrir la imagen.")); // muestra el error
    } // cierra el catch
  }; // cierra openAttachment
  return ( // empieza el JSX de la tarjeta
    <article className={`task-card ${task.completed ? "is-complete" : ""}`}> {/* marca visual si está completada */}
      <button // botón circular de completar
        className="check-button" // estilo del check
        disabled={!canManage} // deshabilitado si no es el dueño
        aria-label={task.completed ? "Marcar como pendiente" : "Marcar como completada"} // accesibilidad
        onClick={() => onToggle(task.id)} // alterna el estado
      > {/* cierra los atributos del botón */}
        {task.completed ? <Check size={12} /> : ""} {/* muestra el check solo si está hecha */}
      </button> {/* cierra el botón de completar */}
      <div className="task-content"> {/* textos de la tarjeta */}
        <div className="task-heading"> {/* título y prioridad */}
          <h3>{task.title}</h3> {/* título de la actividad */}
          <PriorityBadge priority={task.priority} /> {/* insignia de prioridad */}
        </div> {/* cierra el encabezado */}
        <p className="task-meta"> {/* materia, fecha y hora */}
          {task.subject} <span>·</span> {formatDate(task.date)} <span>·</span> {task.time} {/* metadatos separados por puntos */}
        </p> {/* cierra los metadatos */}
        {task.description && <p className="task-description">{task.description}</p>} {/* descripción solo si existe */}
        {task.attachments?.map((attachment) => ( // recorre los adjuntos
          <span className="task-attachment" key={attachment.id}> {/* fila de un adjunto */}
            <button className="text-button" onClick={() => openAttachment(attachment)}> {/* abre la imagen */}
              <Paperclip size={14} /> Ver imagen {/* icono y texto */}
            </button> {/* cierra el botón de ver */}
            {canManage && ( // el dueño puede borrar el adjunto
              <button className="text-button" onClick={() => onAttachmentDelete(task.id, attachment)} aria-label={`Eliminar ${attachment.file_name}`}> {/* elimina el adjunto */}
                <X size={14} /> {/* icono de cerrar */}
              </button> // cierra el botón de eliminar adjunto
            )} // cierra el condicional del dueño
          </span> // cierra la fila del adjunto
        ))} // cierra el map de adjuntos
        {attachmentError && <small className="form-error" role="alert">{attachmentError}</small>} {/* error al abrir imagen */}
      </div> {/* cierra el contenido */}
      <div className="task-actions"> {/* botones laterales */}
        <button className="icon-button" aria-label="Abrir modo enfoque" title="Modo enfoque" onClick={() => onFocus(task)}> {/* entra a enfoque */}
          <Focus size={16} /> {/* icono de enfoque */}
        </button> {/* cierra el botón de enfoque */}
        {canManage && ( // solo el dueño edita
          <button className="icon-button" aria-label="Editar tarea" title="Editar tarea" onClick={() => onEdit(task)}> {/* abre el formulario de edición */}
            <Pencil size={16} /> {/* icono de lápiz */}
          </button> // cierra el botón de editar
        )} // cierra el condicional de editar
        {canManage && ( // solo el dueño elimina
          <button className="icon-button danger" aria-label="Eliminar tarea" title="Eliminar tarea" onClick={() => onDelete(task.id)}> {/* pide confirmar y borra */}
            <Trash2 size={16} /> {/* icono de basura */}
          </button> // cierra el botón de eliminar
        )} // cierra el condicional de eliminar
      </div> {/* cierra las acciones */}
    </article> // cierra la tarjeta
  ); // cierra el return de TaskCard
} // cierra el componente TaskCard

/**
 * App: componente raíz de RECORDATE.
 * Controla sesión, rutas, datos y qué pantalla se muestra.
 */
function App() { // se monta una sola vez al iniciar la aplicación
  const [session, setSession] = useState(null); // sesión de Supabase o de la demo
  const [passwordRecovery, setPasswordRecovery] = useState(false); // true si está recuperando la contraseña
  const [profile, setProfile] = useState(null); // perfil del usuario logueado
  const [screen, setScreen] = useState("landing"); // pantalla: landing, auth o app
  const [view, setView] = useState("Inicio"); // vista interna del panel
  const [tasks, setTasks] = useState([]); // lista de actividades
  const [query, setQuery] = useState(""); // texto de búsqueda
  const [filters, setFilters] = useState({ priority: "", status: "", date: "" }); // filtros de la lista
  const [editingTask, setEditingTask] = useState(null); // tarea que se está editando
  const [showForm, setShowForm] = useState(false); // controla el modal del formulario
  const [focusTask, setFocusTask] = useState(null); // tarea abierta en modo enfoque
  const [notice, setNotice] = useState(""); // mensaje de aviso al usuario
  const [mobileNav, setMobileNav] = useState(false); // menú lateral abierto en móvil
  const [notificationsOpen, setNotificationsOpen] = useState(false); // panel de notificaciones
  const [notificationAction, setNotificationAction] = useState(false); // evita doble clic al marcar leídas
  const [shareEmail, setShareEmail] = useState(""); // correo al que se comparte
  const [shared, setShared] = useState([]); // lista de compartidos
  const [message, setMessage] = useState(""); // texto del chat
  const [notifications, setNotifications] = useState([]); // notificaciones recibidas
  const [alarmTask, setAlarmTask] = useState(null); // tarea cuya alarma está sonando
  const [loadingData, setLoadingData] = useState(false); // carga inicial de la agenda
  const alarmedTasks = useRef(new Set()); // ids de tareas que ya dispararon alarma
  const demo = isDemoSession(session); // true si está en la demostración local
  const enablePushNotifications = async () => { // pide permiso y registra Web Push
    if (demo) { // en demo no hay push real
      setNotice("Las notificaciones push no están disponibles en la demostración local."); // avisa la limitación
      return false; // no activa el interruptor
    } // cierra el caso demo
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !import.meta.env.VITE_VAPID_PUBLIC_KEY) { // comprueba soporte y clave
      setNotice("Las notificaciones avanzadas requieren configurar Web Push."); // avisa si falta config
      return false; // no continúa
    } // cierra la comprobación de soporte
    const permission = await Notification.requestPermission(); // pide permiso al navegador
    if (permission !== "granted") return false; // si lo niega, no registra
    const registration = await navigator.serviceWorker.register(assetUrl("/sw.js")); // registra el service worker
    const existing = await registration.pushManager.getSubscription(); // busca una suscripción previa
    const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey(import.meta.env.VITE_VAPID_PUBLIC_KEY) }); // reutiliza o crea la suscripción
    await savePushSubscription(subscription); // guarda la suscripción en el servidor
    return true; // el interruptor puede quedar activo
  }; // cierra enablePushNotifications
  useEffect(() => { // sincroniza la vista con la URL
    const privatePaths = Object.keys(routeViews); // rutas que exigen sesión
    const handleRoute = () => { // lee la ruta actual y cambia pantalla
      const path = currentPath(); // obtiene el path actual
      if (privatePaths.includes(path)) { // si es una ruta privada
        setView(routeViews[path]); // selecciona la vista correspondiente
        setScreen(session ? "app" : "auth"); // app si hay sesión; si no, login
      } // cierra rutas privadas
      if (path === "/login" && session) setScreen("app"); // si ya hay sesión, no muestra login
      if (path === "/reset-password") { // ruta de recuperación
        setPasswordRecovery(true); // activa el modo recuperación
        setScreen("auth"); // muestra el formulario de login/recuperación
      } // cierra reset-password
    }; // cierra handleRoute
    handleRoute(); // aplica la ruta al montar
    window.addEventListener("popstate", handleRoute); // reacciona al botón atrás
    return () => window.removeEventListener("popstate", handleRoute); // limpia el listener
  }, [session]); // se vuelve a ejecutar si cambia la sesión
  const loadUserData = async (current) => { // carga perfil, tareas y notificaciones
    if (!current) { // si no hay sesión
      setProfile(null); // limpia el perfil
      setTasks([]); // limpia las tareas
      setShared([]); // limpia los compartidos
      return; // no pide datos
    } // cierra el caso sin sesión
    setLoadingData(true); // muestra el spinner
    try { // intenta cargar
      if (isDemoSession(current)) { // rama de demostración local
        const data = demoApi.load(); // lee datos guardados en localStorage
        setProfile(data.profile); // perfil demo
        setTasks(data.tasks); // tareas demo
        setShared(data.shares); // compartidos demo
        setNotifications(data.notifications); // notificaciones demo
        setScreen("app"); // entra al panel
        return; // no llama a Supabase
      } // cierra la rama demo
      const [currentProfile, currentTasks, currentShares, currentNotifications] = await Promise.all([ // pide todo en paralelo
        ensureProfile(current.user), // crea o lee el perfil
        listTasks(), // lista las tareas
        listSharedTasks(), // lista lo compartido
        listNotifications(), // lista las notificaciones
      ]); // cierra Promise.all
      setProfile(currentProfile); // guarda el perfil
      setTasks(currentTasks); // guarda las tareas
      setShared( // arma la lista de compartidos con título
        currentShares.map((share) => ({ // recorre cada share
          ...share, // copia los datos del share
          task: share.task_title || currentTasks.find((task) => task.id === share.task_id)?.title || "Tarea compartida", // resuelve el título
        })), // cierra el map
      ); // cierra setShared
      setNotifications(currentNotifications); // guarda las notificaciones
      setScreen("app"); // entra al panel
    } catch (error) { // si algo falla
      setNotice(supabaseErrorMessage(error, "No fue posible cargar tu agenda.")); // avisa el error
    } finally { // siempre
      setLoadingData(false); // quita el spinner
    } // cierra finally
  }; // cierra loadUserData
  useEffect(() => { // recupera la sesión de Supabase al arrancar
    if (!hasSupabaseConfig) return undefined; // no hace nada si no hay config
    supabase.auth.getSession().then(({ data: { session: current } }) => { // lee la sesión guardada
      setSession(current); // guarda la sesión
      loadUserData(current); // carga los datos de ese usuario
    }); // cierra getSession
    const { data: listener } = supabase.auth.onAuthStateChange((event, current) => { // escucha login, logout y recovery
      setSession(current); // actualiza la sesión
      if (event === "PASSWORD_RECOVERY") { // el usuario llegó por el enlace de reset
        setPasswordRecovery(true); // activa el modo recuperación
        setScreen("auth"); // muestra el formulario
        return; // no carga datos todavía
      } // cierra PASSWORD_RECOVERY
      loadUserData(current); // carga o limpia según la sesión
    }); // cierra onAuthStateChange
    return () => listener.subscription.unsubscribe(); // se desuscribe al desmontar
  }, []); // solo al montar
  useEffect(() => { // escucha notificaciones en tiempo real
    if (!session || demo) return undefined; // no aplica en demo ni sin sesión
    const unsubscribe = subscribeToNotifications(session.user.id, (payload) => // callback de cada notificación nueva
      setNotifications((current) => current.some((item) => item.id === payload.new.id) ? current : [payload.new, ...current]), // evita duplicados y la pone primero
    ); // cierra subscribeToNotifications
    return unsubscribe; // limpia la suscripción
  }, [session, demo]); // depende de sesión y modo demo
  useEffect(() => { // revisa recordatorios cada 15 segundos
    if (!profile?.reminders_enabled) return undefined; // no corre si el usuario los apagó
    const checkReminders = () => { // compara la hora actual con cada tarea
      const now = Date.now(); // milisegundos actuales
      tasks.filter((task) => !task.completed).forEach((task) => { // solo tareas pendientes
        const offset = reminderOptions.find(([label]) => label === task.reminder)?.[1] || 0; // milisegundos de anticipación
        const reminderAt = new Date(`${task.date}T${task.time}`).getTime() - offset; // momento exacto del aviso
        if (now < reminderAt || now - reminderAt > 60 * 1000 || alarmedTasks.current.has(task.id)) return; // ignora si es pronto, tarde o ya sonó
        alarmedTasks.current.add(task.id); // marca que ya se disparó
        if (profile.alarms_enabled) setAlarmTask(task); // abre el modal de alarma
        if (profile.alarms_enabled && "AudioContext" in window) { // si hay sonido y el navegador lo soporta
          const audioContext = new AudioContext(); // crea el contexto de audio
          const oscillator = audioContext.createOscillator(); // genera el tono
          const gain = audioContext.createGain(); // controla el volumen
          oscillator.connect(gain); // el tono entra al volumen
          gain.connect(audioContext.destination); // el volumen sale a los parlantes
          oscillator.frequency.value = 740; // frecuencia del beep
          gain.gain.setValueAtTime(0.12, audioContext.currentTime); // volumen inicial suave
          gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6); // se apaga en 0.6 s
          oscillator.start(); // empieza el sonido
          oscillator.stop(audioContext.currentTime + 0.6); // lo detiene
        } // cierra el bloque de audio
        if (profile.browser_notifications_enabled && "Notification" in window && Notification.permission === "granted") { // notificación del sistema
          new Notification("Alarma de RECORDATE", { body: `${task.title} · ${task.subject} · Prioridad ${task.priority}` }); // muestra el aviso
        } // cierra la notificación del navegador
      }); // cierra el forEach de tareas
    }; // cierra checkReminders
    checkReminders(); // corre de inmediato
    const timer = window.setInterval(checkReminders, 15000); // y cada 15 segundos
    return () => window.clearInterval(timer); // limpia el intervalo
  }, [profile, tasks]); // se actualiza si cambian perfil o tareas
  useEffect(() => { // Escape cierra menú, notificaciones, modal y alarma
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (showForm) { setShowForm(false); setEditingTask(null); return; }
      if (alarmTask) { setAlarmTask(null); return; }
      if (notificationsOpen) { setNotificationsOpen(false); return; }
      if (mobileNav) { setMobileNav(false); return; }
      if (focusTask) { setFocusTask(null); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showForm, alarmTask, notificationsOpen, mobileNav, focusTask]);
  useEffect(() => { // el aviso se oculta solo después de unos segundos
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), isErrorNotice(notice) ? 8000 : 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const userName = profile?.full_name || session?.user?.email?.split("@")[0] || "estudiante"; // nombre visible o parte del correo
  const visibleTasks = useMemo( // memoiza la lista filtrada
    () => // función que calcula las tareas visibles
      (profile?.show_completed === false ? tasks.filter((task) => !task.completed) : tasks) // oculta completadas si el ajuste lo pide
        .filter((task) => `${task.title} ${task.subject} ${task.description}`.toLowerCase().includes(query.toLowerCase())) // filtra por texto de búsqueda
        .filter((task) => // aplica los tres filtros
          (!filters.priority || task.priority === filters.priority) && // prioridad si hay
          (!filters.status || (filters.status === "Completada" ? task.completed : !task.completed)) && // estado si hay
          (!filters.date || task.date === filters.date), // fecha si hay
        ), // cierra el filtro de selects
    [tasks, query, filters, profile?.show_completed], // se recalcula si cambia alguno
  ); // cierra useMemo
  const pending = tasks.filter((task) => !task.completed); // solo las no completadas
  const stats = { // números del dashboard
    pending: pending.length, // cuántas faltan
    today: pending.filter((task) => task.date === today).length, // cuántas son para hoy
    high: pending.filter((task) => task.priority === "Alta").length, // cuántas son alta
    done: tasks.filter((task) => task.completed).length, // cuántas ya se hicieron
  }; // cierra stats
  const progress = tasks.length ? Math.round((stats.done / tasks.length) * 100) : 0; // porcentaje de avance
  const saveTask = async (task) => { // crea o actualiza una actividad
    try { // intenta guardar
      const saved = demo // elige demo o Supabase
        ? demoApi.saveTask({ ...task, id: editingTask?.id }) // guarda en localStorage
        : editingTask?.id // si hay id, es edición
          ? await updateTask(task) // actualiza en Supabase
          : await createTask(task); // crea en Supabase
      const attachment = !demo && task.attachmentFile // sube imagen solo fuera de demo
        ? await uploadTaskAttachment(saved.id, task.attachmentFile) // sube el archivo
        : null; // no hay adjunto nuevo
      const savedTask = attachment // si subió imagen, la agrega a la tarea
        ? { ...saved, attachments: [...(saved.attachments || []), attachment] } // concatena el adjunto
        : saved; // deja la tarea como vino
      setTasks((current) => // actualiza la lista local
        editingTask?.id // si editaba
          ? current.map((item) => (item.id === savedTask.id ? savedTask : item)) // reemplaza esa tarea
          : [savedTask, ...current], // o la pone al inicio
      ); // cierra setTasks
      setShowForm(false); // cierra el modal
      setEditingTask(null); // limpia la edición
      setNotice("Actividad guardada correctamente."); // confirma al usuario
      return true; // éxito
    } catch (error) { // si falla
      setNotice(supabaseErrorMessage(error, "No fue posible guardar la actividad.")); // avisa
      return false; // fracaso
    } // cierra catch
  }; // cierra saveTask
  const removeTask = async (id) => { // elimina una actividad
    if (!window.confirm("¿Seguro que quieres eliminar esta tarea?")) return; // pide confirmación
    try { // intenta borrar
      if (demo) demoApi.deleteTask(id); // borra en demo
      else await deleteTask(id); // borra en Supabase
      setTasks((current) => current.filter((task) => task.id !== id)); // quita la tarea de la lista
      setNotice("Actividad eliminada."); // confirma
    } catch (error) { // si falla
      setNotice(supabaseErrorMessage(error, "No fue posible eliminar la actividad.")); // avisa
    } // cierra catch
  }; // cierra removeTask
  const toggleTask = async (id) => { // marca o desmarca completada
    const task = tasks.find((item) => item.id === id); // busca la tarea
    if (!task) return; // si no existe, no hace nada
    try { // intenta actualizar
      const updated = demo // elige origen
        ? demoApi.saveTask({ ...task, completed: !task.completed }) // invierte en demo
        : await updateTask({ ...task, completed: !task.completed }); // invierte en Supabase
      setTasks((current) => current.map((item) => (item.id === id ? updated : item))); // reemplaza en la lista
      setFocusTask((current) => (current?.id === id ? updated : current)); // actualiza el enfoque si está abierto
    } catch (error) { // si falla
      setNotice(supabaseErrorMessage(error, "No fue posible actualizar la actividad.")); // avisa
    } // cierra catch
  }; // cierra toggleTask
  const completeAlarmTask = async () => { // completa la tarea de la alarma
    if (alarmTask) await toggleTask(alarmTask.id); // marca como hecha
    setAlarmTask(null); // cierra el modal
  }; // cierra completeAlarmTask
  const removeAttachment = async (taskId, attachment) => { // borra una imagen adjunta
    if (demo) { // demo no tiene storage
      setNotice("Los adjuntos no están disponibles en la demostración local."); // avisa
      return; // no continúa
    } // cierra el caso demo
    try { // intenta borrar
      await deleteTaskAttachment(attachment); // elimina en storage y en la tabla
      setTasks((current) => current.map((task) => task.id === taskId ? { ...task, attachments: task.attachments.filter((item) => item.id !== attachment.id) } : task)); // quita el adjunto de la lista
      setNotice("Imagen eliminada correctamente."); // confirma
    } catch (error) { // si falla
      setNotice(supabaseErrorMessage(error, "No fue posible eliminar la imagen.")); // avisa
    } // cierra catch
  }; // cierra removeAttachment
  const logout = async () => { // cierra la sesión
    if (supabase && !demo) await supabase.auth.signOut(); // cierra sesión real
    setSession(null); // limpia sesión
    setProfile(null); // limpia perfil
    setTasks([]); // limpia tareas
    setShared([]); // limpia compartidos
    setNotifications([]); // limpia notificaciones
    setScreen("landing"); // vuelve a la landing
    pushRoute("/"); // deja la URL en la raíz
  }; // cierra logout
  const markAllRead = async () => { // marca todas las notificaciones como leídas
    setNotificationAction(true); // deshabilita el botón
    try { // intenta marcar
      if (demo) demoApi.markAllRead(); // en demo
      else await markAllNotificationsRead(); // en Supabase
      setNotifications((current) => current.map((item) => ({ ...item, read_at: new Date().toISOString() }))); // pone fecha de lectura
    } catch (error) { // si falla
      setNotice(supabaseErrorMessage(error, "No fue posible marcar las notificaciones.")); // avisa
    } finally { // siempre
      setNotificationAction(false); // rehabilita el botón
    } // cierra finally
  }; // cierra markAllRead
  const markOneRead = async (notification) => { // marca una sola notificación
    if (notification.read_at) return; // si ya está leída, no hace nada
    try { // intenta marcar
      if (demo) demoApi.markOneRead(notification.id); // en demo
      else await markNotificationRead(notification.id); // en Supabase
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)); // actualiza esa notificación
    } catch (error) { // si falla
      setNotice(supabaseErrorMessage(error, "No fue posible marcar la notificación.")); // avisa
    } // cierra catch
  }; // cierra markOneRead
  const navigate = (nextView) => { // cambia de vista y de URL
    setView(nextView); // actualiza la vista
    const route = viewRoutes[nextView]; // busca la ruta
    if (route && currentPath() !== route) pushRoute(route); // empuja la URL si cambió
    setMobileNav(false); // cierra el menú móvil
    setFocusTask(null); // sale del modo enfoque
  }; // cierra navigate
  const openNewTask = () => { // abre el modal para crear
    setEditingTask(null); // no hay tarea en edición
    setShowForm(true); // muestra el formulario
  }; // cierra openNewTask
  const taskHandlers = { // props comunes de las listas de tareas
    userId: session?.user?.id, // id del usuario actual
    onToggle: toggleTask, // completar/descompletar
    onEdit: (task) => { // abre el formulario de edición
      setEditingTask(task); // carga la tarea
      setShowForm(true); // abre el modal
    }, // cierra onEdit
    onDelete: removeTask, // eliminar
    onFocus: setFocusTask, // entrar a enfoque
    onAttachmentDelete: removeAttachment, // borrar adjunto
  }; // cierra taskHandlers
  const frame = (node) => ( // envuelve cualquier pantalla con fondo y UI
    <div className="recordate-root"> {/* raíz visual de la app */}
      <WebGLBackground /> {/* fondo animado */}
      <div className="recordate-ui">{node}</div> {/* contenido encima del fondo */}
    </div> // cierra la raíz
  ); // cierra frame
  if (screen === "landing") return frame(<Landing onStart={() => setScreen("auth")} />); // landing pública
  if (!session || passwordRecovery) { // login o recuperación
    return frame( // envuelve el login
      <Login // formulario de autenticación
        recovery={passwordRecovery} // modo de reset de contraseña
        onDemo={() => { // entra con la sesión demo
          setSession(DEMO_SESSION); // guarda la sesión ficticia
          setPasswordRecovery(false); // sale del modo recovery
          loadUserData(DEMO_SESSION); // carga datos locales
        }} // cierra onDemo
        onLogin={(nextSession) => { // entra con sesión real
          setSession(nextSession); // guarda la sesión
          setPasswordRecovery(false); // sale del modo recovery
          loadUserData(nextSession); // carga datos de Supabase
        }} // cierra onLogin
        onRecoveryDone={() => setPasswordRecovery(false)} // termina el reset
        onBack={() => setScreen("landing")} // vuelve a la landing
      /> // cierra Login
    ); // cierra el return del login
  } // cierra el if de auth
  const renderMain = () => { // elige el contenido central según la vista
    if (focusTask) { // si hay una tarea en enfoque
      return ( // panel de modo enfoque
        <section className="focus-panel"> {/* pantalla de una sola actividad */}
          <div className="focus-orbit"><Focus size={28} /></div> {/* icono decorativo */}
          <span className="eyebrow accent-label">Modo enfoque</span> {/* etiqueta */}
          <h2>{focusTask.title}</h2> {/* título de la tarea */}
          <p className="task-meta">{focusTask.subject} · {formatDate(focusTask.date)} · {focusTask.time}</p> {/* materia, fecha y hora */}
          <p>{focusTask.description || "Concéntrate en completar esta actividad."}</p> {/* descripción o texto por defecto */}
          <div className="focus-status"> {/* estado y prioridad */}
            <PriorityBadge priority={focusTask.priority} /> {/* insignia */}
            <span>{focusTask.completed ? "Actividad completada" : "Pendiente de completar"}</span> {/* texto de estado */}
          </div> {/* cierra el estado */}
          <div className="form-actions center">
            {focusTask.userId === session?.user?.id && (
              <button className="primary-button" type="button" onClick={() => toggleTask(focusTask.id)}>
                {focusTask.completed ? "Marcar como pendiente" : "Marcar como completada"}
              </button>
            )}
            <button className="text-button" type="button" onClick={() => setFocusTask(null)}>Salir del modo enfoque</button>
          </div>
        </section> // cierra el panel de enfoque
      ); // cierra el return de enfoque
    } // cierra el if de focusTask
    if (view === "Calendario") { // vista de calendario
      return <Calendar tasks={profile?.show_completed === false ? tasks.filter((task) => !task.completed) : tasks} onSelect={setFocusTask} />; // pasa las tareas visibles
    } // cierra calendario
    if (view === "Mis tareas") { // vista de lista completa
      return ( // fragmento con título, filtros y lista
        <> {/* fragmento sin nodo extra */}
          <section className="section-title"> {/* encabezado de la vista */}
            <div> {/* textos */}
              <span className="eyebrow">Tu agenda completa</span> {/* etiqueta */}
              <h2>Mis tareas</h2> {/* título */}
            </div> {/* cierra textos */}
            <button className="primary-button" onClick={openNewTask}><Plus size={16} /> Nueva actividad</button> {/* abre el formulario */}
          </section> {/* cierra el encabezado */}
          <div className="search-wrap" aria-label="Filtros de tareas"> {/* barra de filtros */}
            <select aria-label="Filtrar por prioridad" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}> {/* filtro de prioridad */}
              <option value="">Todas las prioridades</option> {/* sin filtro */}
              <option>Alta</option> {/* alta */}
              <option>Media</option> {/* media */}
              <option>Baja</option> {/* baja */}
            </select> {/* cierra select de prioridad */}
            <select aria-label="Filtrar por estado" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}> {/* filtro de estado */}
              <option value="">Todos los estados</option> {/* sin filtro */}
              <option>Pendiente</option> {/* pendientes */}
              <option>Completada</option> {/* hechas */}
            </select> {/* cierra select de estado */}
            <input type="date" aria-label="Filtrar por fecha" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} /> {/* filtro por día */}
          </div> {/* cierra la barra de filtros */}
          {(filters.priority || filters.status || filters.date) && (
            <div className="filter-actions">
              <button
                className="text-button"
                type="button"
                onClick={() => setFilters({ priority: "", status: "", date: "" })}
              >
                Limpiar filtros
              </button>
            </div>
          )}
          <TaskList
            {...taskHandlers}
            tasks={visibleTasks}
            empty={
              filters.priority || filters.status || filters.date
                ? "Ninguna actividad coincide con los filtros."
                : "No tienes actividades registradas."
            }
            onCreate={openNewTask}
          /> {/* lista filtrada */}
        </> // cierra el fragmento
      ); // cierra el return de Mis tareas
    } // cierra Mis tareas
    if (view === "Recordatorios") { // vista de pendientes
      return <TaskList {...taskHandlers} title="Recordatorios" subtitle="Las próximas fechas que merecen tu atención." tasks={pending} empty="No tienes recordatorios pendientes." onCreate={openNewTask} />; // lista de pendientes
    } // cierra Recordatorios
    if (view === "Prioridades") { // vista ordenada por prioridad
      return ( // lista ordenada Alta → Baja
        <TaskList // reutiliza la lista
          {...taskHandlers} // pasa los handlers
          title="Prioridades" // título
          subtitle="Ordena tu energía empezando por lo más importante." // subtítulo
          tasks={[...pending].sort((a, b) => ["Alta", "Media", "Baja"].indexOf(a.priority) - ["Alta", "Media", "Baja"].indexOf(b.priority))} // copia y ordena
          empty="No tienes actividades priorizadas." // vacío
        /> // cierra TaskList
      ); // cierra el return de Prioridades
    } // cierra Prioridades
    if (view === "Modo enfoque") { // lista para elegir una tarea
      return ( // lista solo con botón de enfoque
        <TaskList // reutiliza la lista
          {...taskHandlers} // pasa los handlers
          title="Modo enfoque" // título
          subtitle="Elige una actividad para trabajar sin distracciones." // subtítulo
          tasks={pending} // solo pendientes
          onEdit={() => {}} // no edita desde aquí
          onDelete={() => {}} // no elimina desde aquí
          empty="No hay actividades disponibles para enfocar." // vacío
          focusOnly // muestra botones de enfoque en vez de tarjetas
        /> // cierra TaskList
      ); // cierra el return de Modo enfoque
    } // cierra Modo enfoque
    if (view === "Compartir agendas") { // vista de compartir
      return ( // panel de compartir
        <SharePanel // componente de compartir
          tasks={tasks} // todas las tareas
          currentUserId={session.user.id} // id del dueño
          email={shareEmail} // correo escrito
          setEmail={setShareEmail} // actualiza el correo
          shared={shared} // lista de shares
          onRevoke={async (share) => { // quita un acceso compartido
            try { // intenta revocar
              if (demo) demoApi.revoke(share.id); // en demo
              else await revokeSharedTask(share.id); // en Supabase
              setShared((current) => current.filter((item) => item.id !== share.id)); // lo saca de la lista
              setNotice("Acceso compartido revocado."); // confirma
            } catch (error) { // si falla
              setNotice(supabaseErrorMessage(error, "No fue posible revocar el acceso compartido.")); // avisa
            } // cierra catch
          }} // cierra onRevoke
          onShare={async (task) => { // comparte una tarea con un correo
            const normalizedEmail = shareEmail.trim().toLowerCase(); // normaliza el correo
            if (!isValidEmail(normalizedEmail)) { // valida formato
              setNotice("Escribe un correo válido para compartir."); // avisa
              return false; // no continúa
            } // cierra la validación
            try { // intenta compartir
              if (demo) { // rama demo
                const createdShare = demoApi.share(task.id, normalizedEmail); // crea el share local
                setShared((current) => [...current, createdShare]); // lo agrega
                setShareEmail(""); // limpia el input
                setNotice("Agenda compartida en la demostración local."); // confirma
                return true; // éxito
              } // cierra demo
              const recipient = await findUserByEmail(normalizedEmail); // busca al usuario
              if (!recipient) { // no existe
                setNotice("No existe un usuario registrado con ese correo."); // avisa
                return false; // no continúa
              } // cierra no existe
              if (recipient.id === session.user.id) { // no se puede compartir consigo
                setNotice("No puedes compartir una actividad contigo mismo."); // avisa
                return false; // no continúa
              } // cierra auto-share
              if (shared.some((share) => share.task_id === task.id && share.recipient_id === recipient.id)) { // ya estaba compartida
                setNotice("Esta actividad ya está compartida con ese usuario."); // avisa
                return false; // no continúa
              } // cierra duplicado
              const createdShare = await shareTask(task.id, recipient.email); // crea el share en Supabase
              setShared((current) => [ // agrega el share a la lista
                ...current, // conserva los anteriores
                { ...createdShare, task: task.title, recipient_email: recipient.email, recipient_name: recipient.full_name }, // datos para pintar
              ]); // cierra setShared
              setShareEmail(""); // limpia el input
              setNotice("Agenda compartida correctamente."); // confirma
              return true; // éxito
            } catch (error) { // si falla
              setNotice(supabaseErrorMessage(error, "No fue posible compartir la agenda.")); // avisa
              return false; // fracaso
            } // cierra catch
          }} // cierra onShare
        /> // cierra SharePanel
      ); // cierra el return de Compartir
    } // cierra Compartir agendas
    if (view === "Mensajes") { // vista del chat
      return <Chat message={message} setMessage={setMessage} userId={session.user.id} demo={demo} />; // pasa el texto y el usuario
    } // cierra Mensajes
    if (view === "Perfil" || view === "Configuración") { // perfil y ajustes
      return ( // componente Profile
        <Profile // ficha de cuenta y ajustes
          view={view} // Perfil o Configuración
          userName={userName} // nombre visible
          email={session.user.email} // correo
          profile={profile} // datos del perfil
          onEnablePush={enablePushNotifications} // activa Web Push
          onSettingsChange={async (settings) => { // guarda un ajuste
            try { // intenta guardar
              const updatedProfile = demo ? demoApi.saveProfile(settings) : await updateProfileSettings(settings); // demo o Supabase
              setProfile(updatedProfile); // aplica el perfil nuevo
              setNotice("Configuración guardada correctamente."); // confirma
            } catch (error) { // si falla
              setNotice(supabaseErrorMessage(error, "No fue posible guardar la configuración.")); // avisa
            } // cierra catch
          }} // cierra onSettingsChange
          onLogout={logout} // cierra sesión
        /> // cierra Profile
      ); // cierra el return de Perfil
    } // cierra Perfil/Configuración
    const todayTasks = pending.filter((task) => task.date === today); // pendientes de hoy para el dashboard
    return ( // dashboard de Inicio
      <> {/* fragmento del dashboard */}
        <section className="dash-hero"> {/* saludo y botón de crear */}
          <div> {/* textos del saludo */}
            <span className="eyebrow">{new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span> {/* fecha larga en español */}
            <h1>{greeting()}, {userName}.</h1> {/* saludo personalizado */}
            <p> {/* resumen del día */}
              {stats.today // si hay actividades hoy
                ? `Tienes ${stats.today} ${stats.today === 1 ? "actividad" : "actividades"} para hoy.` // singular o plural
                : "Hoy no tienes entregas. Revisa lo que viene."} // mensaje cuando no hay nada
            </p> {/* cierra el resumen */}
          </div> {/* cierra los textos */}
          <button className="primary-button add-task-button" onClick={openNewTask}> {/* crea una tarea */}
            <Plus size={16} /> Nueva actividad {/* icono y texto */}
          </button> {/* cierra el botón */}
        </section> {/* cierra el héroe del dashboard */}
        <Stats stats={stats} /> {/* tarjetas de números */}
        <div className="panel-card progress-card"> {/* tarjeta de progreso */}
          <span className="eyebrow">Progreso</span> {/* etiqueta */}
          <strong>{progress}%</strong> {/* porcentaje */}
          <p className="lead">de tu agenda está completa.</p> {/* leyenda */}
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Progreso de la agenda"><div className="progress-fill" style={{ width: `${progress}%` }} /></div> {/* barra visual */}
        </div> {/* cierra la tarjeta de progreso */}
        <div className="dash-grid"> {/* dos columnas: lista y agenda de hoy */}
          <div> {/* columna izquierda */}
            <section className="section-title"> {/* título de la lista */}
              <div> {/* textos */}
                <span className="eyebrow">Tu agenda</span> {/* etiqueta */}
                <h2>{query ? "Resultados de búsqueda" : "Tareas importantes"}</h2> {/* cambia si hay búsqueda */}
              </div> {/* cierra textos */}
              <button className="text-button" onClick={() => navigate("Mis tareas")}>Ver todas <ArrowRight size={14} /></button> {/* va a la lista completa */}
            </section> {/* cierra el título */}
            <div className="search-wrap"> {/* buscador */}
              <Search size={16} /> {/* icono de lupa */}
              <input aria-label="Buscar por título o materia" placeholder="Buscar por título o materia" value={query} onChange={(event) => setQuery(event.target.value)} /> {/* input controlado */}
            </div> {/* cierra el buscador */}
            <TaskList {...taskHandlers} tasks={visibleTasks.filter((task) => !task.completed).slice(0, 4)} empty="No tienes tareas pendientes." compact /> {/* 4 pendientes */}
          </div> {/* cierra la columna izquierda */}
          <aside className="panel-card"> {/* columna derecha: hoy */}
            <span className="eyebrow">Hoy</span> {/* etiqueta */}
            <h2>Agenda del día</h2> {/* título */}
            {todayTasks.length ? todayTasks.map((task) => ( // si hay tareas de hoy, las recorre
              <button className="agenda-task" key={task.id} onClick={() => setFocusTask(task)}> {/* abre enfoque */}
                <span> {/* textos */}
                  <b>{task.title}</b> {/* título */}
                  <small>{task.subject} · {task.time}</small> {/* materia y hora */}
                </span> {/* cierra textos */}
                <PriorityBadge priority={task.priority} /> {/* insignia */}
              </button> // cierra el botón de la tarea
            )) : <p className="empty-copy">Nada programado para hoy.</p>} {/* vacío si no hay nada hoy */}
            <button className="text-button calendar-link" onClick={() => navigate("Calendario")}> {/* va al calendario */}
              Abrir calendario <ArrowRight size={14} /> {/* texto e icono */}
            </button> {/* cierra el enlace al calendario */}
          </aside> {/* cierra la columna de hoy */}
        </div> {/* cierra el grid */}
        <div className="quick-actions"> {/* atajos del dashboard */}
          <button className="quick-action" onClick={openNewTask}> {/* crear */}
            <Plus size={18} /> {/* icono */}
            <b>Crear tarea</b> {/* título */}
            <small>Registra una entrega en segundos.</small> {/* descripción */}
          </button> {/* cierra crear */}
          <button className="quick-action" onClick={() => navigate("Modo enfoque")}> {/* ir a enfoque */}
            <Focus size={18} /> {/* icono */}
            <b>Modo enfoque</b> {/* título */}
            <small>Una sola actividad en pantalla.</small> {/* descripción */}
          </button> {/* cierra enfoque */}
          <button className="quick-action" onClick={() => navigate("Mensajes")}> {/* ir a chat */}
            <MessageCircle size={18} /> {/* icono */}
            <b>Escribir</b> {/* título */}
            <small>Coordina con un compañero.</small> {/* descripción */}
          </button> {/* cierra escribir */}
        </div> {/* cierra los atajos */}
      </> // cierra el fragmento del dashboard
    ); // cierra el return de Inicio
  }; // cierra renderMain
  return frame( // envuelve el panel autenticado
    <main className="app-shell"> {/* layout: sidebar + área de trabajo */}
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}> {/* menú lateral; se abre en móvil */}
        <div className="sidebar-head"> {/* logo y botón de cerrar */}
          <Brand light size="sm" /> {/* logo pequeño */}
          <button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X size={18} /></button> {/* cierra el menú móvil */}
        </div> {/* cierra la cabecera del sidebar */}
        <p className="sidebar-caption">Tu agenda académica</p> {/* subtítulo del menú */}
        <nav aria-label="Navegación principal"> {/* lista de vistas */}
          {navItems.map((item, index) => { // recorre cada ítem del menú
            const Icon = navIcons[index]; // icono que corresponde al ítem
            return ( // botón de navegación
              <button className={view === item ? "nav-item active" : "nav-item"} key={item} onClick={() => navigate(item)}> {/* marca activo si es la vista actual */}
                <span className="nav-symbol" aria-hidden="true"><Icon size={16} /></span> {/* icono decorativo */}
                {item} // nombre de la vista
              </button> // cierra el botón del ítem
            ); // cierra el return del map
          })} // cierra el map del menú
        </nav> {/* cierra la navegación */}
        <div className="sidebar-bottom"> {/* perfil, ajustes y logout */}
          <button className={view === "Perfil" ? "nav-item active" : "nav-item"} onClick={() => navigate("Perfil")}> {/* va a Perfil */}
            <span className="nav-symbol"><User size={16} /></span> Perfil {/* icono y texto */}
          </button> {/* cierra Perfil */}
          <button className={view === "Configuración" ? "nav-item active" : "nav-item"} onClick={() => navigate("Configuración")}> {/* va a Configuración */}
            <span className="nav-symbol"><Settings size={16} /></span> Configuración {/* icono y texto */}
          </button> {/* cierra Configuración */}
          <button className="nav-item logout" onClick={logout}> {/* cierra sesión */}
            <span className="nav-symbol"><LogOut size={16} /></span> Cerrar sesión {/* icono y texto */}
          </button> {/* cierra el botón de logout */}
        </div> {/* cierra el pie del sidebar */}
      </aside> {/* cierra el menú lateral */}
      <div className="mobile-overlay" role="presentation" aria-hidden={!mobileNav} onClick={() => setMobileNav(false)} /> {/* fondo oscuro que cierra el menú */}
      <section className="workspace"> {/* área principal */}
        <header className="workspace-header"> {/* cabecera con menú, título y usuario */}
          <button className="menu-toggle" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={18} /></button> {/* abre el menú en móvil */}
          <div> {/* título de la vista */}
            <p className="eyebrow">IE La Candelaria · PPI grado 11{demo ? " · Demo" : ""}</p> {/* contexto del proyecto */}
            <h1>{view === "Inicio" ? "Hoy" : view}</h1> {/* “Hoy” en el dashboard; si no, el nombre de la vista */}
          </div> {/* cierra el título */}
          <div className="header-user"> {/* campana y avatar */}
            <button className="notification-button" type="button" aria-label="Ver notificaciones" aria-expanded={notificationsOpen} aria-haspopup="true" onClick={() => setNotificationsOpen((current) => !current)}> {/* abre/cierra el panel */}
              <Bell size={16} /> {/* icono de campana */}
              {notifications.some((item) => !item.read_at) && <span className="notification-dot" />} {/* punto si hay no leídas */}
            </button> {/* cierra el botón de campana */}
            {notificationsOpen && ( // panel desplegable
              <div className="notification-panel"> {/* lista de avisos */}
                <strong>Notificaciones</strong> {/* título del panel */}
                <button className="text-button" onClick={markAllRead} disabled={notificationAction}>Marcar todas como leídas</button> {/* marca todas */}
                <p>{notifications.length ? `${notifications.filter((item) => !item.read_at).length} sin leer.` : "No tienes notificaciones nuevas."}</p> {/* resumen */}
                {notifications.slice(0, 5).map((item) => ( // muestra las 5 más recientes
                  <button className="notification-item" key={item.id} onClick={() => markOneRead(item)}> {/* marca esa como leída */}
                    {item.title}<small>{item.body || ""}</small> {/* título y cuerpo */}
                  </button> // cierra el ítem
                ))} // cierra el map
              </div> // cierra el panel
            )} // cierra el condicional del panel
            <span className="avatar">{userName.charAt(0).toUpperCase()}</span> {/* inicial del nombre */}
          </div> {/* cierra header-user */}
        </header> {/* cierra la cabecera */}
        {notice && ( // aviso temporal
          <div className={`notice ${isErrorNotice(notice) ? "notice-error" : ""}`} role={isErrorNotice(notice) ? "alert" : "status"}> {/* barra de mensaje */}
            {notice} {/* texto del aviso */}
            <button type="button" aria-label="Cerrar mensaje" onClick={() => setNotice("")}><X size={16} /></button> {/* lo oculta */}
          </div> // cierra el aviso
        )} // cierra el condicional del aviso
        <div className="content-area"> {/* contenido de la vista */}
          {loadingData ? ( // spinner mientras carga
            <div className="empty-state loading-state" role="status"> {/* estado de carga */}
              <span className="loading-spinner" /> {/* animación */}
              Cargando tu agenda... // texto
            </div> // cierra el estado de carga
          ) : renderMain()} // o el contenido de la vista
        </div> {/* cierra content-area */}
      </section> {/* cierra workspace */}
      <nav className="bottom-nav" aria-label="Navegación móvil"> {/* barra inferior en celular */}
        {[ // atajos de la barra
          ["Inicio", House], // dashboard
          ["Mis tareas", ListTodo], // lista
          ["Calendario", CalendarDays], // calendario
          ["Mensajes", MessageCircle], // chat
          ["Perfil", User], // perfil
        ].map(([item, Icon]) => ( // un botón por atajo
          <button key={item} className={view === item ? "active" : ""} onClick={() => navigate(item)}> {/* navega a esa vista */}
            <Icon size={18} /> {/* icono */}
            {item === "Mis tareas" ? "Tareas" : item} // etiqueta corta
          </button> // cierra el botón
        ))} // cierra el map de la barra
      </nav> {/* cierra la barra inferior */}
      {showForm && ( // modal de crear/editar
        <div className="modal-backdrop" onClick={() => { setShowForm(false); setEditingTask(null); }}> {/* fondo oscuro; clic afuera cierra */}
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onClick={(event) => event.stopPropagation()}> {/* diálogo */}
            <div className="modal-header"> {/* cabecera del modal */}
              <div> {/* textos */}
                <span className="eyebrow accent-label">Agenda académica</span> {/* etiqueta */}
                <h2 id="task-modal-title">{editingTask ? "Editar actividad" : "Nueva actividad"}</h2> {/* título según el modo */}
              </div> {/* cierra textos */}
              <button className="icon-button" type="button" onClick={() => { setShowForm(false); setEditingTask(null); }} aria-label="Cerrar formulario"><X size={16} /></button> {/* cierra sin guardar */}
            </div> {/* cierra la cabecera */}
            <TaskForm key={editingTask?.id || "new-task"} task={editingTask} onSave={saveTask} onCancel={() => { setShowForm(false); setEditingTask(null); }} /> {/* formulario */}
          </section> {/* cierra el diálogo */}
        </div> // cierra el backdrop
      )} // cierra el modal del formulario
      {alarmTask && ( // modal de alarma
        <div className="modal-backdrop" onClick={() => setAlarmTask(null)}> {/* fondo oscuro; clic afuera pospone */}
          <section className="modal alarm-modal" role="alertdialog" aria-modal="true" aria-labelledby="alarm-title" onClick={(event) => event.stopPropagation()}> {/* diálogo de alarma */}
            <span className="eyebrow accent-label">Alarma de RECORDATE</span> {/* etiqueta */}
            <h2 id="alarm-title">Es hora de realizar esta actividad</h2> {/* aviso */}
            <h3>{alarmTask.title}</h3> {/* título de la tarea */}
            <p>{alarmTask.subject} · Prioridad {alarmTask.priority}</p> {/* materia y prioridad */}
            <div className="form-actions center"> {/* botones */}
              <button className="primary-button" onClick={completeAlarmTask}>Marcar como completada</button> {/* completa y cierra */}
              <button className="text-button" onClick={() => setAlarmTask(null)}>Posponer</button> {/* solo cierra el modal */}
            </div> {/* cierra los botones */}
          </section> {/* cierra el diálogo */}
        </div> // cierra el backdrop
      )} // cierra el modal de alarma
    </main> // cierra el layout
  ); // cierra el return de App
} // cierra el componente App

/**
 * Stats: cuatro tarjetas numéricas del dashboard.
 * Recibe los conteos ya calculados en App.
 */
function Stats({ stats }) { // recibe pendientes, hoy, alta y completadas
  return ( // grilla de estadísticas
    <section className="stats-grid"> {/* cuatro tarjetas */}
      {[ // cada fila: etiqueta, valor, pie y color
        ["Pendientes", stats.pending, "Actividades por completar", "green"], // tarjeta 1
        ["Para hoy", stats.today, "Fecha más cercana", "gold"], // tarjeta 2
        ["Alta prioridad", stats.high, "Requieren atención", "coral"], // tarjeta 3
        ["Completadas", stats.done, "Tu avance acumulado", "ink"], // tarjeta 4
      ].map(([label, value, caption, tone]) => ( // recorre cada métrica
        <article className={`stat-card stat-${tone}`} key={label}> {/* color según tone */}
          <span>{label}</span> {/* nombre de la métrica */}
          <strong>{value}</strong> {/* número */}
          <small>{caption}</small> {/* pie de tarjeta */}
        </article> // cierra la tarjeta
      ))} // cierra el map
    </section> // cierra la grilla
  ); // cierra el return de Stats
} // cierra Stats

/**
 * TaskList: lista de tarjetas o de botones de enfoque.
 * Se usa en varias vistas (tareas, recordatorios, prioridades, dashboard).
 */
function TaskList({ // recibe título, tareas y handlers
  title, // etiqueta de la sección
  subtitle, // título grande
  userId, // id para saber quién puede editar
  tasks, // arreglo a pintar
  onToggle, // completar
  onEdit, // editar
  onDelete, // eliminar
  onFocus, // modo enfoque
  empty, // texto si no hay tareas
  compact = false, // versión compacta del dashboard
  focusOnly = false, // muestra botones de enfoque
  onAttachmentDelete, // borrar adjunto
  onCreate, // CTA opcional para crear actividad desde el vacío
}) { // cierra los parámetros
  return ( // sección de lista
    <section className={`task-list-section ${compact ? "compact-list" : ""}`}> {/* clase extra si es compacta */}
      {title && ( // encabezado opcional
        <div className="section-title"> {/* título de la lista */}
          <div> {/* textos */}
            <span className="eyebrow">{title}</span> {/* etiqueta */}
            <h2>{subtitle}</h2> {/* subtítulo */}
          </div> {/* cierra textos */}
        </div> // cierra el encabezado
      )} // cierra el condicional del título
      {tasks.length ? ( // si hay tareas
        <div className="tasks"> {/* contenedor de ítems */}
          {tasks.map((task) => // recorre cada tarea
            focusOnly ? ( // en modo enfoque pinta un botón grande
              <button className="focus-choice" key={task.id} onClick={() => onFocus(task)}> {/* elige esa tarea */}
                <span className="focus-choice-icon"><Focus size={18} /></span> {/* icono */}
                <span> {/* textos */}
                  <b>{task.title}</b> {/* título */}
                  <small>{task.subject} · {formatDate(task.date)} · {task.time}</small> {/* metadatos */}
                </span> {/* cierra textos */}
                <PriorityBadge priority={task.priority} /> {/* insignia */}
              </button> // cierra el botón de enfoque
            ) : ( // si no, pinta la tarjeta completa
              <TaskCard // tarjeta con acciones
                key={task.id} // clave de React
                task={task} // datos
                userId={userId} // dueño
                onToggle={onToggle} // completar
                onEdit={onEdit} // editar
                onDelete={onDelete} // eliminar
                onFocus={onFocus} // enfoque
                onAttachmentDelete={onAttachmentDelete} // borrar adjunto
              /> // cierra TaskCard
            ), // cierra el ternario
          )} // cierra el map
        </div> // cierra el contenedor
      ) : ( // si no hay tareas
        <div className="empty-state"> {/* estado vacío */}
          <ListTodo size={28} aria-hidden="true" /> {/* icono */}
          <h3>{empty}</h3> {/* mensaje personalizado */}
          <p>Las actividades que agregues aparecerán aquí.</p> {/* pista */}
          {onCreate && !focusOnly && (
            <button className="primary-button" type="button" onClick={onCreate}>
              <Plus size={16} /> Nueva actividad
            </button>
          )}
        </div> // cierra el vacío
      )} // cierra el ternario de lista/vacío
    </section> // cierra la sección
  ); // cierra el return de TaskList
} // cierra TaskList

/**
 * Calendar: calendario mensual con la agenda del día elegido.
 * Se muestra cuando la vista es “Calendario”.
 */
function Calendar({ tasks, onSelect }) { // recibe tareas y el callback de enfoque
  const [selected, setSelected] = useState(today); // día seleccionado (hoy al inicio)
  const [month, setMonth] = useState(today.slice(0, 7)); // mes visible YYYY-MM
  const [year, monthNumber] = month.split("-").map(Number); // separa año y mes numérico
  const firstDay = new Date(year, monthNumber - 1, 1); // primer día del mes (el mes en Date es 0-11)
  const daysInMonth = new Date(year, monthNumber, 0).getDate(); // cuántos días tiene el mes
  const days = Array.from({ length: daysInMonth }, (_, index) => { // genera YYYY-MM-DD de cada día
    const day = String(index + 1).padStart(2, "0"); // día con dos dígitos
    return `${month}-${day}`; // fecha completa
  }); // cierra el arreglo de días
  const shiftMonth = (offset) => { // avanza o retrocede un mes
    const next = new Date(year, monthNumber - 1 + offset, 1); // calcula el nuevo mes
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`); // actualiza el mes visible
    setSelected(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`); // selecciona el día 1
  }; // cierra shiftMonth
  const dayTasks = tasks.filter((task) => task.date === selected); // tareas del día elegido
  return ( // vista de calendario
    <section className="calendar-view"> {/* contenedor */}
      <div className="section-title"> {/* encabezado y controles */}
        <div> {/* textos */}
          <span className="eyebrow">Vista de agenda</span> {/* etiqueta */}
          <h2>Calendario académico</h2> {/* título */}
        </div> {/* cierra textos */}
        <div className="calendar-controls"> {/* flechas de mes */}
          <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={16} /></button> {/* mes anterior */}
          <span className="calendar-month"> {/* nombre del mes */}
            {new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(firstDay)} // mes y año en español
          </span> {/* cierra el nombre */}
          <button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente"><ChevronRight size={16} /></button> {/* mes siguiente */}
        </div> {/* cierra los controles */}
      </div> {/* cierra el encabezado */}
      <div className="calendar-layout"> {/* grilla + agenda del día */}
        <div> {/* columna del mes */}
          <div className="calendar-weekdays" aria-hidden="true"> {/* nombres de los días */}
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)} {/* una etiqueta por día */}
          </div> {/* cierra los nombres */}
          <div className="calendar-days"> {/* celdas del mes */}
            {Array.from({ length: firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 }).map((_, index) => ( // huecos hasta el lunes
              <span className="calendar-day calendar-day-empty" key={`empty-${index}`} aria-hidden="true" /> // celda vacía
            ))} // cierra los huecos
            {days.map((day) => ( // un botón por día
              <button
                className={selected === day ? "calendar-day selected" : "calendar-day"}
                key={day}
                type="button"
                aria-pressed={selected === day}
                aria-label={new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00`))}
                onClick={() => setSelected(day)}
              > {/* marca el día activo */}
                <span aria-hidden="true">{new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(new Date(`${day}T12:00:00`))}</span> {/* nombre corto del día */}
                <b>{new Date(`${day}T12:00:00`).getDate()}</b> {/* número del día */}
                <i className={tasks.some((task) => task.date === day && !task.completed) ? "has-task" : ""} aria-hidden="true" /> {/* punto si hay pendientes */}
              </button> // cierra el botón del día
            ))} // cierra el map de días
          </div> {/* cierra las celdas */}
        </div> {/* cierra la columna del mes */}
        <div className="day-agenda"> {/* agenda del día elegido */}
          <span className="eyebrow">{selected ? formatDate(selected) : "Agenda"}</span> {/* fecha formateada */}
          <h3>Actividades del día</h3> {/* título */}
          {dayTasks.length ? dayTasks.map((task) => ( // si hay tareas, las recorre
            <button className="agenda-task" key={task.id} onClick={() => onSelect(task)}> {/* abre enfoque */}
              <span> {/* textos */}
                <b>{task.title}</b> {/* título */}
                <small>{task.subject} · {task.time}</small> {/* materia y hora */}
              </span> {/* cierra textos */}
              <PriorityBadge priority={task.priority} /> {/* insignia */}
            </button> // cierra el botón
          )) : <p className="empty-copy">No tienes actividades programadas para este día.</p>} {/* vacío */}
        </div> {/* cierra la agenda del día */}
      </div> {/* cierra el layout */}
    </section> // cierra el calendario
  ); // cierra el return de Calendar
} // cierra Calendar

/**
 * SharePanel: comparte tareas pendientes y lista los accesos enviados/recibidos.
 * Se muestra en la vista “Compartir agendas”.
 */
function SharePanel({ tasks, currentUserId, email, setEmail, shared, onShare, onRevoke }) { // props de App
  const [sharingTaskId, setSharingTaskId] = useState(null); // id de la tarea que se está compartiendo
  const shareableTasks = tasks.filter((task) => task.userId === currentUserId && !task.completed); // solo las propias y pendientes
  const sentShares = shared.filter((item) => item.owner_id === currentUserId); // las que yo envié
  const receivedShares = shared.filter((item) => item.recipient_id === currentUserId); // las que me enviaron
  const share = async (task) => { // dispara el share y muestra “Buscando...”
    setSharingTaskId(task.id); // marca esa fila como ocupada
    try { // intenta compartir
      await onShare(task); // llama al handler del padre
    } finally { // siempre
      setSharingTaskId(null); // libera el botón
    } // cierra finally
  }; // cierra share
  return ( // panel de compartir
    <section className="panel-view"> {/* contenedor */}
      <span className="eyebrow accent-label">Coordina con tu equipo</span> {/* etiqueta */}
      <h2>Compartir agendas</h2> {/* título */}
      <p className="panel-intro">Comparte actividades con compañeros registrados y consulta las que han compartido contigo.</p> {/* intro */}
      <div className="share-form"> {/* correo + lista para compartir */}
        <label> {/* campo de correo */}
          Correo del compañero // etiqueta
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="compañero@ejemplo.com" /> {/* input controlado */}
        </label> {/* cierra el campo */}
        {shareableTasks.length ? ( // si hay pendientes propias
          <div className="share-list" aria-label="Actividades pendientes para compartir"> {/* lista de filas */}
            {shareableTasks.map((task) => ( // una fila por tarea
              <div className="share-row" key={task.id}> {/* fila */}
                <span> {/* textos */}
                  <b>{task.title}</b> {/* título */}
                  <small>{task.subject} · {formatDate(task.date)}</small> {/* materia y fecha */}
                </span> {/* cierra textos */}
                <button className="outline-button" onClick={() => share(task)} disabled={sharingTaskId === task.id} type="button"> {/* comparte esa tarea */}
                  {sharingTaskId === task.id ? "Buscando..." : "Compartir"} // texto según estado
                </button> {/* cierra el botón */}
              </div> // cierra la fila
            ))} // cierra el map
          </div> // cierra la lista
        ) : ( // si no hay nada que compartir
          <div className="share-empty" role="status"> {/* estado vacío */}
            <strong>No tienes actividades pendientes para compartir.</strong> {/* mensaje */}
            <span>Crea una actividad pendiente para enviarla a un compañero.</span> {/* pista */}
          </div> // cierra el vacío
        )} // cierra el ternario
      </div> {/* cierra el formulario */}
      <div className="shared-success"> {/* enviados */}
        <b>Actividades que compartiste</b> {/* título */}
        {sentShares.length ? sentShares.map((item) => ( // si hay enviados
          <span key={item.id}> {/* una línea por share */}
            {item.task || "Tarea compartida"} · {item.recipient_name || item.recipient_email} // título y destinatario
            <button className="text-button" onClick={() => onRevoke(item)}>Revocar</button> {/* quita el acceso */}
          </span> // cierra la línea
        )) : <small>Aún no has compartido actividades.</small>} {/* vacío */}
      </div> {/* cierra enviados */}
      <div className="shared-success received-shares"> {/* recibidos */}
        <b>Actividades compartidas contigo</b> {/* título */}
        {receivedShares.length ? receivedShares.map((item) => ( // si hay recibidos
          <span key={item.id}>{item.task || "Tarea compartida"} · {item.owner_name || item.owner_email}</span> // título y dueño
        )) : <small>No tienes actividades compartidas por otros usuarios.</small>} {/* vacío */}
      </div> {/* cierra recibidos */}
    </section> // cierra el panel
  ); // cierra el return de SharePanel
} // cierra SharePanel

/**
 * Chat: mensajería entre compañeros.
 * Carga historial, se suscribe en vivo y envía mensajes.
 */
function Chat({ message, setMessage, userId, demo = false }) { // texto controlado desde App
  const [messages, setMessages] = useState([]); // historial
  const [recipientEmail, setRecipientEmail] = useState(""); // correo del destinatario
  const [recipient, setRecipient] = useState(null); // usuario encontrado
  const [chatError, setChatError] = useState(""); // error visible
  const [loadingMessages, setLoadingMessages] = useState(true); // carga inicial
  const [sending, setSending] = useState(false); // envío en curso
  useEffect(() => { // carga mensajes y se suscribe
    let mounted = true; // evita setState si el componente se desmontó
    const load = demo ? Promise.resolve(demoApi.listMessages()) : listMessages(); // demo o Supabase
    load.then((data) => { // cuando llegan
      if (mounted) setMessages(data); // guarda el historial
    }).catch(() => { // si falla
      if (mounted) setChatError("No fue posible cargar tus mensajes."); // avisa
    }).finally(() => { // siempre
      if (mounted) setLoadingMessages(false); // quita el spinner
    }); // cierra finally
    if (demo) return () => { mounted = false; }; // en demo solo limpia el flag
    const unsubscribe = subscribeToMessages(userId, (payload) => { // escucha inserts en vivo
      if (payload.eventType === "INSERT" && (payload.new.sender_id === userId || payload.new.recipient_id === userId)) { // solo los del usuario
        setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]); // evita duplicados
      } // cierra el if del insert
    }); // cierra subscribeToMessages
    return () => { // cleanup
      mounted = false; // marca desmontado
      unsubscribe(); // cancela la suscripción
    }; // cierra cleanup
  }, [userId, demo]); // se re-ejecuta si cambian usuario o demo
  const send = async (event) => { // envía el mensaje del input
    event.preventDefault(); // no recarga
    if (!message.trim()) return; // ignora vacíos
    if (!recipient && !isValidEmail(recipientEmail)) { // exige correo válido al iniciar conversación
      setChatError("Escribe un correo válido del compañero para enviar el mensaje."); // feedback
      return; // no continúa
    } // cierra validación de correo
    try { // intenta enviar
      setChatError(""); // limpia error
      setSending(true); // deshabilita el botón
      if (demo) { // rama demo
        const target = recipient || { id: "demo-peer", email: recipientEmail || "compañero@recordate.local", full_name: (recipientEmail || "Compañero").split("@")[0] }; // destinatario ficticio
        setRecipient(target); // lo guarda
        const sent = demoApi.sendMessage(message, target.id); // guarda local
        setMessages((current) => current.some((item) => item.id === sent.id) ? current : [...current, sent]); // agrega si no existe
        setMessage(""); // limpia el input
        return; // sale de la rama demo
      } // cierra demo
      const target = recipient || await findUserByEmail(recipientEmail); // busca al usuario
      if (!target) { setChatError("No encontramos un usuario con ese correo."); return; } // no existe
      setRecipient(target); // lo guarda
      const sent = await sendMessage(message, target.id); // envía a Supabase
      setMessages((current) => current.some((item) => item.id === sent.id) ? current : [...current, sent]); // agrega si no existe
      setMessage(""); // limpia el input
    } catch (error) { // si falla
      setChatError(supabaseErrorMessage(error, "No fue posible enviar el mensaje.")); // avisa
    } finally { // siempre
      setSending(false); // rehabilita el botón
    } // cierra finally
  }; // cierra send
  return ( // vista de chat
    <section className="panel-view chat-view"> {/* contenedor */}
      <span className="eyebrow accent-label">Comunicación interna</span> {/* etiqueta */}
      <h2>Mensajes</h2> {/* título */}
      <p className="panel-intro">Coordina horarios y actividades con tus compañeros desde RECORDATE.</p> {/* intro */}
      <div className="chat-window"> {/* ventana */}
        <div className="chat-contact"> {/* cabecera del contacto */}
          <span className="avatar small-avatar">{recipient?.full_name?.charAt(0).toUpperCase() || "?"}</span> {/* inicial o interrogación */}
          <span> {/* nombre y correo */}
            <b>{recipient?.full_name || "Nuevo mensaje"}</b> {/* nombre o placeholder */}
            <small>{recipient?.email || "Escribe el correo del destinatario"}</small> {/* correo o pista */}
          </span> {/* cierra textos */}
        </div> {/* cierra la cabecera */}
        <label className="chat-recipient"> {/* campo destinatario */}
          Destinatario // etiqueta
          <input type="email" value={recipientEmail} onChange={(event) => { setRecipientEmail(event.target.value); setRecipient(null); }} placeholder="compañero@ejemplo.com" /> {/* al cambiar, olvida el usuario previo */}
        </label> {/* cierra el campo */}
        <div className="chat-messages"> {/* burbujas */}
          {loadingMessages && <p className="empty-copy" role="status">Cargando mensajes...</p>} {/* spinner de texto */}
          {!loadingMessages && !recipient && <p className="empty-copy">Busca un compañero para iniciar una conversación.</p>} {/* sin destinatario */}
          {!loadingMessages && recipient && !messages.some((item) => item.sender_id === recipient.id || item.recipient_id === recipient.id) && ( // hay destinatario pero no hay hilo
            <p className="empty-copy">Aún no hay mensajes con este compañero.</p> // vacío del hilo
          )} // cierra el vacío del hilo
          {messages.filter((item) => recipient && (item.sender_id === recipient.id || item.recipient_id === recipient.id)).map((item, index) => ( // solo mensajes de esa conversación
            <p className={item.sender_id === userId ? "outgoing" : "incoming"} key={item.id || `${item.body}-${index}`}> {/* derecha si lo envié yo */}
              {item.body} // texto
              {item.created_at && <span className="chat-meta">{formatStamp(item.created_at)}</span>} {/* hora si existe */}
            </p> // cierra la burbuja
          ))} // cierra el map
        </div> {/* cierra las burbujas */}
        <form className="chat-input" onSubmit={send}> {/* barra de envío */}
          <input aria-label="Escribe un mensaje" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe un mensaje..." /> {/* input controlado */}
          <button className="primary-button" type="submit" disabled={sending || !message.trim()}> {/* envía */}
            {sending ? "Enviando..." : "Enviar"} // texto según estado
          </button> {/* cierra el botón */}
        </form> {/* cierra el formulario */}
        {chatError && <p className="form-error" role="alert">{chatError}</p>} {/* error si hay */}
      </div> {/* cierra la ventana */}
    </section> // cierra el panel
  ); // cierra el return de Chat
} // cierra Chat

/**
 * Profile: ficha de la cuenta y, en Configuración, los interruptores de avisos.
 * Se muestra en las vistas “Perfil” y “Configuración”.
 */
function Profile({ view, userName, email, profile, onSettingsChange, onLogout, onEnablePush }) { // datos y callbacks
  return ( // ficha de cuenta
    <section className="panel-view profile-view"> {/* contenedor */}
      <span className="eyebrow accent-label">Tu cuenta</span> {/* etiqueta */}
      <h2>{view}</h2> {/* Perfil o Configuración */}
      <div className="profile-card"> {/* tarjeta de identidad */}
        <span className="profile-avatar">{userName.charAt(0).toUpperCase()}</span> {/* inicial */}
        <div> {/* textos */}
          <h3>{userName}</h3> {/* nombre */}
          <p>{email}</p> {/* correo */}
          <span className="demo-tag">{email?.includes("recordate.local") ? "CUENTA DEMO" : "CUENTA SUPABASE"}</span> {/* tipo de cuenta */}
        </div> {/* cierra textos */}
      </div> {/* cierra la tarjeta */}
      {view === "Configuración" ? ( // ajustes
        <div className="settings-list"> {/* lista de interruptores */}
          <label> {/* recordatorios */}
            <span> {/* textos */}
              <b>Recordatorios automáticos</b> {/* título */}
              <small>Recibe avisos antes de cada entrega.</small> {/* descripción */}
            </span> {/* cierra textos */}
            <input type="checkbox" checked={profile?.reminders_enabled ?? true} onChange={async (event) => { if (event.target.checked && "Notification" in window && Notification.permission === "default") await Notification.requestPermission(); onSettingsChange({ reminders_enabled: event.target.checked }); }} /> {/* pide permiso y guarda */}
          </label> {/* cierra recordatorios */}
          <label> {/* notificaciones del navegador */}
            <span> {/* textos */}
              <b>Notificaciones del navegador</b> {/* título */}
              <small>Recibe avisos aunque estés en otra pestaña.</small> {/* descripción */}
            </span> {/* cierra textos */}
            <input type="checkbox" checked={profile?.browser_notifications_enabled ?? false} onChange={async (event) => { if (event.target.checked && !(await onEnablePush())) return; onSettingsChange({ browser_notifications_enabled: event.target.checked }); }} /> {/* activa push o no guarda */}
          </label> {/* cierra notificaciones */}
          <label> {/* alarmas */}
            <span> {/* textos */}
              <b>Alarmas sonoras</b> {/* título */}
              <small>Emite un sonido mientras RECORDATE está abierto.</small> {/* descripción */}
            </span> {/* cierra textos */}
            <input type="checkbox" checked={profile?.alarms_enabled ?? true} onChange={(event) => onSettingsChange({ alarms_enabled: event.target.checked })} /> {/* guarda el ajuste */}
          </label> {/* cierra alarmas */}
          <label> {/* mostrar completadas */}
            <span> {/* textos */}
              <b>Mostrar tareas completadas</b> {/* título */}
              <small>Conserva visible tu avance en la agenda.</small> {/* descripción */}
            </span> {/* cierra textos */}
            <input type="checkbox" checked={profile?.show_completed ?? true} onChange={(event) => onSettingsChange({ show_completed: event.target.checked })} /> {/* guarda el ajuste */}
          </label> {/* cierra mostrar completadas */}
        </div> // cierra la lista de ajustes
      ) : ( // vista Perfil
        <div className="profile-info"> {/* datos institucionales */}
          <span>Institución</span> {/* etiqueta */}
          <b>IE La Candelaria · Medellín</b> {/* valor */}
          <span>Rol</span> {/* etiqueta */}
          <b>{roleLabel(profile?.role)}</b> {/* rol en español */}
          <span>Fecha de registro</span> {/* etiqueta */}
          <b>{profile?.created_at ? new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(profile.created_at)) : "No disponible"}</b> {/* fecha larga o fallback */}
          <span>Proyecto</span> {/* etiqueta */}
          <b>Proyecto Pedagógico Integrador · Grado 11</b> {/* valor */}
        </div> // cierra los datos
      )} // cierra el ternario Configuración/Perfil
      <button className="outline-button logout-profile" onClick={onLogout}>Cerrar sesión</button> {/* cierra sesión */}
    </section> // cierra el panel
  ); // cierra el return de Profile
} // cierra Profile

export default App; // exporta App como componente raíz






