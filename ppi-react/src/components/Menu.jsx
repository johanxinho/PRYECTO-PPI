/**
 * Menu: barra de navegación principal con enlaces internos de la landing.
 */
function Menu() { // Componente de menú / navegación
    return ( // Devuelve el nav con los enlaces
        <nav className="site-nav" aria-label="Navegación principal"> {/* Nav accesible con etiqueta descriptiva */}
            <div className="nav-inner"> {/* Contenedor interno de la barra */}
                <p className="nav-label">Explora</p> {/* Texto de sección del menú */}
                <div className="nav-links"> {/* Grupo de enlaces */}
                    <a className="nav-link active" href="#inicio">Inicio</a> {/* Enlace a la sección de inicio (activo) */}
                    <a className="nav-link" href="#autenticacion">Mi cuenta <span aria-hidden="true">↗</span></a> {/* Enlace a la zona de cuenta */}
                </div>
            </div>
        </nav>
    );
}

export default Menu; // Exporta el menú para colocarlo en el layout
