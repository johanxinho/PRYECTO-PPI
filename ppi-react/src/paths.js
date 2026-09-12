// @ts-nocheck
// Prefijo de rutas para GitHub Pages (BASE_URL) y desarrollo local (/).
export const appBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, ""); // Quita la barra final para concatenar rutas sin duplicar //.

export function currentPath() { // Devuelve la ruta interna de RECORDATE, sin el prefijo /PRYECTO-PPI.
  const raw = window.location.pathname || "/"; // Pathname crudo del navegador (incluye el base de Pages).
  const stripped = appBase && (raw === appBase || raw.startsWith(`${appBase}/`)) // Si estamos bajo el prefijo del repo...
    ? raw.slice(appBase.length) || "/" // ...lo recorta para que App vea /dashboard, /tareas, etc.
    : raw; // En local (base /) se usa el pathname tal cual.
  return stripped.startsWith("/") ? stripped : `/${stripped}`; // Garantiza que siempre empiece con /.
} // Fin de currentPath.

export function pushRoute(route) { // Cambia la URL visible sin recargar la página (SPA).
  const next = `${appBase}${route}`; // Antepone /PRYECTO-PPI en producción y nada extra en local.
  if (`${window.location.pathname}${window.location.search}` !== next) { // Evita empujar el mismo estado dos veces.
    window.history.pushState({}, "", next); // Actualiza la barra de direcciones con history API.
  } // Fin de la guarda de duplicados.
} // Fin de pushRoute.

export function assetUrl(path) { // Construye URLs de archivos públicos (logo, retrato, favicon).
  const clean = path.startsWith("/") ? path : `/${path}`; // Normaliza para que siempre haya una sola barra.
  return `${appBase}${clean}`; // Prefijo de Pages + ruta del asset en /public.
} // Fin de assetUrl.
