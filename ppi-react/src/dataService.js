import { supabase } from "./supabaseClient";

const taskColumns =
  "id,title,description,subject,date,time,priority,reminder,completed,created_at,updated_at,task_attachments(id,storage_path,file_name,content_type)";

function ensureBackend() {
  if (!supabase) throw new Error("Supabase no está configurado.");
}

function mapTask(task) {
  return {
    id: task.id,
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
    .select("id,full_name,email,role,created_at,reminders_enabled,show_completed,browser_notifications_enabled,alarms_enabled")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data;
}

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
  const { data, error } = await supabase
    .from("task_shares")
    .select("id,task_id,recipient_id,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function revokeSharedTask(shareId) {
  ensureBackend();
  const { error } = await supabase.from("task_shares").delete().eq("id", shareId);
  if (error) throw error;
}

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

export async function findUserByEmail(email) {
  ensureBackend();
  const { data, error } = await supabase.rpc("find_profile_by_email", { requested_email: email.trim().toLowerCase() });
  if (error) throw error;
  return data?.[0] || null;
}

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

export async function listNotifications() {
  ensureBackend();
  const { data, error } = await supabase.from("notifications").select("id,task_id,type,title,body,read_at,created_at").order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  ensureBackend();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  ensureBackend();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) throw error;
}

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

export async function uploadTaskAttachment(taskId, file) {
  ensureBackend();
  const { data: { user } } = await supabase.auth.getUser();
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

export async function getAttachmentUrl(path) {
  ensureBackend();
  const { data, error } = await supabase.storage.from("task-attachments").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteTaskAttachment(attachment) {
  ensureBackend();
  const { error: storageError } = await supabase.storage.from("task-attachments").remove([attachment.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("task_attachments").delete().eq("id", attachment.id);
  if (error) throw error;
}

export function subscribeToNotifications(onChange) {
  if (!supabase) return () => {};
  const channel = supabase.channel("recordate-notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, onChange).subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToMessages(onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("recordate-messages")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      onChange,
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
