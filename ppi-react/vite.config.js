import { defineConfig } from "vite"; // defineConfig aporta autocompletado al objeto de configuración de Vite.
import react from "@vitejs/plugin-react"; // Plugin que transforma JSX y habilita Fast Refresh.
import { copyFileSync, cpSync, createReadStream, existsSync, mkdirSync } from "node:fs"; // APIs de Node para publicar fallback y documentación.
import process from "node:process"; // Entorno de Node usado para configurar el prefijo base.
import { resolve, sep } from "node:path"; // Normalizan rutas y evitan servir archivos fuera de docs/.
import { fileURLToPath, URL } from "node:url"; // Convierten import.meta.url en rutas de archivo reales.

function spaFallback() { // Plugin local: GitHub Pages no reescribe rutas SPA, así que 404.html = index.html.
  return { // Objeto de plugin de Vite (hook closeBundle).
    name: "spa-github-pages-fallback", // Nombre que Vite muestra en logs de build.
    closeBundle() { // Se ejecuta cuando el empaquetado a dist/ ya terminó.
      if (existsSync("dist/index.html")) copyFileSync("dist/index.html", "dist/404.html"); // Copia index para que /tareas no dé 404 real.
    }, // Fin del hook closeBundle.
  }; // Fin del plugin.
} // Fin de spaFallback.

function copyManuals() {
  const fileNames = ["MANUAL-DE-USUARIO.md", "EXPLICACION-EQUIPO-RECORDATE.md", "PROJECT-DOCUMENTATION.md"];
  const docsRoot = resolve(fileURLToPath(new URL("../docs/", import.meta.url)));
  return {
    name: "copy-public-manuals",
    configureServer(server) {
      server.middlewares.use("/docs", (request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") return next();
        const requestedPath = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname).replace(/^\/+/, "");
        const isManual = fileNames.includes(requestedPath);
        const isImage = requestedPath.startsWith("images/") && /^[A-Za-z0-9_-]+\.jpg$/.test(requestedPath.slice(7));
        if (!isManual && !isImage) return next();
        const filePath = resolve(docsRoot, requestedPath);
        if (!filePath.startsWith(`${docsRoot}${sep}`) || !existsSync(filePath)) return next();
        response.setHeader("Content-Type", isManual ? "text/markdown; charset=utf-8" : "image/jpeg");
        if (isManual) response.setHeader("Content-Disposition", `attachment; filename="${requestedPath}"`);
        if (request.method === "HEAD") return response.end();
        createReadStream(filePath).pipe(response);
      });
    },
    closeBundle() {
      const docsSource = new URL("../docs/", import.meta.url);
      const docsOutput = new URL("./dist/docs/", import.meta.url);
      mkdirSync(fileURLToPath(docsOutput), { recursive: true });
      for (const fileName of fileNames) {
        copyFileSync(fileURLToPath(new URL(fileName, docsSource)), fileURLToPath(new URL(fileName, docsOutput)));
      }
      cpSync(fileURLToPath(new URL("images/", docsSource)), fileURLToPath(new URL("images/", docsOutput)), { recursive: true });
    },
  };
}

export default defineConfig({ // Configuración que Vite lee al hacer npm run dev / build.
  plugins: [react(), spaFallback(), copyManuals()], // Activa React, fallback SPA y publicación de manuales.
  base: process.env.VITE_BASE || "/", // En Pages vale /PRYECTO-PPI/; en local queda /.
  resolve: { // Alias de importación para escribir @/ en vez de rutas relativas largas.
    alias: { // Mapa de alias.
      "@": fileURLToPath(new URL("./src", import.meta.url)), // @ apunta a la carpeta src/.
    }, // Fin del mapa de alias.
  }, // Fin de resolve.
  build: { // Separa dependencias pesadas en su propio chunk para acelerar la carga inicial.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react/") || id.includes("/react-dom/")) return "vendor";
          if (id.includes("/motion/")) return "motion";
          if (id.includes("/lucide-react/")) return "icons";
          if (id.includes("/@supabase/")) return "supabase";
        },
      },
    },
  }, // Fin de build.
}); // Fin de la configuración de Vite.
