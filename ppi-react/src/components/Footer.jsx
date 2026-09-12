/**
 * Footer: pie de página simple con el nombre del proyecto y el año.
 */
function Footer() { // Componente del pie de página
    return ( // Devuelve el markup del footer
        <footer className="site-footer"> {/* Etiqueta semántica de pie de página */}
            <p>PPI Conecta <span>•</span> Construyendo oportunidades</p> {/* Nombre del proyecto y eslogan */}
            <p className="footer-year">2026</p> {/* Año del PPI */}
        </footer>
    );
}

export default Footer; // Permite importar Footer desde otros archivos
