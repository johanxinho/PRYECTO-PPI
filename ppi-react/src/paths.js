// @ts-nocheck
// Prefijo de rutas para GitHub Pages (BASE_URL) y desarrollo local (/).
export const appBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export function currentPath() {
  const raw = window.location.pathname || "/";
  const stripped = appBase && (raw === appBase || raw.startsWith(`${appBase}/`))
    ? raw.slice(appBase.length) || "/"
    : raw;
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

export function pushRoute(route) {
  const next = `${appBase}${route}`;
  if (`${window.location.pathname}${window.location.search}` !== next) {
    window.history.pushState({}, "", next);
  }
}

export function assetUrl(path) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${appBase}${clean}`;
}

/** URL absoluta de la app (incluye /PRYECTO-PPI/ en GitHub Pages). */
export function appUrl(path = "/") {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return `${origin}${appBase}/`;
  return `${origin}${appBase}${clean}`;
}
