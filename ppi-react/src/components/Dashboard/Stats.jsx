// @ts-nocheck
import { useI18n } from "../../i18n";

export default function Stats({ stats }) {
  const { t } = useI18n();
  return (
    <section className="stats-grid">
      {[
        [t("tasks.stats.pending"), stats.pending, t("tasks.stats.pendingCaption"), "green"],
        [t("tasks.stats.today"), stats.today, t("tasks.stats.todayCaption"), "gold"],
        [t("tasks.stats.high"), stats.high, t("tasks.stats.highCaption"), "coral"],
        [t("tasks.stats.done"), stats.done, t("tasks.stats.doneCaption"), "ink"],
      ].map(([label, value, caption, tone]) => (
        <div className="stat-card" key={label}>
          <div className={`stat-icon ${tone}`} aria-hidden="true" />
          <div className="stat-content">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
            <span className="stat-caption">{caption}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
