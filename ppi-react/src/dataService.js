// @ts-nocheck
// Acceso a Supabase: perfiles, tareas, mensajes y adjuntos.
// Las políticas RLS son la barrera real; aquí solo enviamos lo necesario.
import { supabase } from "./supabaseClient";

const PROFILE_UPDATABLE = [
  "full_name",
  "role",
  "avatar_url",
  "reminders_enabled",
  "show_completed",
  "browser_notifications_enabled",
  "alarms_enabled",
  "alarm_sound",
  "alarm_volume",
];

// Base columns for profiles - used by most queries
const PROFILE_BASE_COLUMNS = [
  "id",
  "full_name",
  "email",
  "role",
  "avatar_url",
  "created_at",
  "reminders_enabled",
  "show_completed",
  "browser_notifications_enabled",
  "alarms_enabled",
  "alarm_sound",
  "alarm_volume",
  "is_active",
].join(",");

// Extended columns with status
const PROFILE_SAFE_COLUMNS = [...PROFILE_BASE_COLUMNS.split(","), "status"].join(",");

// Full columns including disabled_at
const PROFILE_FULL_COLUMNS = [...PROFILE_SAFE_COLUMNS.split(","), "disabled_at"].join(",");

// Minimum columns for basic profile info
const PROFILE_MIN_COLUMNS = "id,full_name,email,role,created_at";

const taskColumns =
  "id,user_id,assigned_by,title,description,subject,date,time,priority,reminder,completed,source,external_id,created_at,updated_at,task_attachments(id,storage_path,file_name,content_type)";

// Utility function to get profile columns based on detail level
export function getProfileColumns(level = 'base') {
  const levels = {
    full: PROFILE_FULL_COLUMNS,
    safe: PROFILE_SAFE_COLUMNS,
    base: PROFILE_BASE_COLUMNS,
    min: PROFILE_MIN_COLUMNS,
  };
  return levels[level] || levels.min;
}

// Email validation - stricter regex
export function validateEmail(email) {
  if (!email) return false;
  const normalized = String(email).trim().toLowerCase();
  const parts = normalized.split("@");
  const [local, domain] = parts;
  if (!local || !domain || parts.length !== 2) return false;
  if (!/^[a-z0-9._%+-]+$/.test(local) || local.startsWith(".") || local.endsWith(".")) return false;
  if (domain === "localhost") return true;
  if (domain.includes("..") || domain.startsWith(".") || domain.endsWith(".")) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);
}

// Task validation
export function isValidTask(task) {
  if (!task) return false;
  
  const requiredFields = ['title', 'subject', 'date', 'time', 'priority', 'reminder'];
  for (const field of requiredFields) {
    if (!task[field] && task[field] !== 0 && task[field] !== false) {
      return false;
    }
  }
  
  // Validate title and subject have content after trim
  if (String(task.title || '').trim().length === 0) return false;
  if (String(task.subject || '').trim().length === 0) return false;
  
  // Validate priority
  const validPriorities = ['Alta', 'Media', 'Baja'];
  if (!validPriorities.includes(task.priority)) return false;
  
  return true;
}

// La elevación de privilegios se decide en Supabase por rol y estado activo.
export const PRIMARY_ADMIN_EMAIL = "";

export const ROLE_OPTIONS = [
  { value: "estudiante", label: "Estudiante" },
  { value: "padre", label: "Padre" },
  { value: "madre", label: "Madre" },
  { value: "profesor", label: "Profesor" },
  { value: "trabajador", label: "Trabajador" },
  { value: "administrador", label: "Administrador" },
];

export const SELF_ROLE_OPTIONS = ROLE_OPTIONS.filter(
  (item) => !["profesor", "administrador"].includes(item.value),
);

export const STAFF_ASSIGN_ROLES = ROLE_OPTIONS.filter((item) =>
  ["estudiante", "profesor", "administrador", "padre", "madre", "trabajador"].includes(item.value),
);

export function roleLabel(role) {
  const found = ROLE_OPTIONS.find((item) => item.value === role);
  if (found) return found.label;
  if (role === "student") return "Estudiante";
  if (role === "admin") return "Administrador";
  return "Estudiante";
}

export function isAdminRole(role) {
  return role === "administrador";
}

export function isStaffRole(role) {
  return role === "profesor" || isAdminRole(role);
}

function withActiveDefaults(row) {
  if (!row) return row;
  return { ...row, status: row.status || "activo", disabled_at: row.disabled_at || null };
}

function ensureBackend() {
  if (!supabase) throw new Error("Supabase no está configurado.");
}

// Single, secure profile fetch - includes status so accounts deactivated by staff are not trusted by the UI.
async function readProfileById(id) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FULL_COLUMNS)
    .eq("id", id)
    .single();
  
  if (!error && data) return withActiveDefaults(data);
  
  // If disabled_at is unavailable in an older local schema, keep the status-aware fallback.
  const { data: safeData, error: safeError } = await supabase
    .from("profiles")
    .select(PROFILE_SAFE_COLUMNS)
    .eq("id", id)
    .single();
  
  if (!safeError && safeData) return withActiveDefaults(safeData);
  
  // If still failing, throw the last error
  throw error || safeError || new Error("No se pudo obtener el perfil");
}

