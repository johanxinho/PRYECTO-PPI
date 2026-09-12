// @ts-nocheck
// Marca visual oficial de RECORDATE: logo de calendario + wordmark.
const mark = `${import.meta.env.BASE_URL}brand/recordate-logo.png`; // Ruta del PNG del calendario, compatible con GitHub Pages.

export function Brand({ light = false, size = "md", wordmark = true }) { // Brand pinta el isotipo y el nombre en encabezados.
  return ( // Devuelve el bloque de marca reutilizable.
    <div className={`brand ${light ? "brand-light" : ""} brand-${size}`}> {/* Contenedor con variantes de color y tamaño. */}
      <span className="brand-mark" aria-hidden="true"> {/* Envuelve el logo; aria-hidden evita que el lector lo duplique. */}
        <img src={mark} alt="" className="brand-logo-img" /> {/* Imagen del calendario con checklist; alt vacío porque el texto está al lado. */}
      </span> {/* Cierra el isotipo. */}
      {wordmark ? <span className="brand-word">RECORDATE</span> : <span className="sr-only">RECORDATE</span>} {/* Muestra el nombre o lo deja solo para lectores de pantalla. */}
    </div> // Cierra el bloque de marca.
  ); // Fin del JSX de Brand.
} // Fin del componente Brand.

export function LogoMark({ className = "", decorative = true }) { // LogoMark muestra solo el PNG, útil en login o héroes.
  return ( // Devuelve la imagen suelta del logo.
    <img
      src={mark} // Usa la misma ruta del calendario oficial.
      alt={decorative ? "" : "RECORDATE"} // Si es decorativo no anuncia nada; si no, lee el nombre de la marca.
      className={`logo-hero-img ${className}`} // Combina la clase base con extras que mande el padre.
    /> // Cierra la etiqueta de imagen.
  ); // Fin del JSX de LogoMark.
} // Fin del componente LogoMark.

export default Brand; // Export por defecto para importar la marca sin llaves.
