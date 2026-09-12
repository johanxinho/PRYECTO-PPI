/**
 * Header: cabecera de la landing con marca, título y una nota motivadora.
 */
function Header() { // Componente del encabezado del sitio
    return ( // Devuelve el markup del header
        <header className="site-header"> {/* Encabezado semántico de la página */}
            <div className="header-inner"> {/* Contenedor interno para alinear logo, título y nota */}
                <div className="brand-mark" aria-hidden="true">P</div> {/* Inicial decorativa de la marca */}
                <div> {/* Bloque con el nombre de la plataforma */}
                    <p className="eyebrow">Plataforma de perfiles</p> {/* Subtítulo pequeño encima del h1 */}
                    <h1>PPI <span>Conecta</span></h1> {/* Título principal de la marca */}
                </div>
                <div className="header-note">Tu próximo paso empieza aquí <span aria-hidden="true">↗</span></div> {/* Mensaje corto a la derecha */}
            </div>
        </header>
    );
}

export default Header; // Exporta Header para el resto de la app
