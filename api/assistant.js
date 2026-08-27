import { createClient } from "@supabase/supabase-js";

const tools = [{ functionDeclarations: [
  { name: "get_user_tasks", description: "Consulta todas las tareas del estudiante autenticado.", parameters: { type: "OBJECT", properties: {} } },
  { name: "get_today_tasks", description: "Consulta las tareas pendientes de hoy.", parameters: { type: "OBJECT", properties: {} } },
  { name: "get_upcoming_tasks", description: "Consulta las próximas tareas pendientes.", parameters: { type: "OBJECT", properties: { days: { type: "NUMBER" } } } },
  { name: "search_tasks", description: "Busca tareas del estudiante por texto.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
  { name: "create_task", description: "Prepara una nueva tarea. Siempre requiere confirmación del estudiante.", parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, subject: { type: "STRING" }, date: { type: "STRING" }, time: { type: "STRING" }, priority: { type: "STRING", enum: ["Alta", "Media", "Baja"] }, description: { type: "STRING" } }, required: ["title", "subject", "date", "time"] } },
  { name: "update_task", description: "Prepara una modificación de tarea. Siempre requiere confirmación.", parameters: { type: "OBJECT", properties: { id: { type: "STRING" }, updates: { type: "OBJECT" } }, required: ["id", "updates"] } },
  { name: "complete_task", description: "Prepara completar una tarea. Requiere confirmación.", parameters: { type: "OBJECT", properties: { id: { type: "STRING" } }, required: ["id"] } },
  { name: "delete_task", description: "Prepara eliminar una tarea. Siempre requiere confirmación.", parameters: { type: "OBJECT", properties: { id: { type: "STRING" } }, required: ["id"] } },
] }];

const SUPABASE_TIMEOUT_MS = 15000;
const GEMINI_TIMEOUT_MS = 12000;
const GEMINI_REQUEST_TIMEOUT_MS = 60000;
const GEMINI_MAX_RETRIES = 2;
const GEMINI_RETRY_DELAYS_MS = [500, 1000];
const MAX_TOOL_TURNS = 4;

function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function fetchWithTimeout(input, init = {}, timeoutMs = SUPABASE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function serviceClient(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Backend Supabase no configurado");
  return createClient(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => fetchWithTimeout(input, init),
    },
  });
}

async function executeTool(supabase, userId, name, args) {
  const own = supabase.from("tasks").select("id,title,description,subject,date,time,priority,reminder,completed").eq("user_id", userId);
  if (name === "get_user_tasks") return (await own.order("date").order("time")).data || [];
  if (name === "get_today_tasks") return (await own.eq("date", new Date().toISOString().slice(0, 10)).eq("completed", false).order("time")).data || [];
  if (name === "get_upcoming_tasks") {
    const days = Math.min(Math.max(Number(args.days) || 7, 1), 31);
    const end = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    return (await own.gte("date", new Date().toISOString().slice(0, 10)).lte("date", end).eq("completed", false).order("date").order("time")).data || [];
  }
  if (name === "search_tasks") return (await own.or(`title.ilike.%${args.query}%,subject.ilike.%${args.query}%,description.ilike.%${args.query}%`).order("date")).data || [];
  if (["create_task", "update_task", "complete_task", "delete_task"].includes(name)) return { confirmation_required: true, action: { name, args } };
  return { error: "Herramienta no disponible" };
}

async function executeConfirmed(supabase, userId, action) {
  const { name, args = {} } = action || {};
  if (name === "create_task") {
    const { data, error } = await supabase.from("tasks").insert({ ...args, user_id: userId, priority: args.priority || "Media", reminder: args.reminder || "30 minutos antes" }).select().single();
    if (error) throw error;
    return data;
  }
  if (name === "update_task") {
    const { data, error } = await supabase.from("tasks").update(args.updates).eq("id", args.id).eq("user_id", userId).select().single();
    if (error) throw error;
    return data;
  }
  if (name === "complete_task") return executeConfirmed(supabase, userId, { name: "update_task", args: { id: args.id, updates: { completed: true } } });
  if (name === "delete_task") {
    const { error } = await supabase.from("tasks").delete().eq("id", args.id).eq("user_id", userId);
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
  const { error } = await supabase.from("ai_messages").insert({ conversation_id: id, user_id: userId, role, content });
  if (error) throw error;
  return id;
}

function isRetryableGeminiError(error) {
  return error?.name === "AbortError" || error?.name === "TypeError" || error?.status === 429 || error?.status >= 500;
}

class GeminiUnavailableError extends Error {
  constructor() {
    super("Gemini no está disponible temporalmente");
    this.name = "GeminiUnavailableError";
    this.status = 503;
  }
}

async function callGeminiModel(contents, systemInstruction, model, deadline) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new DOMException("Gemini request deadline exceeded", "AbortError");
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents, tools, generationConfig: { temperature: 0.2 } }),
      }, Math.min(GEMINI_TIMEOUT_MS, remaining));
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error("Gemini devolvió una respuesta no válida");
      }
      if (!response.ok) {
        const error = new Error(data?.error?.message || `Gemini respondió HTTP ${response.status}`);
        error.name = "GeminiError";
        error.status = response.status;
        throw error;
      }
      if (!data?.candidates?.[0]) throw new Error("Gemini no devolvió candidatos");
      return data;
    } catch (error) {
      if (!isRetryableGeminiError(error) || attempt === GEMINI_MAX_RETRIES) throw error;
      const delay = Math.min(GEMINI_RETRY_DELAYS_MS[attempt], deadline - Date.now());
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      console.log(`[assistant] Gemini retry ${attempt + 1}/${GEMINI_MAX_RETRIES}`);
    }
  }
  throw new GeminiUnavailableError();
}

