// @ts-nocheck
// Capa local usada SOLO cuando no hay sesión de Supabase (modo demostración).
// No sustituye la base de datos real: si VITE_SUPABASE_* está configurado,
// App.jsx usa dataService.js y este archivo no interviene.

const KEY = "recordate-demo-v2";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const shift = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const DEMO_SESSION = {
  user: {
    id: "demo-local-user",
    email: "andrea@recordate.local",
    user_metadata: { full_name: "Andrea Restrepo" },
  },
};

function seed() {
  const userId = DEMO_SESSION.user.id;
  return {
    profile: {
      id: userId,
      full_name: "Andrea Restrepo",
      email: DEMO_SESSION.user.email,
      role: "student",
      created_at: "2026-03-05T12:00:00.000Z",
      reminders_enabled: true,
      show_completed: true,
      browser_notifications_enabled: false,
      alarms_enabled: true,
    },
    tasks: [
      {
        id: "demo-1",
        userId,
        title: "Entrega de taller de funciones",
        subject: "Matemáticas",
        date: today(),
        time: "16:00",
        priority: "Alta",
        description: "Resolver los ejercicios 4 a 9 y adjuntar el procedimiento.",
        reminder: "1 hora antes",
        completed: false,
        attachments: [],
      },
      {
        id: "demo-2",
        userId,
        title: "Lectura de ciencias sociales",
        subject: "Ciencias sociales",
        date: shift(1),
        time: "10:00",
        priority: "Media",
        description: "Capítulo sobre Medellín y la memoria urbana.",
        reminder: "30 minutos antes",
        completed: false,
        attachments: [],
      },
      {
        id: "demo-3",
        userId,
        title: "Ensayo de lenguaje",
        subject: "Lengua castellana",
        date: shift(3),
        time: "08:30",
        priority: "Alta",
        description: "Borrador de 600 palabras sobre identidad y territorio.",
        reminder: "1 día antes",
        completed: false,
        attachments: [],
      },
      {
        id: "demo-4",
        userId,
        title: "Laboratorio de química",
        subject: "Química",
        date: shift(-1),
        time: "14:20",
        priority: "Baja",
        description: "Informe del experimento de indicadores naturales.",
        reminder: "Al momento",
        completed: true,
        attachments: [],
      },
    ],
    shares: [],
    messages: [],
    notifications: [
      {
        id: "demo-n1",
        type: "system",
        title: "Agenda de demostración",
        body: "Estás explorando RECORDATE con datos locales. Nada se envía a la nube.",
        read_at: null,
        created_at: new Date().toISOString(),
      },
    ],
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const initial = seed();
  write(initial);
  return initial;
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function isDemoSession(session) {
  return session?.user?.email?.endsWith("@recordate.local");
}

export const demoApi = {
  load() {
    return read();
  },
  saveProfile(settings) {
    const state = read();
    state.profile = { ...state.profile, ...settings };
    write(state);
    return state.profile;
  },
  saveTask(task) {
    const state = read();
    if (task.id) {
      state.tasks = state.tasks.map((item) => (item.id === task.id ? { ...item, ...task, attachments: item.attachments || [] } : item));
    } else {
      const created = {
        ...task,
        id: crypto.randomUUID(),
        userId: DEMO_SESSION.user.id,
        completed: false,
        attachments: [],
      };
      state.tasks = [created, ...state.tasks];
      write(state);
      return created;
    }
    write(state);
    return state.tasks.find((item) => item.id === task.id);
  },
  deleteTask(id) {
    const state = read();
    state.tasks = state.tasks.filter((task) => task.id !== id);
    write(state);
  },
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
      task: task?.title || "Tarea compartida",
      created_at: new Date().toISOString(),
    };
    state.shares = [...state.shares, created];
    write(state);
    return created;
  },
  revoke(id) {
    const state = read();
    state.shares = state.shares.filter((item) => item.id !== id);
    write(state);
  },
  sendMessage(body, recipientId) {
    const state = read();
    const created = {
      id: crypto.randomUUID(),
      sender_id: DEMO_SESSION.user.id,
      recipient_id: recipientId,
      body,
      created_at: new Date().toISOString(),
    };
    state.messages = [...state.messages, created];
    write(state);
    return created;
  },
  listMessages() {
    return read().messages;
  },
  markAllRead() {
    const state = read();
    state.notifications = state.notifications.map((item) => ({ ...item, read_at: new Date().toISOString() }));
    write(state);
  },
  markOneRead(id) {
    const state = read();
    state.notifications = state.notifications.map((item) => (item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    write(state);
  },
};
