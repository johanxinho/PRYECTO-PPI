// @ts-nocheck
import { supabase } from "../supabaseClient";

// Cliente del asistente: invoke("ai-chat") + listado de hilos.
// images[].data es base64. image_urls del server son paths; se firman aquí.
const missingBackend = () => ({
  success: false,
  error: "Supabase no está configurado en este entorno.",
});

const REQUEST_TIMEOUT_MS = 45_000;

function withTimeout(promise, ms, code) {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(code)), ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

export function translateAiError(payload, fallback) {
  const code = payload?.error || payload?.message || "";
  if (code === "rate_limit") {
    return "Llegaste al límite de mensajes por ahora. Intenta en unos minutos.";
  }
  if (code === "missing_gemini_key") {
    return "La IA aún no está configurada en el servidor (falta la clave de Gemini).";
  }
  if (code === "gemini_failed") {
    return "No se pudo completar la respuesta de Gemini. Puede ser un problema temporal del proveedor o de su configuración.";
  }
  if (code === "gemini_timeout") {
    return "El asistente tardó demasiado en responder. Inténtalo de nuevo en unos segundos.";
  }
  if (code === "model_unavailable") {
    return "El modelo de IA no está disponible en este momento. Inténtalo de nuevo en un minuto.";
  }
  if (code === "empty_reply") {
    return "La IA no devolvió texto. Reformula la pregunta e inténtalo otra vez.";
  }
  if (code === "invalid_image") {
    return "Una de las fotos no se pudo leer. Vuelve a adjuntarla.";
  }
  if (code === "origin_not_allowed") {
    return "Este dominio no está autorizado para usar el asistente.";
  }
  if (code === "server_misconfigured") {
    return "El asistente no está bien configurado en el servidor. Avisa al administrador.";
  }
  if (code === "account_inactive") {
    return "Tu cuenta no está activa para usar el asistente. Contacta al administrador de RECORDATE.";
  }
  if (code === "conversation_not_found" || code === "invalid_conversation") {
    return "Esa conversación ya no está disponible. Inicia un chat nuevo.";
  }
  if (code === "invalid_request_body") {
    return "No se pudo leer el mensaje enviado. Vuelve a intentarlo.";
  }
  if (code === "message_save_failed") {
    return "La IA respondió, pero no se pudo guardar el mensaje. Intenta nuevamente.";
  }
  if (code === "task_creation_failed") {
    return "No se pudo crear la alarma en tu agenda. Verifica tu conexión e inténtalo de nuevo.";
  }
  if (code === "unauthorized") {
    return "Debes iniciar sesión para usar el asistente.";
  }
  if (code === "invalid_message") {
    return "Escribe un mensaje o adjunta una foto (máximo 4000 caracteres).";
  }
  if (code === "image_too_large") {
    return "Alguna foto pesa demasiado (máximo 6 MB por imagen).";
  }
  if (code === "payload_too_large") {
    return "El envío es demasiado grande (máximo 13 MB en total).";
  }
  if (typeof payload?.detail === "string" && payload.detail.trim()) {
    return `No pude responder: ${payload.detail}`;
  }
  return fallback;
}

async function signImagePaths(paths = []) {
  if (!supabase || !paths?.length) return [];
  const signed = await Promise.all(
    paths.filter(Boolean).map(async (path) => {
      if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
      const { data, error } = await supabase.storage
        .from("ai-chat")
        .createSignedUrl(path, 60 * 60);
      return !error && data?.signedUrl ? data.signedUrl : null;
    }),
  );
  return signed.filter(Boolean);
}

export const aiChatService = {
  async sendMessage(message, conversationId = null, images = []) {
    if (!supabase) return missingBackend();
    try {
      const body = {
        message: String(message || "").trim(),
        conversation_id: conversationId || undefined,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota",
      };
      if (images?.length) {
        body.images = images.slice(0, 2).map((item) => ({
          mime_type: item.mime_type,
          data: item.data,
        }));
      }

      const { data, error } = await withTimeout(
        supabase.functions.invoke("ai-chat", { body }),
        REQUEST_TIMEOUT_MS,
        "client_timeout",
      );

      if (error) {
        let parsed = null;
        try {
          parsed = typeof error.context?.json === "function" ? await error.context.json() : null;
        } catch {
          parsed = null;
        }
        return {
          success: false,
          error: translateAiError(
            parsed || data,
            error.message || "No fue posible contactar al asistente."
          ),
        };
      }

      if (data?.error) {
        return {
          success: false,
          error: translateAiError(data, "No fue posible obtener respuesta."),
        };
      }

      if (!data?.reply) {
        return { success: false, error: "El asistente no devolvió una respuesta." };
      }

      const imageUrls = await signImagePaths(data.image_urls || []);

      return {
        success: true,
        reply: data.reply,
        conversationId: data.conversation_id || conversationId || null,
        model: data.model || null,
        imageUrls,
        action: data.action?.task
          ? {
              ...data.action,
              task: {
                ...data.action.task,
                time: String(data.action.task.time || "").slice(0, 5),
              },
            }
          : data.action || null,
      };
    } catch (error) {
      if (error?.message === "client_timeout") {
        return {
          success: false,
          error: "El asistente tardó demasiado en responder. Revisa tu conexión e inténtalo de nuevo.",
        };
      }
      return {
        success: false,
        error: "No fue posible contactar al asistente. Revisa tu conexión e inténtalo de nuevo.",
      };
    }
  },

  async listConversations() {
    if (!supabase) return { success: true, conversations: [] };
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, title, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return { success: true, conversations: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error?.message || "No se pudo cargar el historial.",
        conversations: [],
      };
    }
  },

  async listMessages(conversationId) {
    if (!supabase || !conversationId) return { success: true, messages: [] };
    try {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at, image_urls")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const messages = [];
      for (const row of data || []) {
        const urls = await signImagePaths(Array.isArray(row.image_urls) ? row.image_urls : []);
        messages.push({
          id: row.id,
          role: row.role,
          content: row.content,
          created_at: row.created_at,
          imageUrls: urls,
        });
      }
      return { success: true, messages };
    } catch (error) {
      return {
        success: false,
        error: error?.message || "No se pudo cargar el historial.",
        messages: [],
      };
    }
  },
};
