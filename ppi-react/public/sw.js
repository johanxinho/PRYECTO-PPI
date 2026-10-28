/* global clients */
const fallbackTarget = () => new URL("dashboard", self.registration.scope).href;

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
    icon: new URL("favicon.svg", self.registration.scope).href,
    badge: new URL("favicon.svg", self.registration.scope).href,
    data: { taskId: data.taskId || null, url: data.url || fallbackTarget() },
  }));
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const target = notification?.data?.url || fallbackTarget();
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
