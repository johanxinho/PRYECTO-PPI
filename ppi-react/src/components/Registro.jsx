/**
 * Registro: formulario visual para crear una cuenta (nombre y correo).
 * En esta versión los campos aún no envían datos al servidor.
 */
function Registro(){ // Componente de la pantalla de registro

return( // Devuelve el formulario de alta

<div className="container"> {/* Caja centrada del formulario */}

<h2>Registro</h2> {/* Título de la vista */}

<input 
className="form-control mb-2"
placeholder="Nombre"
/> {/* Campo para el nombre completo */}

<input 
className="form-control mb-2"
placeholder="Correo"
/> {/* Campo para el correo electrónico */}

<button className="btn btn-success"> {/* Botón de acción para registrarse */}
Registrar
</button>

</div>

)

}

export default Registro; // Exporta el componente de registro