async function callGemini(contents, systemInstruction, deadline) {
  const primaryModel = process.env.GEMINI_MODEL || "gemini-3.7-flash";
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-3-flash-preview";
  try {
    return await callGeminiModel(contents, systemInstruction, primaryModel, deadline);
  } catch (error) {
    if (!isRetryableGeminiError(error) || primaryModel === fallbackModel || Date.now() >= deadline) throw error;
    console.log("[assistant] switching to Gemini fallback model");
    return callGeminiModel(contents, systemInstruction, fallbackModel, deadline);
  }
}

export default async function handler(req) {
  console.log("[assistant] request received");
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Debes iniciar sesión para usar el asistente." });
  if (!process.env.GEMINI_API_KEY) return json(503, { error: "El asistente de IA aún no está configurado." });
  let stage = "initializing";
  try {
    stage = "creating Supabase client";
    const supabase = serviceClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json(401, { error: "Sesión inválida." });
    console.log("[assistant] auth verified");
    stage = "checking rate limit";
    const { data: allowed, error: limitError } = await supabase.rpc("consume_ai_request", { request_limit: 30 });
    if (limitError) return json(503, { error: "El asistente no está disponible temporalmente." });
    if (!allowed) return json(429, { error: "Has alcanzado temporalmente el límite de uso del asistente. Inténtalo nuevamente más tarde." });
    console.log("[assistant] rate limit checked");
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const conversationId = body.conversationId;
    if (body.action) {
      const result = await executeConfirmed(supabase, user.id, body.action);
      return json(200, { result, conversationId });
    }
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    let activeConversationId = await persistMessage(supabase, user.id, conversationId, "user", messages.at(-1)?.content || "");
    const systemInstruction = `Eres el asistente académico de RECORDATE. Responde en español, de forma clara y breve. Hoy es ${new Date().toISOString().slice(0, 10)}. Nunca inventes tareas: usa las herramientas. Las acciones de modificación requieren confirmación y debes explicar qué se cambiaría.`;
    let contents = messages.map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] }));
    const geminiDeadline = Date.now() + GEMINI_REQUEST_TIMEOUT_MS;
    stage = "calling Gemini";
    console.log("[assistant] calling Gemini");
    let result = await callGemini(contents, systemInstruction, geminiDeadline);
    console.log("[assistant] Gemini response received");
    let assistantContent = result.candidates?.[0]?.content;
    let pendingAction = null;
    let turns = 0;
    while (assistantContent?.parts?.some((part) => part.functionCall) && turns < MAX_TOOL_TURNS) {
      turns += 1;
      contents.push(assistantContent);
      const responses = [];
      for (const part of assistantContent.parts.filter((item) => item.functionCall)) {
        stage = "processing tool call";
        console.log("[assistant] processing tool call");
        const call = part.functionCall;
        const toolResult = await executeTool(supabase, user.id, call.name, call.args || {});
        if (toolResult?.confirmation_required) pendingAction = toolResult.action;
        responses.push({ functionResponse: { name: call.name, response: toolResult } });
      }
      contents.push({ role: "user", parts: responses });
      stage = "calling Gemini";
      console.log("[assistant] calling Gemini");
      result = await callGemini(contents, "Resume solo datos obtenidos de las herramientas y, si hay confirmation_required, presenta la acción y pide confirmación.", geminiDeadline);
      console.log("[assistant] Gemini response received");
      assistantContent = result.candidates?.[0]?.content;
    }
    if (assistantContent?.parts?.some((part) => part.functionCall)) throw new Error("Se alcanzó el límite de llamadas a herramientas");
    const answer = assistantContent?.parts?.filter((part) => part.text).map((part) => part.text).join("\n") || "No pude obtener una respuesta.";
    activeConversationId = await persistMessage(supabase, user.id, activeConversationId, "assistant", answer);
    console.log("[assistant] sending response");
    return json(200, { message: answer, pendingAction, conversationId: activeConversationId });
  } catch (error) {
    console.error(`[assistant] failed at ${stage}: ${error?.message || "unknown error"}`);
    if (error?.name === "GeminiUnavailableError" || error?.name === "GeminiError" && [429, 500, 502, 503, 504].includes(error.status)) {
      return json(503, { error: "No pude conectar con el asistente en este momento. Inténtalo nuevamente en unos segundos." });
    }
    if (error?.name === "AbortError") return json(504, { error: "El asistente tardó demasiado en responder." });
    return json(500, { error: "No fue posible procesar la solicitud del asistente." });
  }
}
