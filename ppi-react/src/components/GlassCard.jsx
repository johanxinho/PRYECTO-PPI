// @ts-nocheck
/**
 * GlassCard: envoltorio reutilizable con el estilo de tarjeta de vidrio.
 * Recibe la etiqueta HTML (as), clases extra y el contenido hijo.
 */
export default function GlassCard({ as: Tag = "div", className = "", children, ...props }) { // as cambia la etiqueta; className suma estilos; children es el interior
  return ( // Devuelve la tarjeta con las clases combinadas
    <Tag className={`glass-card ${className}`.trim()} {...props}> {/* Combina glass-card con clases extra y pasa el resto de props */}
      {children} // Renderiza lo que el padre coloque dentro de la tarjeta
    </Tag>
  );
}
