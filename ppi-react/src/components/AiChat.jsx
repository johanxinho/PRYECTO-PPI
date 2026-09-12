// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, LoaderCircle } from "lucide-react";
import { aiChatService } from "../services/aiChatService";

/**
 * Chat flotante del asistente de Recórdate (Gemini vía Edge Function ai-chat).
 * Solo se muestra con sesión real (no demo).
 */
export default function AiChat({ enabled = true }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola, soy el asistente de Recórdate. Puedo ayudarte a organizar tareas, prioridades y a usar la agenda. ¿En qué te ayudo?",
    },
  ]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, messages, busy]);

  if (!enabled) return null;

  const send = async (event) => {
    event?.preventDefault?.();
    const text = input.trim();
    if (!text || busy) return;

    setError("");
    setInput("");
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", content: text },
    ]);
    setBusy(true);

    const result = await aiChatService.sendMessage(text, conversationId);
    setBusy(false);

    if (!result.success) {
      setError(result.error || "No pude responder.");
      return;
    }

    if (result.conversationId) setConversationId(result.conversationId);
    setMessages((current) => [
      ...current,
      { id: `a-${Date.now()}`, role: "assistant", content: result.reply },
    ]);
  };

  const startNew = () => {
    setConversationId(null);
    setError("");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Nueva conversación lista. Cuéntame qué necesitas organizar hoy.",
      },
    ]);
  };

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
              <button type="button" className="text-button" onClick={startNew}>
                Nueva
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

          <div className="ai-chat-messages" ref={listRef}>
            {messages.map((item) => (
              <article
                key={item.id}
                className={item.role === "user" ? "ai-bubble ai-bubble-user" : "ai-bubble ai-bubble-bot"}
              >
                <p>{item.content}</p>
              </article>
            ))}
            {busy && (
              <article className="ai-bubble ai-bubble-bot ai-bubble-loading" aria-live="polite">
                <LoaderCircle size={16} className="ai-spin" /> Pensando…
              </article>
            )}
          </div>

          {error && (
            <p className="ai-chat-error" role="alert">
              {error}
            </p>
          )}

          <form className="ai-chat-form" onSubmit={send}>
            <label className="sr-only" htmlFor="ai-chat-input">
              Mensaje para el asistente
            </label>
            <input
              id="ai-chat-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe tu duda o pide ayuda…"
              maxLength={4000}
              disabled={busy}
              autoComplete="off"
            />
            <button
              type="submit"
              className="primary-button ai-send"
              disabled={busy || !input.trim()}
              aria-label="Enviar mensaje"
            >
              <Send size={16} />
            </button>
          </form>
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