// Map database task to frontend format
export function mapTask(task) {
  if (!task) return null;
  
  return {
    id: task.id,
    userId: task.user_id,
    assignedBy: task.assigned_by || null,
    title: task.title,
    description: task.description || "",
    subject: task.subject,
    date: task.date,
    time: task.time,
    priority: task.priority,
    reminder: task.reminder,
    completed: task.completed,
    source: task.source || "recordate",
    externalId: task.external_id || null,
    attachments: task.task_attachments || [],
  };
}

export async function getProfile(user) {
  ensureBackend();
  return readProfileById(user.id);
}

export async function ensureProfile(user, fullName = "") {
  ensureBackend();
  const metaRole = user.user_metadata?.role;
  const profile = {
    id: user.id,
    full_name: fullName || user.user_metadata?.full_name || user.email.split("@")[0],
    email: user.email,
  };
  if (SELF_ROLE_OPTIONS.some((item) => item.value === metaRole)) {
    profile.role = metaRole;
  }
  const { error } = await supabase.from("profiles").upsert(profile, { onConflict: "id" });
  if (error && !/duplicate|conflict/i.test(error.message || "")) {
    const existing = await readProfileById(user.id).catch(() => null);
    if (!existing) throw error;
    return existing;
  }
  return readProfileById(user.id);
}

export async function updateProfileSettings(settings) {
  ensureBackend();
  const payload = {};
  for (const key of PROFILE_UPDATABLE) {
    if (settings && Object.prototype.hasOwnProperty.call(settings, key) && settings[key] !== undefined) {
      payload[key] = settings[key];
    }
  }
  if (payload.role && !SELF_ROLE_OPTIONS.some((item) => item.value === payload.role)) {
    throw new Error("Ese rol solo lo asigna el administrador.");
  }
  if (payload.alarm_sound && !["classic", "digital", "chime", "gentle"].includes(payload.alarm_sound)) {
    throw new Error("Ese sonido de alarma no está disponible.");
  }
  if (payload.alarm_volume !== undefined && (!Number.isFinite(Number(payload.alarm_volume)) || Number(payload.alarm_volume) < 0 || Number(payload.alarm_volume) > 1)) {
    throw new Error("El volumen de la alarma debe estar entre 0 y 1.");
  }
  if (!Object.keys(payload).length) {
    throw new Error("No hay cambios para guardar.");
  }
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", authData.user.id);
  if (error) throw error;
  if (payload.role || payload.full_name) {
    await supabase.auth.updateUser({
      data: {
        ...(payload.role ? { role: payload.role } : {}),
        ...(payload.full_name ? { full_name: payload.full_name } : {}),
        ...(payload.avatar_url !== undefined ? { avatar_url: payload.avatar_url } : {}),
      },
    });
  }
  return readProfileById(authData.user.id);
}

export async function uploadAvatar(file) {
  ensureBackend();
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Solo puedes subir imágenes para la foto de perfil.");
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error("La foto de perfil no puede superar los 3 MB.");
  }
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
  return updateProfileSettings({ avatar_url: avatarUrl });
}

export async function listTasks() {
  ensureBackend();
  // Single query with all needed columns - no fallback to avoid security issues
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  
  if (error) throw error;
  return (data || []).map(mapTask);
}

export async function createTask(task) {
  ensureBackend();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: task.title.trim(),
      description: task.description?.trim() || null,
      subject: task.subject.trim(),
      date: task.date,
      time: task.time,
      priority: task.priority,
      reminder: task.reminder,
      completed: false,
      source: task.source || "recordate",
      external_id: task.externalId || null,
    })
    .select(taskColumns)
    .single();
  if (error) throw error;
  return mapTask(data);
}

export async function updateTask(task) {
  ensureBackend();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: task.title.trim(),
      description: task.description?.trim() || null,
      subject: task.subject.trim(),
      date: task.date,
      time: task.time,
      priority: task.priority,
      reminder: task.reminder,
      completed: task.completed,
    })
    .eq("id", task.id)
    .select(taskColumns)
    .single();
  if (error) throw error;
  return mapTask(data);
}

