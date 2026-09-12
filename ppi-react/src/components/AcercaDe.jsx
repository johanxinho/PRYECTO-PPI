/**
 * AcercaDe (legado): sección de una landing anterior (“PPI Conecta”).
 * El contenido actual de RECORDATE está en App.jsx (Landing). No se monta desde App.jsx.
 */
function AcercaDe() {
  const puntos = [
    { inicial: "01", nombre: "Organiza tu día", descripcion: "Tareas, fechas y prioridades en un solo espacio académico." },
    { inicial: "02", nombre: "Recuerda a tiempo", descripcion: "Avisos y alarmas para llegar a cada entrega sin contratiempos." },
  ];

  return (
    <main className="about-section" aria-labelledby="about-title">
      <div className="about-intro">
        <p className="eyebrow accent-label">Proyecto pedagógico</p>
        <h2 id="about-title">RECORDATE<br /><em>para tu ritmo académico.</em></h2>
        <p className="intro-copy">Sistema de recordatorio de actividades para estudiantes de la IE La Candelaria.</p>
      </div>
      <div className="feature-list">
        {puntos.map((punto) => (
          <article className="feature-card" key={punto.inicial}>
            <span className="feature-number">{punto.inicial}</span>
            <div>
              <h3>{punto.nombre}</h3>
              <p>{punto.descripcion}</p>
            </div>
            <span className="feature-arrow" aria-hidden="true">↗</span>
          </article>
        ))}
      </div>
    </main>
  );
}

export default AcercaDe;
