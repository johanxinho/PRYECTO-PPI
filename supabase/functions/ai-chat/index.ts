import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gemini-2.5-flash";
const MAX_HISTORY = 16;
const MAX_MESSAGE = 4000;
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const SYSTEM = `Eres el asistente de Recórdate, una app de la IE La Candelaria (Medellín) para organizar tareas, fechas y recordatorios académicos.
Responde en español, breve y claro. Ayuda a crear o priorizar tareas, explicar cómo usar la app y resolver dudas del estudiante.
No inventes notas, claves ni datos que el usuario no te dio. Si no sabes algo de la institución, dilo.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  });
}

function cors(req: Request) {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function consumeRateLimit(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("ai_request_usage")
    .select("user_id, window_started_at, request_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  const now = Date.now();
  if (!data) {
    const { error: insertError } = await admin.from("ai_request_usage").insert({
      user_id: userId,
      window_started_at: new Date(now).toISOString(),
      request_count: 1,
    });
    if (insertError) throw insertError;
    return;
  }

  const started = new Date(data.window_started_at).getTime();
  const expired = now - started > RATE_WINDOW_MS;
  const nextCount = expired ? 1 : data.request_count + 1;
  if (!expired && data.request_count >= RATE_LIMIT) {
    throw new Error("RATE_LIMIT");
  }

  const { error: updateError } = await admin
    .from("ai_request_usage")
    .update({
      request_count: nextCount,
      window_started_at: new Date(expired ? now : started).toISOString(),
    })
    .eq("user_id", userId);
  if (updateError) throw updateError;
}

async function callGemini(history: ChatMessage[], message: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("MISSING_GEMINI_KEY");

  const contents = [
    ...history.slice(-MAX_HISTORY).map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    const detail = payload?.error?.message ?? `Gemini ${response.status}`;
    throw new Error(detail);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("EMPTY_REPLY");
  return text;
}

Deno.serve(async (req: Request) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    let conversationId = typeof body.conversation_id === "string"
      ? body.conversation_id
      : null;
    if (!message || message.length > MAX_MESSAGE) {
      return json({ error: "invalid_message" }, 400);
    }

    await consumeRateLimit(admin, userId);

    if (!conversationId) {
      const { data: created, error: createError } = await userClient
        .from("ai_conversations")
        .insert({ user_id: userId, title: message.slice(0, 80) })
        .select("id")
        .single();
      if (createError || !created) throw createError ?? new Error("create_failed");
      conversationId = created.id;
    }

    const { data: prior, error: priorError } = await userClient
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (priorError) throw priorError;

    const history = (prior ?? []).filter(
      (row): row is ChatMessage => row.role === "user" || row.role === "assistant",
    );

    const reply = await callGemini(history, message);

    const { error: saveError } = await userClient.from("ai_messages").insert([
      { conversation_id: conversationId, user_id: userId, role: "user", content: message },
      { conversation_id: conversationId, user_id: userId, role: "assistant", content: reply },
    ]);
    if (saveError) throw saveError;

    await userClient
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ reply, conversation_id: conversationId, model: MODEL }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "rate_limit" }), {
        status: 429,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    if (message === "MISSING_GEMINI_KEY") {
      return new Response(JSON.stringify({ error: "missing_gemini_key" }), {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "ai_failed", detail: message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