export async function deleteTask(id) {
  ensureBackend();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function shareTask(taskId, email) {
  ensureBackend();
  const { data, error } = await supabase.rpc("share_task_by_email", {
    requested_task_id: taskId,
    recipient_email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  return data;
}

export async function listSharedTasks() {
  ensureBackend();
  try {
    const { data, error } = await supabase.rpc("list_task_shares");
    if (error) throw error;
    return (data || []).map((share) => ({
      ...share,
      task: share.task_title || "Tarea compartida",
      taskDetails: {
        id: share.task_id,
        title: share.task_title,
        description: share.task_description || "",
        subject: share.task_subject,
        date: share.task_date,
        time: share.task_time,
        priority: share.task_priority,
        reminder: share.task_reminder,
        completed: share.task_completed,
      },
    }));
  } catch (error) {
    console.warn("RECORDATE: no se pudieron cargar las agendas compartidas", error);
    return [];
  }
}

export async function revokeSharedTask(shareId) {
  ensureBackend();
  const { error } = await supabase.from("task_shares").delete().eq("id", shareId);
  if (error) throw error;
}

export async function listMessages() {
  ensureBackend();
  const { data, error } = await supabase.rpc("list_my_messages");
  if (error) {
    const fallback = await supabase
      .from("messages")
      .select("id,sender_id,recipient_id,body,read_at,created_at")
      .not("recipient_id", "is", null)
      .order("created_at", { ascending: true });
    if (fallback.error) throw fallback.error;
    return fallback.data || [];
  }
  return data || [];
}

export async function findUserByEmail(email) {
  ensureBackend();
  const { data, error } = await supabase.rpc("find_profile_by_email", {
    requested_email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function sendMessage(body, recipientId) {
  ensureBackend();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  const text = String(body || "").trim();
  if (!text) throw new Error("Escribe un mensaje antes de enviarlo.");
  if (text.length > 2000) throw new Error("El mensaje no puede superar los 2000 caracteres.");
  if (!recipientId) throw new Error("Elige un destinatario.");
  const { data, error } = await supabase
    .from("messages")
    .insert({ body: text, recipient_id: recipientId })
    .select("id,sender_id,recipient_id,body,read_at,created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function markMessagesRead(messageIds = null) {
  ensureBackend();
  const { data, error } = await supabase.rpc("mark_messages_read", {
    message_ids: messageIds,
  });
  if (error) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) throw error;
    let query = supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (messageIds?.length) query = query.in("id", messageIds);
    const fallback = await query;
    if (fallback.error) throw fallback.error;
    return 0;
  }
  return data || 0;
}

export async function listNotifications() {
  ensureBackend();
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("id,task_id,type,title,body,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn("RECORDATE: no se pudieron cargar las notificaciones", error);
    return [];
  }
}

export async function markNotificationRead(id) {
  ensureBackend();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  ensureBackend();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function savePushSubscription(subscription) {
  ensureBackend();
  const keys = subscription.toJSON().keys;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function uploadTaskAttachment(taskId, file) {
  ensureBackend();
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Solo puedes adjuntar imágenes.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen no puede superar los 5 MB.");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${taskId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: taskId,
      storage_path: path,
      file_name: file.name,
      content_type: file.type,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from("task-attachments").remove([path]);
    throw error;
  }
  return data;
}

export async function getAttachmentUrl(path) {
  ensureBackend();
  const { data, error } = await supabase.storage.from("task-attachments").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteTaskAttachment(attachment) {
  ensureBackend();
  const { error: storageError } = await supabase.storage
    .from("task-attachments")
    .remove([attachment.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("task_attachments").delete().eq("id", attachment.id);
  if (error) throw error;
}

export function subscribeToNotifications(userId, onChange) {
  if (!supabase || !userId) return () => {};
  // Seguridad: el filtro Realtime debe coincidir con la sesión actual (RLS también aplica).
  let active = true;
  let channel = null;
  supabase.auth.getUser().then(({ data }) => {
    if (!active) return;
    if (!data?.user?.id || data.user.id !== userId) return;
    channel = supabase
      .channel(`recordate-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        onChange,
      )
      .subscribe();
  });
  return () => {
    active = false;
    if (channel) supabase.removeChannel(channel);
  };
}

export function subscribeToMessages(userId, onChange) {
  if (!supabase || !userId) return () => {};
  // Seguridad: solo suscribir canales del usuario autenticado.
  let active = true;
  let channel = null;
  supabase.auth.getUser().then(({ data }) => {
    if (!active) return;
    if (!data?.user?.id || data.user.id !== userId) return;
    channel = supabase
      .channel(`recordate-messages-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `sender_id=eq.${userId}` }, onChange)
      .subscribe();
  });
  return () => {
    active = false;
    if (channel) supabase.removeChannel(channel);
  };
}

export async function listManagedUsers() {
  ensureBackend();
  const { data, error } = await supabase.rpc("list_managed_users");
  if (error) throw error;
  return data || [];
}

export async function setUserStatus(userId, status) {
  ensureBackend();
  const { data, error } = await supabase.rpc("set_user_status", {
    target_id: userId,
    next_status: status,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function setUserRole(userId, role) {
  ensureBackend();
  const { data, error } = await supabase.rpc("set_user_role", {
    target_id: userId,
    next_role: role,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function assignTaskToUser(recipientId, task) {
  ensureBackend();
  const { data, error } = await supabase.rpc("assign_task_to_user", {
    recipient_id: recipientId,
    task_title: task.title.trim(),
    task_subject: task.subject.trim(),
    task_date: task.date,
    task_time: task.time,
    task_description: task.description?.trim() || null,
    task_priority: task.priority || "Media",
    task_reminder: task.reminder || "30 minutos antes",
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return mapTask({ ...row, task_attachments: [] });
}

export function isAccountDisabled(profile) {
  return Boolean(profile && (profile.status === "baja" || profile.is_active === false || profile.disabled_at));
}
