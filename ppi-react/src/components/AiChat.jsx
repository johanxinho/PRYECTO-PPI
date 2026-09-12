// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, LoaderCircle, Paperclip, History, Plus } from "lucide-react";
import { aiChatService } from "../services/aiChatService";

// Chat flotante de Recórdate IA. Solo cuenta real (no demo).
// Texto + hasta 2 fotos → Edge Function ai-chat (Gemini 3.6 Flash).
// Historial: ai_conversations / ai_messages; fotos en bucket privado ai-chat.
const WELCOME = {
  id: "welcome",
  role: "assistant",
  content:
    "Hola, soy el asistente de Recórdate. Puedo ayudarte a organizar tareas y leer fotos de horarios o apuntes. ¿En qué te ayudo?",
  imageUrls: [],
};

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED.has(file.type)) {
      reject(new Error("Solo JPG, PNG, WEBP o GIF."));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Cada foto debe pesar menos de 4 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const data = result.replace(/^data:[^;]+;base64,/, "");
      resolve({
        mime_type: file.type,
        data,
        preview: result,
        name: file.name,
      });
    };
    reader.onerror = () => reject(new Error("No se pudo leer la foto."));
    reader.readAsDataURL(file);
  });
}

/**
 * Chat flotante del asistente de Recórdate (Gemini vía Edge Function ai-chat).
 * Soporta fotos (máx 2) e historial de conversaciones.
 */
export default function AiChat({ enabled = true }) {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [messages, setMessages] = useState([WELCOME]);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        if (showHistory) setShowHistory(false);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, showHistory]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, messages, busy]);

  useEffect(() => {
    if (!open || !showHistory) return undefined;
    let alive = true;
    (async () => {
      const result = await aiChatService.listConversations();
      if (!alive) return;
      if (!result.success) setError(result.error || "No se pudo cargar el historial.");
      setConversations(result.conversations || []);
    })();
    return () => {
      alive = false;
    };
  }, [open, showHistory]);

  if (!enabled) return null;

  const startNew = () => {
    setConversationId(null);
    setError("");
    setPendingImages([]);
    setShowHistory(false);
    setMessages([
      {
        ...WELCOME,
        id: `welcome-${Date.now()}`,
        content: "Nueva conversación lista. Escribe o adjunta una foto.",
      },
    ]);
  };

  const openConversation = async (id) => {
    setBusy(true);
    setError("");
    setShowHistory(false);
    const result = await aiChatService.listMessages(id);
    setBusy(false);
    if (!result.success) {
      setError(result.error || "No se pudo abrir el chat.");
      return;
    }
    setConversationId(id);
    setPendingImages([]);
    setMessages(
      (result.messages || []).map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        imageUrls: item.imageUrls || [],
      })),
    );
  };

  const onPickFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    try {
      const next = [...pendingImages];
      for (const file of files) {
        if (next.length >= 2) break;
        next.push(await readFileAsImage(file));
      }
      setPendingImages(next.slice(0, 2));
    } catch (err) {
      setError(err?.message || "No se pudo adjuntar la foto.");
    }
  };

  const removePending = (index) => {
    setPendingImages((current) => current.filter((_, i) => i !== index));
  };

  const send = async (event) => {
    event?.preventDefault?.();
    const text = input.trim();
    if ((!text && pendingImages.length === 0) || busy) return;

    const imagesForApi = pendingImages.map(({ mime_type, data }) => ({ mime_type, data }));
    const previewUrls = pendingImages.map((item) => item.preview);

    setError("");
    setInput("");
    setPendingImages([]);
    setMessages((current) => [
      ...current,
      {
        id: `u-${Date.now()}`,
        role: "user",
        content: text || "[imagen]",
        imageUrls: previewUrls,
      },
    ]);
    setBusy(true);

    const result = await aiChatService.sendMessage(text, conversationId, imagesForApi);
    setBusy(false);

    if (!result.success) {
      setError(result.error || "No pude responder.");
      return;
    }

    if (result.conversationId) setConversationId(result.conversationId);
    setMessages((current) => [
      ...current,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.reply,
        imageUrls: [],
      },
    ]);
  };

  const canSend = !busy && (input.trim() || pendingImages.length > 0);

  return (
    <div className="ai-chat-root">
      {open && (
        <div className="ai-chat-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      {open && (
        <section
          className="ai-chat-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-chat-title"
        >
          <header className="ai-chat-header">
            <div>
              <span className="eyebrow accent-label">Asistente</span>
              <h2 id="ai-chat-title">
                <Bot size={18} aria-hidden="true" /> Recórdate IA
              </h2>
            </div>
            <div className="ai-chat-header-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowHistory((v) => !v)}
                aria-label="Ver historial de chats"
                title="Historial"
              >
                <History size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={startNew}
                aria-label="Nueva conversación"
                title="Nueva"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar asistente"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {showHistory ? (
            <div className="ai-chat-history">
              <p className="ai-chat-history-title">Chats guardados</p>
              {!conversations.length && (
                <p className="ai-chat-history-empty">Aún no tienes conversaciones guardadas.</p>
              )}
              {conversations.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`ai-history-item ${item.id === conversationId ? "is-active" : ""}`}
                  onClick={() => openConversation(item.id)}
                >
                  <strong>{item.title || "Sin título"}</strong>
                  <small>
                    {item.updated_at
                      ? new Date(item.updated_at).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="ai-chat-messages" ref={listRef}>
                {messages.map((item) => (
                  <article
                    key={item.id}
                    className={
                      item.role === "user" ? "ai-bubble ai-bubble-user" : "ai-bubble ai-bubble-bot"
                    }
                  >
                    {!!item.imageUrls?.length && (
                      <div className="ai-bubble-images">
                        {item.imageUrls.map((url, index) => (
                          <img key={`${item.id}-img-${index}`} src={url} alt="Adjunto del chat" />
                        ))}
                      </div>
                    )}
                    {item.content && item.content !== "[imagen]" && <p>{item.content}</p>}
                  </article>
                ))}
                {busy && (
                  <article className="ai-bubble ai-bubble-bot ai-bubble-loading" aria-live="polite">
                    <LoaderCircle size={16} className="ai-spin" /> Pensando…
                  </article>
                )}
              </div>

              {!!pendingImages.length && (
                <div className="ai-pending-images">
                  {pendingImages.map((item, index) => (
                    <div className="ai-pending-thumb" key={`${item.name}-${index}`}>
                      <img src={item.preview} alt={item.name || "Foto pendiente"} />
                      <button
                        type="button"
                        aria-label="Quitar foto"
                        onClick={() => removePending(index)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="ai-chat-error" role="alert">
                  {error}
                </p>
              )}

              <form className="ai-chat-form" onSubmit={send}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  hidden
                  onChange={onPickFiles}
                />
                <button
                  type="button"
                  className="icon-button ai-attach"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Adjuntar foto"
                  disabled={busy || pendingImages.length >= 2}
                  title="Adjuntar foto (máx. 2)"
                >
                  <Paperclip size={16} />
                </button>
                <label className="sr-only" htmlFor="ai-chat-input">
                  Mensaje para el asistente
                </label>
                <input
                  id="ai-chat-input"
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Escribe o adjunta una foto…"
                  maxLength={4000}
                  disabled={busy}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="primary-button ai-send"
                  disabled={!canSend}
                  aria-label="Enviar mensaje"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        className={`ai-chat-fab ${open ? "is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente de Recórdate"}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>
    </div>
  );
}
