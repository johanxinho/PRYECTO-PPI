// @ts-nocheck

export default function Stats({ stats }) {
  return (
    <section className="stats-grid">
      {[
        ["Pendientes", stats.pending, "Actividades por completar", "green"],
        ["Para hoy", stats.today, "Fecha m\u00e1s cercana", "gold"],
        ["Alta prioridad", stats.high, "Requieren atenci\u00f3n", "coral"],
        ["Completadas", stats.done, "Tu avance acumulado", "ink"],
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
