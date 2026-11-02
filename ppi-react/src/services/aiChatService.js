// @ts-nocheck
import { supabase } from "../supabaseClient";

// Cliente del asistente: invoke("ai-chat") + listado de hilos.
// images[].data es base64. image_urls del server son paths; se firman aquí.
const missingBackend = () => ({
  success: false,
  error: "Supabase no está configurado en este entorno.",
});

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
    return "Gemini tardó demasiado en responder. Inténtalo de nuevo en unos segundos.";
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
  const signed = [];
  for (const path of paths) {
    if (!path) continue;
    if (/^https?:\/\//i.test(path) || path.startsWith("data:")) {
      signed.push(path);
      continue;
    }
    const { data, error } = await supabase.storage.from("ai-chat").createSignedUrl(path, 60 * 60);
    if (!error && data?.signedUrl) signed.push(data.signedUrl);
  }
  return signed;
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

      const { data, error } = await supabase.functions.invoke("ai-chat", { body });

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
      return {
        success: false,
        error: error?.message || "No fue posible contactar al asistente.",
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
