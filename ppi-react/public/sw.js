/* global clients */
const fallbackTarget = () => new URL("?view=%2Fdashboard", self.registration.scope).href;
const alarmVibration = [500, 180, 500, 180, 900];

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
    data = { body: event.data?.text?.() || "Tienes una actividad pendiente." };
  }
  event.waitUntil(self.registration.showNotification(data.title || "RECORDATE", {
    body: data.body || "Tienes una actividad pendiente.",
    tag: data.tag || "recordate-notification",
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    silent: false,
    vibrate: data.vibrate || alarmVibration,
    timestamp: Date.now(),
    icon: new URL("favicon.svg", self.registration.scope).href,
    badge: new URL("favicon.svg", self.registration.scope).href,
    actions: [{ action: "open", title: "Ver en RECORDATE" }],
    data: { taskId: data.taskId || null, url: data.url || fallbackTarget() },
  }));
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
