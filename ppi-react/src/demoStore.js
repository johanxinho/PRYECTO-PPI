// @ts-nocheck
// Capa local usada SOLO cuando no hay sesión de Supabase (modo demostración).
// No sustituye la base de datos real: si VITE_SUPABASE_* está configurado,
// App.jsx usa dataService.js y este archivo no interviene.

const KEY = "recordate-demo-v2"; // Clave de localStorage donde se guarda el estado de demo

/**
 * today: devuelve la fecha de hoy en formato YYYY-MM-DD (el mismo de un input date).
 */
const today = () => { // Fecha actual como texto
  const date = new Date(); // Reloj del navegador
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; // Año-mes-día con ceros a la izquierda
};

/**
 * shift: suma (o resta) días a hoy y devuelve esa fecha en YYYY-MM-DD.
 */
const shift = (days) => { // days puede ser positivo (futuro) o negativo (pasado)
  const date = new Date(); // Parte de hoy
  date.setDate(date.getDate() + days); // Mueve el calendario
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; // Misma plantilla de fecha
};

export const DEMO_SESSION = { // Sesión fingida para explorar la app sin cuenta real
  user: { // Usuario de demostración
    id: "demo-local-user", // Id fijo local (no es un UUID de Supabase)
    email: "andrea@recordate.local", // Correo interno; el dominio .local identifica el modo demo
    user_metadata: { full_name: "Andrea Restrepo" }, // Nombre que se muestra en el perfil
  },
};

/**
 * seed: arma el estado inicial (perfil, tareas, avisos) la primera vez que se abre el demo.
 */
