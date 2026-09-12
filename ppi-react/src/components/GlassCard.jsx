// @ts-nocheck
export default function GlassCard({ as: Tag = "div", className = "", children, ...props }) {
  return (
    <Tag className={`glass-card ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
