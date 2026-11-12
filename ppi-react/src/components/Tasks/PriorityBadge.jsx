// @ts-nocheck
import { useI18n } from "../../i18n";

export default function PriorityBadge({ priority }) {
  const { t } = useI18n();
  const labels = { Alta: t("tasks.priority.high"), Media: t("tasks.priority.medium"), Baja: t("tasks.priority.low") };
  const className = `priority-badge priority-${(priority || "Media").toLowerCase()}`;
  return <span className={className}>{labels[priority] || priority}</span>;
}
