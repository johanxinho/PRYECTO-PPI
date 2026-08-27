/* global clients */
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(data.title || "RECORDATE", {
    body: data.body || "Tienes una actividad pendiente.",
    tag: data.tag || "recordate-notification",
    data: { taskId: data.taskId || null },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/tareas"));
});
