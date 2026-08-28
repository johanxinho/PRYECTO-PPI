import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_TIMEOUT_MS = 15000;
const GROK_TIMEOUT_MS = 30000;
const GROK_REQUEST_TIMEOUT_MS = 80000;
const GROK_MAX_RETRIES = 2;
const GROK_RETRY_DELAYS_MS = [900, 1800];
const MAX_TOOL_TURNS = 4;
const MAX_MESSAGE_LENGTH = 2000;
const CONFIRMATION_TOKEN_TTL_MS = 10 * 60 * 1000;
const taskFields = ["title", "subject", "date", "time", "priority", "description", "reminder", "completed"];
const priorities = new Set(["Alta", "Media", "Baja"]);

const tool = (name, description, properties = {}, required = []) => ({ type: "function", function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } } });
const tools = [
  tool("get_user_tasks", "Consulta todas las tareas del estudiante autenticado."),
  tool("get_today_tasks", "Consulta las tareas pendientes de hoy."),
  tool("get_upcoming_tasks", "Consulta las próximas tareas pendientes.", { days: { type: "number", minimum: 1, maximum: 31 } }, ["days"]),
  tool("search_tasks", "Busca tareas del estudiante por texto.", { query: { type: "string", maxLength: 120 } }, ["query"]),
  tool("create_task", "Prepara una nueva tarea. Siempre requiere confirmación del estudiante.", { title: { type: "string" }, subject: { type: "string" }, date: { type: "string" }, time: { type: "string" }, priority: { type: "string", enum: ["Alta", "Media", "Baja"] }, description: { type: "string" }, reminder: { type: "string" } }, ["title", "subject", "date", "time"]),
  tool("update_task", "Prepara una modificación de tarea. Siempre requiere confirmación.", { id: { type: "string" }, updates: { type: "object" } }, ["id", "updates"]),
  tool("complete_task", "Prepara completar una tarea. Requiere confirmación.", { id: { type: "string" } }, ["id"]),
  tool("delete_task", "Prepara eliminar una tarea. Siempre requiere confirmación.", { id: { type: "string" } }, ["id"]),
];

