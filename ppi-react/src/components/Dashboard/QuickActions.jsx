// @ts-nocheck
import { Plus, Focus, MessageCircle } from "lucide-react";
import { useI18n } from "../../i18n";

export default function QuickActions({ onNewTask, onFocus, onMessages }) {
  const { t } = useI18n();
  return (
    <section className="quick-actions">
      <div className="quick-actions-grid">
        <button className="quick-action" onClick={onNewTask}>
          <Plus size={18} />
          <span>{t("tasks.quick.new")}</span>
        </button>
        <button className="quick-action" onClick={onFocus}>
          <Focus size={18} />
          <span>{t("tasks.quick.focus")}</span>
        </button>
        <button className="quick-action" onClick={onMessages}>
          <MessageCircle size={18} />
          <span>{t("tasks.quick.messages")}</span>
        </button>
      </div>
    </section>
  );
}
