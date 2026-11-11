/* global clients */
const fallbackTarget = () => new URL("?view=%2Fdashboard", self.registration.scope).href;
const alarmVibration = [500, 180, 500, 180, 900];
const LANGUAGE_CACHE = "recordate-language-v1";
const PRECACHE_MANIFEST = "__PRECACHE_MANIFEST__";
const PRECACHE_VERSION = "__PRECACHE_VERSION__";
const SHELL_CACHE_PREFIX = "recordate-shell-";
const SHELL_CACHE = `${SHELL_CACHE_PREFIX}${PRECACHE_VERSION}`;
let preferredLanguage = "es";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    if (PRECACHE_VERSION.startsWith("__")) {
      await self.skipWaiting();
      return;
    }
    const scope = new URL(self.registration.scope);
    const manifestUrl = new URL(PRECACHE_MANIFEST, scope);
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar el manifest de recursos de RECORDATE.");
    const manifest = await response.json();
    if (manifest.version !== PRECACHE_VERSION || !Array.isArray(manifest.assets)) {
      throw new Error("El manifest de recursos de RECORDATE no coincide con la versión del worker.");
    }
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(manifest.assets.map(async (asset) => {
      const url = new URL(asset, scope);
      try {
        const assetResponse = await fetch(url, { cache: "no-store" });
        if (assetResponse.ok) await cache.put(url, assetResponse);
      } catch {
        // Un recurso opcional que no responda no debe invalidar la instalación del worker.
      }
    }));
    const indexUrl = new URL("index.html", scope);
    const indexResponse = await cache.match(indexUrl);
    if (!indexResponse) throw new Error("No fue posible guardar el shell principal de RECORDATE.");
    await cache.put(scope, indexResponse.clone());
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(SHELL_CACHE_PREFIX) && name !== SHELL_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (PRECACHE_VERSION.startsWith("__")) return;
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== "GET" || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(request, { ignoreVary: true }))
          || (await cache.match(scope, { ignoreVary: true }))
          || (await cache.match(new URL("index.html", scope), { ignoreVary: true }))
          || Response.error();
      }
    })());
    return;
  }

  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })());
  }
});

function languageStorageUrl() {
  return new URL("__recordate_language__", self.registration.scope).href;
}

async function persistLanguage(lang) {
  try {
    preferredLanguage = lang;
    const cache = await caches.open(LANGUAGE_CACHE);
    await cache.put(languageStorageUrl(), new Response(lang, { headers: { "Content-Type": "text/plain" } }));
  } catch {
    // Si Cache Storage no está disponible, el idioma se conserva en memoria hasta reiniciar.
  }
}

async function readPreferredLanguage() {
  try {
    const response = await (await caches.open(LANGUAGE_CACHE)).match(languageStorageUrl());
    const cached = response ? await response.text() : "";
    if (cached === "es" || cached === "en") preferredLanguage = cached;
  } catch {
    // Fallback al valor en memoria o español.
  }
  return preferredLanguage;
}

const notificationDictionary = {
  es: { body: "Tienes una actividad pendiente.", action: "Ver en RECORDATE" },
  en: { body: "You have a pending activity.", action: "View in RECORDATE" },
};

function genericNotificationText(lang = preferredLanguage) {
  return notificationDictionary[lang] || notificationDictionary.es;
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_LANGUAGE" && (event.data.lang === "es" || event.data.lang === "en")) {
    event.waitUntil(persistLanguage(event.data.lang));
  }
});

function notificationTarget(data = {}) {
  const scope = new URL(self.registration.scope);
  const requested = data.taskId ? "?view=%2Ftareas" : data.url || fallbackTarget();
  const target = new URL(requested, scope);
  if (target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) {
    return fallbackTarget();
  }
  return target.href;
}

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json() || {};
  } catch {
    data = { body: event.data?.text?.() || "" };
  }
  event.waitUntil((async () => {
    const lang = await readPreferredLanguage();
    const genericText = genericNotificationText(lang);
    await self.registration.showNotification(data.title || "RECORDATE", {
      body: data.body || genericText.body,
      tag: data.tag || "recordate-notification",
      renotify: true,
      requireInteraction: data.requireInteraction !== false,
      silent: false,
      vibrate: data.vibrate || alarmVibration,
      timestamp: Date.now(),
      icon: new URL("favicon.svg", self.registration.scope).href,
      badge: new URL("favicon.svg", self.registration.scope).href,
      actions: [{ action: "open", title: genericText.action }],
      data: { taskId: data.taskId || null, url: data.url || fallbackTarget() },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const target = notificationTarget(notification?.data || {});
  notification?.close();
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        if (client.url !== target && "navigate" in client) await client.navigate(target);
        await client.focus();
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
