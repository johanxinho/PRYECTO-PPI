import { useState } from "react";

const suggestions = [
  "¿Qué tengo para hoy?",
  "¿Qué tarea debería hacer primero?",
  "¿Qué tengo mañana?",
  "Muéstrame mis tareas de alta prioridad.",
];

function Assistant({ session, onActionDone }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const send = async (text = input) => {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: next, conversationId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.message }]);
      setConversationId(data.conversationId || conversationId);
      setPendingAction(data.pendingAction || null);
    } catch (error) {
      setMessages([...next, { role: "assistant", content: error.message || "No fue posible conectar con el asistente." }]);
    } finally {
      setLoading(false);
    }
  };
  const confirmAction = async () => {
    if (!pendingAction) return;
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: pendingAction }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessages((current) => [...current, { role: "assistant", content: "Listo. Actualicé tu agenda correctamente." }]);
      setPendingAction(null);
      onActionDone();
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error.message || "No pude completar la acción." }]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <button className="assistant-launcher" onClick={() => setOpen((value) => !value)} aria-label="Abrir asistente académico" title="Asistente académico">✦</button>
      {open && <section className="assistant-panel" aria-label="Asistente académico">
        <header className="assistant-header">
          <div><span className="eyebrow accent-label">RECORDATE</span><h2>Asistente académico</h2></div>
          <button className="icon-button" onClick={() => { setMessages([]); setConversationId(null); setPendingAction(null); }} aria-label="Limpiar conversación" title="Limpiar conversación">⌫</button>
        </header>
        <div className="assistant-messages">
          {!messages.length && <div className="assistant-welcome"><strong>¿En qué te ayudo?</strong><p>Consulta tus tareas o organiza tu semana.</p><div className="assistant-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)}>{suggestion}</button>)}</div></div>}
          {messages.map((item, index) => <p className={`assistant-message ${item.role}`} key={`${item.role}-${index}`}>{item.content}</p>)}
          {loading && <p className="assistant-typing" aria-live="polite">Escribiendo...</p>}
        </div>
        {pendingAction && <div className="assistant-confirm"><strong>¿Confirmas esta acción?</strong><div><button className="primary-button" onClick={confirmAction}>Confirmar</button><button className="text-button" onClick={() => setPendingAction(null)}>Cancelar</button></div></div>}
        <form className="assistant-input" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pregunta sobre tu agenda..." aria-label="Mensaje para el asistente" /><button className="primary-button" disabled={loading}>Enviar</button></form>
      </section>}
    </>
  );
}

export default Assistant;
