// Punto de entrada de RECORDATE: React monta aquí toda la aplicación.
import { StrictMode } from 'react' // StrictMode avisa de efectos duplicados y prácticas inseguras en desarrollo.
import { createRoot } from 'react-dom/client' // createRoot es la API moderna para pintar React en el DOM.
import './recordate.css' // Carga la identidad visual (colores, tipografías y layout) antes de pintar la UI.
import App from './App.jsx' // App es el componente raíz: landing, login y panel autenticado.

createRoot(document.getElementById('root')).render( // Busca el div #root de index.html y crea el árbol de React.
  <StrictMode> {/* Activa comprobaciones extra solo en modo desarrollo. */}
    <App /> {/* Renderiza RECORDATE completo dentro de StrictMode. */}
  </StrictMode>, // Cierra StrictMode para que el árbol quede envuelto.
) // Termina el render inicial de la aplicación.
