/* global clients */ // Avisa al linter que `clients` existe en el Service Worker.
self.addEventListener("push", (event) => { // Escucha notificaciones Web Push enviadas al navegador.
  const data = event.data?.json() || {}; // Lee el JSON del push o usa un objeto vacío si no hay payload.
  event.waitUntil(self.registration.showNotification(data.title || "RECORDATE", { // Muestra la notificación nativa y mantiene vivo el SW.
    body: data.body || "Tienes una actividad pendiente.", // Texto del aviso; hay un mensaje por defecto.
    tag: data.tag || "recordate-notification", // Tag para agrupar/reemplazar avisos repetidos.
    data: { taskId: data.taskId || null }, // Guarda el id de la tarea para abrirla al hacer clic.
  })); // Fin de showNotification / waitUntil.
}); // Fin del listener push.

self.addEventListener("notificationclick", (event) => { // Cuando el usuario toca la notificación.
  event.notification.close(); // Cierra el globo de notificación.
  const target = new URL("tareas", self.registration.scope).href; // URL de Mis tareas, relativa al alcance del SW (incluye /PRYECTO-PPI/).
  event.waitUntil(clients.openWindow(target)); // Abre o enfoca esa pantalla de la agenda.
}); // Fin del listener notificationclick.
