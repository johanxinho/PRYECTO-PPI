import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gemini-2.5-flash";
const MAX_HISTORY = 16;
const MAX_MESSAGE = 4000;
const RATE_LIMIT = 30;

const SYSTEM = `Eres el asistente de Recórdate, una app de la IE La Candelaria (Medellín) para organizar tareas, fechas y recordatorios académicos.
Responde en español, breve y claro. Ayuda a crear o priorizar tareas, explicar cómo usar la app y resolver dudas del estudiante.
No inventes notas, claves ni datos que el usuario no te dio. Si no sabes algo de la institución, dilo.`;

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatImage = { mime_type: string; data: string };
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DEFAULT_ORIGINS = new Set([
  "https://johanxinho.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function allowedOrigins() {
  return new Set([
    ...DEFAULT_ORIGINS,
    ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
  ]);
}

function isAllowedOrigin(req: Request) {
  const origin = req.headers.get("Origin");
  return !origin || allowedOrigins().has(origin);
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

function cors(req: Request) {
  const origin = req.headers.get("Origin");
  return {
    ...(origin && allowedOrigins().has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function consumeRateLimit(
  client: ReturnType<typeof createClient>,
  userId: string,
) {
  void userId;
  const { data, error } = await client.rpc("consume_ai_request", { request_limit: RATE_LIMIT });
  if (error) throw error;
  if (data !== true) throw new Error("RATE_LIMIT");
}

async function callGemini(history: ChatMessage[], message: string, images: ChatImage[]) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("MISSING_GEMINI_KEY");

  const contents = [
    ...history.slice(-MAX_HISTORY).map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })),
    {
      role: "user",
      parts: [
        ...(message ? [{ text: message }] : []),
        ...images.map((image) => ({ inlineData: { mimeType: image.mime_type, data: image.data } })),
      ],
    },
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
  if (!isAllowedOrigin(req)) return json({ error: "origin_not_allowed" }, 403, headers);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return json({ error: "server_misconfigured" }, 500, headers);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401, headers);
    const userId = userData.user.id;

    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > 12 * 1024 * 1024) return json({ error: "payload_too_large" }, 413, headers);
    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    const images: ChatImage[] = Array.isArray(body.images)
      ? body.images.slice(0, 2).filter((image: ChatImage) => ALLOWED_IMAGE_TYPES.has(image?.mime_type) && typeof image?.data === "string" && image.data.length > 0)
      : [];
    if (images.some((image) => image.data.length > 6 * 1024 * 1024)) {
      return json({ error: "image_too_large" }, 413, headers);
    }
    let conversationId = typeof body.conversation_id === "string"
      ? body.conversation_id
      : null;
    if ((!message && !images.length) || message.length > MAX_MESSAGE) {
      return json({ error: "invalid_message" }, 400, headers);
    }

    await consumeRateLimit(userClient, userId);

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

    const reply = await callGemini(history, message, images);

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
    return new Response(JSON.stringify({ error: "ai_failed" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
