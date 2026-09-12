// @ts-nocheck
import { supabase } from "../supabaseClient";

const missingBackend = () => ({
  success: false,
  error: "Supabase no está configurado en este entorno.",
});

function translateAiError(payload, fallback) {
  const code = payload?.error || payload?.message || "";
  if (code === "rate_limit") {
    return "Llegaste al límite de mensajes por ahora. Intenta en unos minutos.";
  }
  if (code === "missing_gemini_key") {
    return "La IA aún no está configurada en el servidor (falta la clave de Gemini).";
  }
  if (code === "unauthorized") {
    return "Debes iniciar sesión para usar el asistente.";
  }
  if (code === "invalid_message") {
    return "Escribe un mensaje válido (máximo 4000 caracteres).";
  }
  if (typeof payload?.detail === "string" && payload.detail.trim()) {
    return `No pude responder: ${payload.detail}`;
  }
  return fallback;
}

export const aiChatService = {
  async sendMessage(message, conversationId = null) {
    if (!supabase) return missingBackend();
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: String(message || "").trim(),
          conversation_id: conversationId || undefined,
        },
      });

      if (error) {
        let parsed = null;
        try {
          parsed = typeof error.context?.json === "function"
            ? await error.context.json()
            : null;
        } catch {
          parsed = null;
        }
        return {
          success: false,
          error: translateAiError(parsed || data, error.message || "No fue posible contactar al asistente."),
        };
      }

      if (data?.error) {
        return { success: false, error: translateAiError(data, "No fue posible obtener respuesta.") };
      }

      if (!data?.reply) {
        return { success: false, error: "El asistente no devolvió una respuesta." };
      }

      return {
        success: true,
        reply: data.reply,
        conversationId: data.conversation_id || conversationId || null,
        model: data.model || null,
      };
    } catch (error) {
      return {
        success: false,
        error: error?.message || "No fue posible contactar al asistente.",
      };
    }
  },

  async listMessages(conversationId) {
    if (!supabase || !conversationId) return { success: true, messages: [] };
    try {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return { success: true, messages: data || [] };
    } catch (error) {
      return { success: false, error: error?.message || "No se pudo cargar el historial.", messages: [] };
    }
  },
};
