/**
 * InicioSesion: formulario visual de login (correo y contraseña).
 * En esta versión los campos aún no envían datos al servidor.
 */
function InicioSesion(){ // Componente de la pantalla de iniciar sesión

return( // Devuelve el formulario de acceso

<div className="container"> {/* Caja centrada del formulario */}

<h2>Iniciar sesión</h2> {/* Título de la vista */}

<input 
className="form-control mb-2"
placeholder="Correo"
/> {/* Campo de texto para el correo del usuario */}

<input 
className="form-control mb-2"
placeholder="Contraseña"
/> {/* Campo de texto para la contraseña */}

<button className="btn btn-primary"> {/* Botón principal para entrar */}
Ingresar
</button>

</div>

)

}

export default InicioSesion; // Exporta el componente de inicio de sesión
