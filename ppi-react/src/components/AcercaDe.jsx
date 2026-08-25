function AcercaDe() {
    const usuarios = [
        { inicial: "01", nombre: "Encuentra tu espacio", descripcion: "Un lugar para mostrar lo que sabes hacer y hacia dónde quieres crecer." },
        { inicial: "02", nombre: "Conecta con personas", descripcion: "Comparte ideas, descubre talento y crea oportunidades que sí importan." },
    ];

    return (
        <main className="about-section" aria-labelledby="about-title">
            <div className="about-intro">
                <p className="eyebrow accent-label">Una comunidad en movimiento</p>
                <h2 id="about-title">Haz que tu perfil<br /><em>hable por ti.</em></h2>
                <p className="intro-copy">PPI Conecta reúne personas con ganas de aprender, colaborar y convertir sus ideas en algo real.</p>
            </div>
            <div className="feature-list">
                {usuarios.map((usuario) => (
                    <article className="feature-card" key={usuario.inicial}>
                        <span className="feature-number">{usuario.inicial}</span>
                        <div>
                            <h3>{usuario.nombre}</h3>
                            <p>{usuario.descripcion}</p>
                        </div>
                        <span className="feature-arrow" aria-hidden="true">↗</span>
                    </article>
                ))}
            </div>
        </main>
    );
}

export default AcercaDe;
