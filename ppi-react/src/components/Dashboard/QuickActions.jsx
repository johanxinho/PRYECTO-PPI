// @ts-nocheck
import { Plus, Focus, MessageCircle } from "lucide-react";

export default function QuickActions({ onNewTask, onFocus, onMessages }) {
  return (
    <section className="quick-actions">
      <div className="quick-actions-grid">
        <button className="quick-action" onClick={onNewTask}>
          <Plus size={18} />
          <span>Nueva actividad</span>
        </button>
        <button className="quick-action" onClick={onFocus}>
          <Focus size={18} />
          <span>Modo enfoque</span>
        </button>
        <button className="quick-action" onClick={onMessages}>
          <MessageCircle size={18} />
          <span>Mensajes</span>
        </button>
      </div>
    </section>
  );
}
