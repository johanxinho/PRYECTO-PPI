/**
 * AcercaDe: sección informativa de la landing.
 * Muestra un título, un texto introductorio y una lista de beneficios.
 */
function AcercaDe() { // Componente de la página "Acerca de"
    const usuarios = [ // Arreglo con las tarjetas de características (no son usuarios reales)
        { inicial: "01", nombre: "Encuentra tu espacio", descripcion: "Un lugar para mostrar lo que sabes hacer y hacia dónde quieres crecer." }, // Primera característica
        { inicial: "02", nombre: "Conecta con personas", descripcion: "Comparte ideas, descubre talento y crea oportunidades que sí importan." }, // Segunda característica
    ];

    return ( // JSX de la sección "Acerca de"
        <main className="about-section" aria-labelledby="about-title"> {/* Contenedor principal accesible */}
            <div className="about-intro"> {/* Bloque de introducción */}
                <p className="eyebrow accent-label">Una comunidad en movimiento</p> {/* Etiqueta pequeña sobre el título */}
                <h2 id="about-title">Haz que tu perfil<br /><em>hable por ti.</em></h2> {/* Título con énfasis visual */}
                <p className="intro-copy">PPI Conecta reúne personas con ganas de aprender, colaborar y convertir sus ideas en algo real.</p> {/* Párrafo introductorio */}
            </div>
            <div className="feature-list"> {/* Lista de tarjetas de características */}
                {usuarios.map((usuario) => ( // Recorre cada ítem y crea un artículo
                    <article className="feature-card" key={usuario.inicial}> {/* key evita avisos de React al listar */}
                        <span className="feature-number">{usuario.inicial}</span> {/* Número de la característica */}
                        <div> {/* Contenedor del título y la descripción */}
                            <h3>{usuario.nombre}</h3> {/* Nombre de la característica */}
                            <p>{usuario.descripcion}</p> {/* Texto explicativo */}
                        </div>
                        <span className="feature-arrow" aria-hidden="true">↗</span> {/* Flecha decorativa, oculta a lectores de pantalla */}
                    </article>
                ))}
            </div>
        </main>
    );
}

export default AcercaDe; // Exporta el componente para usarlo en App
