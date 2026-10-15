// @ts-nocheck

export default function PriorityBadge({ priority }) {
  const labels = { Alta: "Alta", Media: "Media", Baja: "Baja" };
  const className = `priority-badge priority-${(priority || "Media").toLowerCase()}`;
  return <span className={className}>{labels[priority] || priority}</span>;
}