function seed() { // Datos de ejemplo para que la agenda no arranque vacía
  const userId = DEMO_SESSION.user.id; // Id del usuario demo, reutilizado en cada tarea
  return { // Estado completo que se guardará en localStorage
    profile: { // Perfil de Andrea
      id: userId, // Mismo id de la sesión demo
      full_name: "Andrea Restrepo", // Nombre visible
      email: DEMO_SESSION.user.email, // Correo demo
      role: "estudiante",
      avatar_url: null,
      created_at: "2026-03-05T12:00:00.000Z", // Fecha ficticia de alta
      reminders_enabled: true, // Recordatorios encendidos
      show_completed: true, // Mostrar tareas ya hechas
      browser_notifications_enabled: false, // Push del navegador apagado
      alarms_enabled: true, // Alarmas locales encendidas
      status: "activo",
    },
    users: [
      { id: "demo-carlos", full_name: "Carlos Pérez", email: "carlos@recordate.local", role: "profesor", status: "activo", avatar_url: null, created_at: "2026-03-01T12:00:00.000Z" },
      { id: "demo-lucia", full_name: "Lucía Gómez", email: "lucia@recordate.local", role: "estudiante", status: "activo", avatar_url: null, created_at: "2026-03-08T12:00:00.000Z" },
      { id: "demo-mateo", full_name: "Mateo Herrera", email: "mateo@recordate.local", role: "estudiante", status: "activo", avatar_url: null, created_at: "2026-03-10T12:00:00.000Z" },
    ],
    tasks: [ // Cuatro tareas de ejemplo (colegio)
      { // Tarea 1: para hoy
        id: "demo-1", // Id local
        userId, // Dueña: Andrea
        title: "Entrega de taller de funciones", // Título
        subject: "Matemáticas", // Materia
        date: today(), // Hoy
        time: "16:00", // Hora
        priority: "Alta", // Prioridad alta
        description: "Resolver los ejercicios 4 a 9 y adjuntar el procedimiento.", // Detalle
        reminder: "1 hora antes", // Aviso
        completed: false, // Pendiente
        assignedBy: null,
        attachments: [], // Sin imágenes
      },
      { // Tarea 2: mañana
        id: "demo-2", // Id local
        userId, // Dueña: Andrea
        title: "Lectura de ciencias sociales", // Título
        subject: "Ciencias sociales", // Materia
        date: shift(1), // Mañana
        time: "10:00", // Hora
        priority: "Media", // Prioridad media
        description: "Capítulo sobre Medellín y la memoria urbana.", // Detalle
        reminder: "30 minutos antes", // Aviso
        completed: false, // Pendiente
        attachments: [], // Sin imágenes
      },
      { // Tarea 3: en tres días
        id: "demo-3", // Id local
        userId, // Dueña: Andrea
        title: "Ensayo de lenguaje", // Título
        subject: "Lengua castellana", // Materia
        date: shift(3), // Dentro de 3 días
        time: "08:30", // Hora
        priority: "Alta", // Prioridad alta
        description: "Borrador de 600 palabras sobre identidad y territorio.", // Detalle
        reminder: "1 día antes", // Aviso
        completed: false, // Pendiente
        attachments: [], // Sin imágenes
      },
      { // Tarea 4: ayer, ya completada
        id: "demo-4", // Id local
        userId, // Dueña: Andrea
        title: "Laboratorio de química", // Título
        subject: "Química", // Materia
        date: shift(-1), // Ayer
        time: "14:20", // Hora
        priority: "Baja", // Prioridad baja
        description: "Informe del experimento de indicadores naturales.", // Detalle
        reminder: "Al momento", // Aviso
        completed: true, // Ya hecha
        attachments: [], // Sin imágenes
      },
    ],
    shares: [
      {
        id: "demo-share-in",
        task_id: "demo-shared-1",
        owner_id: "demo-peer",
        recipient_id: userId,
        owner_name: "Carlos Pérez",
        owner_email: "carlos@recordate.local",
        owner_avatar_url: null,
        owner_role: "profesor",
        recipient_name: "Andrea Restrepo",
        recipient_email: DEMO_SESSION.user.email,
        recipient_avatar_url: null,
        recipient_role: "estudiante",
        task: "Guía de lectura compartida",
        task_title: "Guía de lectura compartida",
        task_description: "Lee las páginas 12 a 20 y toma nota de tres ideas clave.",
        task_subject: "Lengua castellana",
        task_date: shift(2),
        task_time: "09:00",
        task_priority: "Media",
        task_completed: false,
        task_reminder: "1 hora antes",
        taskDetails: {
          id: "demo-shared-1",
          title: "Guía de lectura compartida",
          description: "Lee las páginas 12 a 20 y toma nota de tres ideas clave.",
          subject: "Lengua castellana",
          date: shift(2),
          time: "09:00",
          priority: "Media",
          reminder: "1 hora antes",
          completed: false,
          attachments: [],
        },
        created_at: new Date().toISOString(),
      },
    ],
    messages: [
      {
        id: "demo-msg-in",
        sender_id: "demo-peer",
        recipient_id: userId,
        body: "Hola Andrea, te compartí la guía de lectura. ¿La revisas hoy?",
        read_at: null,
        created_at: new Date().toISOString(),
        sender_name: "Carlos Pérez",
        sender_email: "carlos@recordate.local",
        sender_avatar_url: null,
        sender_role: "profesor",
        recipient_name: "Andrea Restrepo",
        recipient_email: DEMO_SESSION.user.email,
        recipient_avatar_url: null,
        recipient_role: "estudiante",
      },
    ],
    notifications: [ // Un aviso de sistema para explicar el modo demo
      {
        id: "demo-n1", // Id local del aviso
        type: "system", // Tipo sistema (no es recordatorio de tarea)
        title: "Agenda de demostración", // Título del aviso
        body: "Estás explorando RECORDATE con datos locales. Nada se envía a la nube.", // Explica que no hay nube
        read_at: null, // Sin leer
        created_at: new Date().toISOString(), // Marca de tiempo actual
      },
    ],
  };
}

/**
 * read: lee el estado demo desde localStorage; si no hay datos, crea el seed.
 */
