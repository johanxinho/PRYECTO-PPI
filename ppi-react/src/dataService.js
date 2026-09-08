import { supabase } from "./supabaseClient";

// dataService concentra toda la lógica de lectura y escritura con Supabase.
// Aquí se protegen las operaciones con validaciones de sesión y se normalizan
// los datos para que la interfaz React pueda consumirlos de manera uniforme.
const taskColumns =
  "id,user_id,title,description,subject,date,time,priority,reminder,completed,created_at,updated_at,task_attachments(id,storage_path,file_name,content_type)";

// ensureBackend: evita ejecutar operaciones si el cliente de Supabase no está disponible.
function ensureBackend() {
  if (!supabase) throw new Error("Supabase no está configurado.");
}

// mapTask: convierte el formato devuelto por Supabase a un modelo más simple
// para uso dentro de la UI de React.
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

// getProfile: devuelve el perfil del usuario autenticado desde la tabla profiles.
export async function getProfile(user) {
  ensureBackend();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,created_at,reminders_enabled,show_completed,browser_notifications_enabled,alarms_enabled")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data;
}

// ensureProfile: crea o actualiza el perfil del usuario con el nombre completo
// y el correo de autenticación para mantener la sincronización con Supabase Auth.
export async function ensureProfile(user, fullName = "") {
  ensureBackend();
  const profile = {
    id: user.id,
    full_name:
      fullName || user.user_metadata?.full_name || user.email.split("@")[0],
    email: user.email,
  };
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("id,full_name,email,role,created_at,reminders_enabled,show_completed,browser_notifications_enabled,alarms_enabled")
    .single();
  if (error) throw error;
  return data;
}

// updateProfileSettings: guarda cambios de configuración del perfil.
export async function updateProfileSettings(settings) {
  ensureBackend();
  const { data, error } = await supabase
    .from("profiles")
    .update(settings)
    .eq("id", (await supabase.auth.getUser()).data.user.id)
    .select("id,full_name,email,role,created_at,reminders_enabled,show_completed,browser_notifications_enabled,alarms_enabled")
    .single();
  if (error) throw error;
  return data;
}

// listTasks: obtiene todas las tareas del usuario ordenadas por fecha y hora.
export async function listTasks() {
  ensureBackend();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error) throw error;
  return data.map(mapTask);
}

// createTask: inserta una nueva tarea con la estructura requerida por la base de datos.
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

// updateTask: modifica una tarea existente y recalcula su fecha de actualización.
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

// deleteTask: elimina una tarea por su identificador.
export async function deleteTask(id) {
  ensureBackend();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// shareTask: comparte una tarea con otro usuario registrado usando la función SQL segura.
export async function shareTask(taskId, email) {
  ensureBackend();
  const { data, error } = await supabase.rpc("share_task_by_email", {
    requested_task_id: taskId,
    recipient_email: email.trim().toLowerCase(),
  });
  if (error) throw error;
  return data;
}

// listSharedTasks: devuelve las tareas compartidas con el usuario actual o por él.
export async function listSharedTasks() {
  ensureBackend();
  const { data, error } = await supabase.rpc("list_task_shares");
  if (error) throw error;
  return data || [];
}

// revokeSharedTask: elimina una relación de compartición existente.
export async function revokeSharedTask(shareId) {
  ensureBackend();
  const { error } = await supabase.from("task_shares").delete().eq("id", shareId);
  if (error) throw error;
}

// listMessages: carga los mensajes del usuario para mostrar conversaciones internas.
export async function listMessages() {
  ensureBackend();
  const { data, error } = await supabase
    .from("messages")
    .select("id,sender_id,recipient_id,body,read_at,created_at")
    .not("recipient_id", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// findUserByEmail: busca el perfil de un usuario por correo para compartir tareas o mensajes.
export async function findUserByEmail(email) {
  ensureBackend();
  const { data, error } = await supabase.rpc("find_profile_by_email", { requested_email: email.trim().toLowerCase() });
  if (error) throw error;
  return data?.[0] || null;
}

// sendMessage: crea un mensaje nuevo dirigido a otro usuario con validación de destinatario.
export async function sendMessage(body, recipientId) {
  ensureBackend();
  const { data, error } = await supabase
    .from("messages")
    .insert({ body: body.trim(), recipient_id: recipientId })
    .select("id,sender_id,recipient_id,body,read_at,created_at")
    .single();
  if (error) throw error;
  return data;
}

// listNotifications: retorna las últimas notificaciones del usuario.
export async function listNotifications() {
  ensureBackend();
  const { data, error } = await supabase.from("notifications").select("id,task_id,type,title,body,read_at,created_at").order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return data || [];
}

// markNotificationRead: marca una notificación como leída.
export async function markNotificationRead(id) {
  ensureBackend();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

// markAllNotificationsRead: marca todas las notificaciones pendientes como leídas.
export async function markAllNotificationsRead() {
  ensureBackend();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) throw error;
}

// savePushSubscription: guarda la suscripción del navegador para recibir notificaciones Web Push.
export async function savePushSubscription(subscription) {
  ensureBackend();
  const keys = subscription.toJSON().keys;
  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }, { onConflict: "endpoint" });
  if (error) throw error;
}

// uploadTaskAttachment: valida y sube una imagen asociada a una tarea al bucket de storage.
export async function uploadTaskAttachment(taskId, file) {
  ensureBackend();
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Solo puedes adjuntar imágenes.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen no puede superar los 5 MB.");
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${taskId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("task-attachments").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from("task_attachments").insert({ task_id: taskId, storage_path: path, file_name: file.name, content_type: file.type }).select().single();
  if (error) {
    await supabase.storage.from("task-attachments").remove([path]);
    throw error;
  }
  return data;
}

// getAttachmentUrl: genera una URL firmada temporal para abrir una imagen adjunta.
export async function getAttachmentUrl(path) {
  ensureBackend();
  const { data, error } = await supabase.storage.from("task-attachments").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

// deleteTaskAttachment: elimina el archivo del storage y limpia su registro en la tabla task_attachments.
export async function deleteTaskAttachment(attachment) {
  ensureBackend();
  const { error: storageError } = await supabase.storage.from("task-attachments").remove([attachment.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("task_attachments").delete().eq("id", attachment.id);
  if (error) throw error;
}

// subscribeToNotifications: escucha inserts nuevos en la tabla notifications para actualizar la UI en tiempo real.
export function subscribeToNotifications(userId, onChange) {
  if (!supabase) return () => {};
  const channel = supabase.channel(`recordate-notifications-${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, onChange).subscribe();
  return () => supabase.removeChannel(channel);
}

// subscribeToMessages: escucha cambios en mensajes para mantener conversaciones sincronizadas en tiempo real.
export function subscribeToMessages(userId, onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`recordate-messages-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      onChange,
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
