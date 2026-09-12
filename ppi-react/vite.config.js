import { defineConfig } from "vite"; // defineConfig aporta autocompletado al objeto de configuración de Vite.
import react from "@vitejs/plugin-react"; // Plugin que transforma JSX y habilita Fast Refresh.
import { copyFileSync, existsSync } from "node:fs"; // APIs de Node para copiar el fallback 404 de GitHub Pages.
import { fileURLToPath, URL } from "node:url"; // Convierten import.meta.url en rutas de archivo reales.

function spaFallback() { // Plugin local: GitHub Pages no reescribe rutas SPA, así que 404.html = index.html.
  return { // Objeto de plugin de Vite (hook closeBundle).
    name: "spa-github-pages-fallback", // Nombre que Vite muestra en logs de build.
    closeBundle() { // Se ejecuta cuando el empaquetado a dist/ ya terminó.
      if (existsSync("dist/index.html")) copyFileSync("dist/index.html", "dist/404.html"); // Copia index para que /tareas no dé 404 real.
    }, // Fin del hook closeBundle.
  }; // Fin del plugin.
} // Fin de spaFallback.

export default defineConfig({ // Configuración que Vite lee al hacer npm run dev / build.
  plugins: [react(), spaFallback()], // Activa React y el fallback SPA para Pages.
  base: process.env.VITE_BASE || "/", // En Pages vale /PRYECTO-PPI/; en local queda /.
  resolve: { // Alias de importación para escribir @/ en vez de rutas relativas largas.
    alias: { // Mapa de alias.
      "@": fileURLToPath(new URL("./src", import.meta.url)), // @ apunta a la carpeta src/.
    }, // Fin del mapa de alias.
  }, // Fin de resolve.
}); // Fin de la configuración de Vite.