function read() { // Carga el estado persistido
  try { // JSON.parse puede fallar si el texto está corrupto
    const raw = localStorage.getItem(KEY); // Texto guardado o null
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.users)) parsed.users = seed().users;
      if (!parsed.profile?.status) parsed.profile = { ...parsed.profile, status: "activo" };
      return parsed;
    }
  } catch { // Si el JSON es inválido se ignora
    /* ignore */
  }
  const initial = seed(); // Estado de fábrica
  write(initial); // Lo guarda para las próximas visitas
  return initial; // Lo entrega a quien llamó
}

/**
 * write: serializa el estado y lo guarda en localStorage.
 */
function write(state) { // Recibe el objeto completo de demo
  localStorage.setItem(KEY, JSON.stringify(state)); // Convierte a texto y persiste
}

/**
 * isDemoSession: true si el correo termina en @recordate.local (modo demostración).
 */
export function isDemoSession(session) { // Distingue demo de una sesión real de Supabase
  return session?.user?.email?.endsWith("@recordate.local"); // Encadenamiento opcional por si session es null
}

export const demoApi = { // Mini API local que imita a dataService
  /**
   * load: entrega el estado actual (perfil, tareas, mensajes, avisos).
   */
  load() { // Lectura completa
    return read(); // Reutiliza read()
  },
  /**
   * saveProfile: mezcla la configuración nueva con el perfil guardado.
   */
  saveProfile(settings) { // settings son los interruptores del perfil
    const state = read(); // Estado actual
    state.profile = { ...state.profile, ...settings }; // Copia el perfil y pisa con lo nuevo
    write(state); // Persiste
    return state.profile; // Perfil ya mezclado
  },
  /**
   * saveTask: crea una tarea nueva o actualiza una existente según tenga id.
   */
  saveTask(task) { // Si trae id, edita; si no, crea
    const state = read(); // Estado actual
    if (task.id) { // Edición
      state.tasks = state.tasks.map((item) => (item.id === task.id ? { ...item, ...task, attachments: item.attachments || [] } : item)); // Reemplaza la coincidencia y conserva adjuntos
    } else { // Alta
      const created = { // Nueva tarea local
        ...task, // Copia campos del formulario
        id: crypto.randomUUID(), // Id único del navegador
        userId: DEMO_SESSION.user.id, // Dueña demo
        completed: false, // Nace pendiente
        attachments: [], // Sin archivos
      };
      state.tasks = [created, ...state.tasks]; // La pone al inicio de la lista
      write(state); // Persiste
      return created; // Devuelve la creada
    }
    write(state); // Persiste la edición
    return state.tasks.find((item) => item.id === task.id); // Devuelve la tarea editada
  },
  /**
   * deleteTask: quita una tarea de la lista local.
   */
  deleteTask(id) { // id de la tarea a borrar
    const state = read(); // Estado actual
    state.tasks = state.tasks.filter((task) => task.id !== id); // Deja todas menos esa
    write(state); // Persiste
  },
  /**
   * share: simula compartir una tarea con otro correo (solo en memoria local).
   */
  share(taskId, email) {
    const state = read();
    const task = state.tasks.find((item) => item.id === taskId);
    const created = {
      id: crypto.randomUUID(),
      task_id: taskId,
      owner_id: DEMO_SESSION.user.id,
      recipient_id: "demo-peer",
      recipient_email: email,
      recipient_name: email.split("@")[0],
      recipient_avatar_url: null,
      recipient_role: "estudiante",
      owner_name: state.profile.full_name,
      owner_email: state.profile.email,
      owner_avatar_url: state.profile.avatar_url,
      owner_role: state.profile.role,
      task: task?.title || "Tarea compartida",
      task_title: task?.title || "Tarea compartida",
      task_description: task?.description || "",
      task_subject: task?.subject || "",
      task_date: task?.date || null,
      task_time: task?.time || null,
      task_priority: task?.priority || "Media",
      task_completed: task?.completed || false,
      task_reminder: task?.reminder || "",
      taskDetails: task
        ? {
            id: task.id,
            title: task.title,
            description: task.description || "",
            subject: task.subject,
            date: task.date,
            time: task.time,
            priority: task.priority,
            reminder: task.reminder,
            completed: task.completed,
            attachments: task.attachments || [],
          }
        : null,
      created_at: new Date().toISOString(),
    };
    state.shares = [...state.shares, created];
    write(state);
    return created;
  },
  /**
   * revoke: elimina una compartición por su id.
   */
  revoke(id) { // id del share
    const state = read(); // Estado actual
    state.shares = state.shares.filter((item) => item.id !== id); // Filtra esa relación
    write(state); // Persiste
  },
  /**
   * sendMessage: agrega un mensaje al chat local.
   */
  sendMessage(body, recipientId) {
    const state = read();
    const created = {
      id: crypto.randomUUID(),
      sender_id: DEMO_SESSION.user.id,
      recipient_id: recipientId,
      body,
      read_at: null,
      created_at: new Date().toISOString(),
      sender_name: state.profile.full_name,
      sender_email: state.profile.email,
      sender_avatar_url: state.profile.avatar_url,
      sender_role: state.profile.role,
      recipient_name: recipientId === "demo-peer" ? "Compañero demo" : "Destinatario",
      recipient_email: recipientId === "demo-peer" ? "compañero@recordate.local" : "",
      recipient_avatar_url: null,
      recipient_role: "estudiante",
    };
    state.messages = [...state.messages, created];
    write(state);
    return created;
  },
  listMessages() {
    return read().messages;
  },
  markMessagesRead(messageIds = null) {
    const state = read();
    const now = new Date().toISOString();
    state.messages = state.messages.map((item) => {
      if (item.recipient_id !== DEMO_SESSION.user.id) return item;
      if (messageIds?.length && !messageIds.includes(item.id)) return item;
      return { ...item, read_at: item.read_at || now };
    });
    write(state);
    return state.messages.filter((item) => item.read_at).length;
  },
  saveAvatar(dataUrl) {
    const state = read();
    state.profile = { ...state.profile, avatar_url: dataUrl };
    write(state);
    return state.profile;
  },
  /**
   * markAllRead: marca todas las notificaciones como leídas.
   */
  markAllRead() { // Lote
    const state = read(); // Estado actual
    state.notifications = state.notifications.map((item) => ({ ...item, read_at: new Date().toISOString() })); // Pone fecha de lectura a todas
    write(state); // Persiste
  },
  /**
   * markOneRead: marca una sola notificación como leída.
   */
  markOneRead(id) { // id del aviso
    const state = read(); // Estado actual
    state.notifications = state.notifications.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item)); // Solo cambia la coincidencia
    write(state); // Persiste
  },
  listUsers() {
    return read().users || [];
  },
  setUserStatus(userId, status) {
    const state = read();
    state.users = (state.users || []).map((item) =>
      item.id === userId
        ? { ...item, status, disabled_at: status === "baja" ? new Date().toISOString() : null }
        : item,
    );
    write(state);
    return state.users.find((item) => item.id === userId);
  },
  setUserRole(userId, role) {
    const state = read();
    state.users = (state.users || []).map((item) => (item.id === userId ? { ...item, role } : item));
    write(state);
    return state.users.find((item) => item.id === userId);
  },
  assignTask(userId, task) {
    const state = read();
    const recipient = (state.users || []).find((item) => item.id === userId);
    const created = {
      ...task,
      id: crypto.randomUUID(),
      userId,
      assignedBy: DEMO_SESSION.user.id,
      completed: false,
      attachments: [],
      assigneeName: recipient?.full_name,
    };
    state.tasks = [created, ...state.tasks];
    write(state);
    return created;
  },
  claimAdmin() {
    const state = read();
    state.profile = { ...state.profile, role: "administrador", status: "activo" };
    write(state);
    return state.profile;
  },
};
