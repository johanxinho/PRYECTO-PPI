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

function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function serviceClient(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Backend Supabase no configurado");
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } });
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

async function callGemini(contents, systemInstruction) {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents, tools, generationConfig: { temperature: 0.2 } }),
  });
  if (!response.ok) throw new Error("Gemini request failed");
  return response.json();
}

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Debes iniciar sesión para usar el asistente." });
  if (!process.env.GEMINI_API_KEY) return json(503, { error: "El asistente de IA aún no está configurado." });
  try {
    const supabase = serviceClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json(401, { error: "Sesión inválida." });
    const { data: allowed, error: limitError } = await supabase.rpc("consume_ai_request", { request_limit: 30 });
    if (limitError) return json(503, { error: "El asistente no está disponible temporalmente." });
    if (!allowed) return json(429, { error: "Has alcanzado temporalmente el límite de uso del asistente. Inténtalo nuevamente más tarde." });
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
    let result = await callGemini(contents, systemInstruction);
    let assistantContent = result.candidates?.[0]?.content;
    let pendingAction = null;
    let turns = 0;
    while (assistantContent?.parts?.some((part) => part.functionCall) && turns < 4) {
      turns += 1;
      contents.push(assistantContent);
      const responses = [];
      for (const part of assistantContent.parts.filter((item) => item.functionCall)) {
        const call = part.functionCall;
        const toolResult = await executeTool(supabase, user.id, call.name, call.args || {});
        if (toolResult?.confirmation_required) pendingAction = toolResult.action;
        responses.push({ functionResponse: { name: call.name, response: toolResult } });
      }
      contents.push({ role: "user", parts: responses });
      result = await callGemini(contents, "Resume solo datos obtenidos de las herramientas y, si hay confirmation_required, presenta la acción y pide confirmación.");
      assistantContent = result.candidates?.[0]?.content;
    }
    const answer = assistantContent?.parts?.filter((part) => part.text).map((part) => part.text).join("\n") || "No pude obtener una respuesta.";
    activeConversationId = await persistMessage(supabase, user.id, activeConversationId, "assistant", answer);
    return json(200, { message: answer, pendingAction, conversationId: activeConversationId });
  } catch {
    return json(500, { error: "No fue posible procesar la solicitud del asistente." });
  }
}