function json(status, body) { return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
function fetchWithTimeout(input, init = {}, timeoutMs = SUPABASE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}
function serviceClient(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Backend Supabase no configurado");
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetchWithTimeout(input, init) } });
}
function cleanSearchQuery(value) { return String(value || "").slice(0, 120).replace(/[,%()]/g, " ").trim(); }
function cleanTaskValues(values, creating = false) {
  const source = values && typeof values === "object" ? values : {};
  const result = {};
  for (const field of taskFields) {
    if (!(field in source)) continue;
    if (field === "completed") {
      if (typeof source.completed !== "boolean") throw new Error("El estado de la tarea no es válido.");
      result.completed = source.completed;
    } else if (field === "priority") {
      if (!priorities.has(source.priority)) throw new Error("La prioridad no es válida.");
      result.priority = source.priority;
    } else result[field] = String(source[field] ?? "").trim().slice(0, field === "description" ? 2000 : 160);
  }
  if (creating) {
    for (const required of ["title", "subject", "date", "time"]) if (!result[required]) throw new Error("Faltan datos obligatorios para crear la tarea.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || !/^\d{2}:\d{2}/.test(result.time)) throw new Error("La fecha o la hora no tienen un formato válido.");
  }
  if (!creating && !Object.keys(result).length) throw new Error("No hay cambios válidos para guardar.");
  return result;
}
async function executeTool(supabase, userId, name, args = {}) {
  const own = supabase.from("tasks").select("id,title,description,subject,date,time,priority,reminder,completed").eq("user_id", userId);
  if (name === "get_user_tasks") return (await own.order("date").order("time")).data || [];
  if (name === "get_today_tasks") return (await own.eq("date", new Date().toISOString().slice(0, 10)).eq("completed", false).order("time")).data || [];
  if (name === "get_upcoming_tasks") {
    const days = Math.min(Math.max(Number(args.days) || 7, 1), 31);
    const end = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    return (await own.gte("date", new Date().toISOString().slice(0, 10)).lte("date", end).eq("completed", false).order("date").order("time")).data || [];
  }
  if (name === "search_tasks") {
    const query = cleanSearchQuery(args.query);
    if (!query) return [];
    return (await own.or(`title.ilike.%${query}%,subject.ilike.%${query}%,description.ilike.%${query}%`).order("date")).data || [];
  }
  if (["create_task", "update_task", "complete_task", "delete_task"].includes(name)) return { confirmation_required: true, action: { name, args } };
  return { error: "Herramienta no disponible" };
}
async function executeConfirmed(supabase, userId, action) {
  const { name, args = {} } = action || {};
  if (name === "create_task") {
    const task = cleanTaskValues(args, true);
    const { data, error } = await supabase.from("tasks").insert({ ...task, user_id: userId, priority: task.priority || "Media", reminder: task.reminder || "30 minutos antes" }).select().single();
    if (error) throw error;
    return data;
  }
  if (name === "update_task") {
    const updates = cleanTaskValues(args.updates);
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", String(args.id || "")).eq("user_id", userId).select().single();
    if (error) throw error;
    return data;
  }
  if (name === "complete_task") return executeConfirmed(supabase, userId, { name: "update_task", args: { id: args.id, updates: { completed: true } } });
  if (name === "delete_task") {
    const { error } = await supabase.from("tasks").delete().eq("id", String(args.id || "")).eq("user_id", userId);
    if (error) throw error;
    return { deleted: true, id: args.id };
  }
  throw new Error("Acción no permitida");
}
async function persistMessage(supabase, userId, conversationId, role, content) {
  let id = conversationId;
  if (!id) {
    const { data, error } = await supabase.from("ai_conversations").insert({ user_id: userId, title: "Asistente académico" }).select("id").single();
    if (error) throw error;
    id = data.id;
  }
  const { error } = await supabase.from("ai_messages").insert({ conversation_id: id, user_id: userId, role, content: String(content || "").slice(0, 12000) });
  if (error) throw error;
  return id;
}
function isRetryableGrokError(error) { return error?.name === "AbortError" || error?.name === "TypeError" || error?.status === 429 || error?.status >= 500; }
async function callGrok(messages, deadline) {
  const model = process.env.XAI_MODEL || "grok-4.5-latest";
  for (let attempt = 0; attempt <= GROK_MAX_RETRIES; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new DOMException("Grok request deadline exceeded", "AbortError");
    try {
      const response = await fetchWithTimeout("https://api.x.ai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.XAI_API_KEY}` }, body: JSON.stringify({ model, messages, tools, tool_choice: "auto", temperature: 0.2 }) }, Math.min(GROK_TIMEOUT_MS, remaining));
      const responseText = await response.text();
      let data;
      try { data = responseText ? JSON.parse(responseText) : null; } catch { throw new Error("Grok devolvió una respuesta no válida"); }
      if (!response.ok) {
        const error = new Error(data?.error?.message || `Grok respondió HTTP ${response.status}`);
        error.name = "GrokError";
        error.status = response.status;
        throw error;
      }
      if (!data?.choices?.[0]?.message) throw new Error("Grok no devolvió una respuesta");
      return data.choices[0].message;
    } catch (error) {
      if (!isRetryableGrokError(error) || attempt === GROK_MAX_RETRIES) throw error;
      const delay = Math.min(GROK_RETRY_DELAYS_MS[attempt], deadline - Date.now());
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      console.log(`[assistant] Grok retry ${attempt + 1}/${GROK_MAX_RETRIES}`);
    }
  }
  throw new Error("Grok no está disponible temporalmente");
}
function parseToolArguments(call) { try { return call.function?.arguments ? JSON.parse(call.function.arguments) : {}; } catch { return {}; } }
function confirmationError(message, status = 400) { const error = new Error(message); error.name = "ConfirmationError"; error.status = status; return error; }
function confirmationSecret() {
  const secret = process.env.ASSISTANT_ACTION_SECRET;
  if (!secret) throw confirmationError("El asistente no puede confirmar acciones hasta configurar ASSISTANT_ACTION_SECRET en Vercel.", 503);
  return secret;
}
function signConfirmation(payload) { return createHmac("sha256", confirmationSecret()).update(payload).digest("base64url"); }
function createConfirmationToken(userId, action) {
  const payload = Buffer.from(JSON.stringify({ userId, action, expiresAt: Date.now() + CONFIRMATION_TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${signConfirmation(payload)}`;
}
function readConfirmationToken(token, userId) {
  const [payload, signature, ...extra] = String(token || "").split(".");
  if (!payload || !signature || extra.length) throw confirmationError("La confirmación no es válida. Vuelve a solicitar la acción.");
  const expected = signConfirmation(payload);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) throw confirmationError("La confirmación no es válida. Vuelve a solicitar la acción.");
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw confirmationError("La confirmación no es válida. Vuelve a solicitar la acción."); }
  if (data.userId !== userId || !Number.isFinite(data.expiresAt) || data.expiresAt < Date.now()) throw confirmationError("La confirmación expiró. Vuelve a solicitar la acción.");
  if (!["create_task", "update_task", "complete_task", "delete_task"].includes(data.action?.name) || !data.action?.args || typeof data.action.args !== "object") throw confirmationError("La confirmación no es válida. Vuelve a solicitar la acción.");
  return data.action;
}

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Debes iniciar sesión para usar el asistente." });
  if (!process.env.XAI_API_KEY) return json(503, { error: "El asistente aún no está configurado. Falta XAI_API_KEY en Vercel." });
  let stage = "initializing";
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    stage = "creating Supabase client";
    const supabase = serviceClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json(401, { error: "Sesión inválida." });
    if (body.action) return json(400, { error: "Las acciones deben confirmarse desde el asistente." });
    if (body.confirmationToken) return json(200, { result: await executeConfirmed(supabase, user.id, readConfirmationToken(body.confirmationToken, user.id)), conversationId: body.conversationId || null });
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20).map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: String(message.content || "").slice(0, MAX_MESSAGE_LENGTH) })).filter((message) => message.content) : [];
    if (!messages.length) return json(400, { error: "Escribe un mensaje para el asistente." });
    stage = "checking rate limit";
    const { data: allowed, error: limitError } = await supabase.rpc("consume_ai_request", { request_limit: 60 });
    if (limitError) return json(503, { error: "No pude comprobar el límite de uso del asistente." });
    if (!allowed) return json(429, { error: "Has alcanzado el límite de 60 consultas por hora. Inténtalo nuevamente más tarde." });
    let activeConversationId = await persistMessage(supabase, user.id, body.conversationId, "user", messages.at(-1).content);
    const grokMessages = [{ role: "system", content: `Eres el asistente académico de RECORDATE. Responde en español, de forma clara y breve. Hoy es ${new Date().toISOString().slice(0, 10)}. Nunca inventes tareas: usa las herramientas para consultar información. Las acciones de crear, editar, completar o eliminar requieren confirmación y debes explicar claramente qué se cambiaría.` }, ...messages];
    const deadline = Date.now() + GROK_REQUEST_TIMEOUT_MS;
    let pendingAction = null;
    let response;
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn += 1) {
      stage = "calling Grok";
      response = await callGrok(grokMessages, deadline);
      if (!response.tool_calls?.length) break;
      grokMessages.push({ role: "assistant", content: response.content || "", tool_calls: response.tool_calls });
      for (const call of response.tool_calls) {
        const result = await executeTool(supabase, user.id, call.function?.name, parseToolArguments(call));
        if (result?.confirmation_required) pendingAction = { confirmationToken: createConfirmationToken(user.id, result.action) };
        grokMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }
    if (!response || response.tool_calls?.length) throw new Error("Se alcanzó el límite de consultas de herramientas.");
    const answer = String(response.content || "No pude obtener una respuesta.").trim();
    activeConversationId = await persistMessage(supabase, user.id, activeConversationId, "assistant", answer);
    return json(200, { message: answer, pendingAction, conversationId: activeConversationId });
  } catch (error) {
    console.error(`[assistant] failed at ${stage}: ${error?.message || "unknown error"}`);
    if (error?.name === "ConfirmationError") return json(error.status || 400, { error: error.message });
    if (error?.name === "GrokError" && error.status === 401) return json(503, { error: "La clave de Grok configurada en Vercel no es válida." });
    if (error?.name === "GrokError" && error.status === 429) return json(429, { error: "Grok alcanzó su límite temporal. Inténtalo en unos segundos." });
    if (error?.name === "GrokError" && [500, 502, 503, 504].includes(error.status)) return json(503, { error: "Grok no está disponible en este momento. Inténtalo de nuevo en unos segundos." });
    if (error?.name === "AbortError") return json(504, { error: "El asistente tardó demasiado en responder. Inténtalo de nuevo." });
    return json(500, { error: "No fue posible procesar la solicitud del asistente." });
  }
}
