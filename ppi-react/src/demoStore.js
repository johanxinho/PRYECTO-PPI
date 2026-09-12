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
      role: "student", // Rol de estudiante
      created_at: "2026-03-05T12:00:00.000Z", // Fecha ficticia de alta
      reminders_enabled: true, // Recordatorios encendidos
      show_completed: true, // Mostrar tareas ya hechas
      browser_notifications_enabled: false, // Push del navegador apagado
      alarms_enabled: true, // Alarmas locales encendidas
    },
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
    shares: [], // Aún no hay tareas compartidas
    messages: [], // Chat vacío al inicio
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
    if (raw) return JSON.parse(raw); // Convierte el texto a objeto
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
  share(taskId, email) { // taskId y correo del destinatario ficticio
    const state = read(); // Estado actual
    const task = state.tasks.find((item) => item.id === taskId); // Busca el título para mostrarlo
    const created = { // Registro de compartición de mentiras
      id: crypto.randomUUID(), // Id del share
      task_id: taskId, // Tarea compartida
      owner_id: DEMO_SESSION.user.id, // Quién comparte
      recipient_id: "demo-peer", // Destinatario ficticio
      recipient_email: email, // Correo escrito por el usuario
      recipient_name: email.split("@")[0], // Parte antes del @ como nombre
      task: task?.title || "Tarea compartida", // Título o texto por defecto
      created_at: new Date().toISOString(), // Fecha del share
    };
    state.shares = [...state.shares, created]; // Agrega al historial
    write(state); // Persiste
    return created; // Devuelve el share creado
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
  sendMessage(body, recipientId) { // Texto y destinatario
    const state = read(); // Estado actual
    const created = { // Mensaje nuevo
      id: crypto.randomUUID(), // Id local
      sender_id: DEMO_SESSION.user.id, // Remitente demo
      recipient_id: recipientId, // Destinatario
      body, // Texto
      created_at: new Date().toISOString(), // Hora de envío
    };
    state.messages = [...state.messages, created]; // Lo agrega al historial
    write(state); // Persiste
    return created; // Mensaje creado
  },
  /**
   * listMessages: devuelve todos los mensajes guardados.
   */
  listMessages() { // Lectura del chat
    return read().messages; // Solo el arreglo de mensajes
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
};
