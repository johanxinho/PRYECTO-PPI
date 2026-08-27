import { supabase } from "./supabaseClient";

const taskColumns =
  "id,title,description,subject,date,time,priority,reminder,completed,created_at,updated_at";

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
    .select("id,sender_id,body,created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendMessage(body) {
  ensureBackend();
  const { data, error } = await supabase
    .from("messages")
    .insert({ body: body.trim() })
    .select("id,sender_id,body,created_at")
    .single();
  if (error) throw error;
  return data;
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
