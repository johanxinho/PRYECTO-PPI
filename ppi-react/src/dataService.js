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
];

const profileColumns =
  "id,full_name,email,role,avatar_url,created_at,reminders_enabled,show_completed,browser_notifications_enabled,alarms_enabled";

const taskColumns =
  "id,user_id,title,description,subject,date,time,priority,reminder,completed,created_at,updated_at,task_attachments(id,storage_path,file_name,content_type)";

export const ROLE_OPTIONS = [
  { value: "estudiante", label: "Estudiante" },
  { value: "padre", label: "Padre" },
  { value: "madre", label: "Madre" },
  { value: "profesor", label: "Profesor" },
  { value: "trabajador", label: "Trabajador" },
];

export function roleLabel(role) {
  const found = ROLE_OPTIONS.find((item) => item.value === role);
  if (found) return found.label;
  if (role === "student") return "Estudiante";
  if (role === "admin") return "Profesor";
  return "Estudiante";
}

function ensureBackend() {
  if (!supabase) throw new Error("Supabase no está configurado.");
}

function mapTask(task) {
  return {
    id: task.id,
    userId: task.user_id,
    title: task.title,
    description: task.description || "",
    subject: task.subject,
    date: task.date,
    time: task.time,
    priority: task.priority,
    reminder: task.reminder,
    completed: task.completed,
    attachments: task.task_attachments || [],
  };
}

export async function getProfile(user) {
  ensureBackend();
  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function ensureProfile(user, fullName = "") {
  ensureBackend();
  const metaRole = user.user_metadata?.role;
  const profile = {
    id: user.id,
    full_name: fullName || user.user_metadata?.full_name || user.email.split("@")[0],
    email: user.email,
  };
  if (ROLE_OPTIONS.some((item) => item.value === metaRole)) {
    profile.role = metaRole;
  }
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select(profileColumns)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfileSettings(settings) {
  ensureBackend();
  const payload = {};
  for (const key of PROFILE_UPDATABLE) {
    if (settings && Object.prototype.hasOwnProperty.call(settings, key) && settings[key] !== undefined) {
      payload[key] = settings[key];
    }
  }
  if (payload.role && !ROLE_OPTIONS.some((item) => item.value === payload.role)) {
    throw new Error("Rol no válido.");
  }
  if (!Object.keys(payload).length) {
    throw new Error("No hay cambios para guardar.");
  }
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", authData.user.id)
    .select(profileColumns)
    .single();
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
  return data;
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
  const query = (columns) =>
    supabase.from("tasks").select(columns).order("date", { ascending: true }).order("time", { ascending: true });
  let { data, error } = await query(taskColumns);
  if (error) {
    const fallback = await query(
      "id,user_id,title,description,subject,date,time,priority,reminder,completed,created_at,updated_at",
    );
    if (fallback.error) throw fallback.error;
    data = (fallback.data || []).map((task) => ({ ...task, task_attachments: [] }));
  }
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
