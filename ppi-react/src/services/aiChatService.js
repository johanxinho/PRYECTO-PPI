import { localizeService } from "./localize.js";
// @ts-nocheck
import { supabase } from "../supabaseClient";

// Cliente del asistente: invoke("ai-chat") + listado de hilos.
// images[].data es base64. image_urls del server son paths; se firman aquí.
const missingBackend = () => ({
  success: false,
  error: localizeService("services.backend.unavailable"),
});

export function translateAiError(payload, fallback) {
  const code = payload?.error || payload?.message || "";
  if (code === "rate_limit") {
    return localizeService("services.ai.rateLimit");
  }
  if (code === "missing_gemini_key") {
    return localizeService("services.ai.notConfigured");
  }
  if (code === "gemini_failed") {
    return localizeService("services.ai.providerFailed");
  }
  if (code === "gemini_timeout") {
    return localizeService("services.ai.timeout");
  }
  if (code === "account_inactive") {
    return localizeService("services.ai.inactive");
  }
  if (code === "conversation_not_found" || code === "invalid_conversation") {
    return localizeService("services.ai.conversationUnavailable");
  }
  if (code === "invalid_request_body") {
    return localizeService("services.ai.messageUnreadable");
  }
  if (code === "message_save_failed") {
    return localizeService("services.ai.saveFailed");
  }
  if (code === "task_creation_failed") {
    return localizeService("services.ai.alarmFailed");
  }
  if (code === "unauthorized") {
    return localizeService("services.ai.loginRequired");
  }
  if (code === "invalid_message") {
    return localizeService("services.ai.messageOrPhoto");
  }
  if (code === "image_too_large") {
    return localizeService("services.ai.photoTooLarge");
  }
  if (code === "payload_too_large") {
    return localizeService("services.ai.totalTooLarge");
  }
  if (typeof payload?.detail === "string" && payload.detail.trim()) {
    console.error("AI service error detail", payload.detail);
    return localizeService("services.ai.responseFailed");
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
        console.error("AI Edge Function request failed", { message: error.message, status: error.status });
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
            localizeService("services.ai.contactFailed")
          ),
        };
      }

      if (data?.error) {
        return {
          success: false,
          error: translateAiError(data, localizeService("services.ai.responseFailed")),
        };
      }

      if (!data?.reply) {
        return { success: false, error: localizeService("services.ai.emptyResponse") };
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
      console.error("AI chat request failed", error);
      return {
        success: false,
        error: localizeService("services.ai.contactFailed"),
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
      console.error("AI conversation list failed", error);
      return {
        success: false,
        error: localizeService("services.ai.historyFailed"),
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
      console.error("AI conversation history failed", error);
      return {
        success: false,
        error: localizeService("services.ai.historyFailed"),
        messages: [],
      };
    }
  },
};
