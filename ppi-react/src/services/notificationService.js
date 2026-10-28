import { assetUrl } from "../paths";

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestBrowserNotificationPermission() {
  if (!canUseBrowserNotifications()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

export async function registerRecordateServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register(assetUrl("/sw.js"));
}

/**
 * Usa una notificación persistente para que el aviso pueda aparecer fuera de la pestaña.
 * El navegador y el sistema operativo siguen controlando la posición y la duración final.
 */
export async function showBrowserNotification({
  title = "RECORDATE",
  body = "Tienes una actividad pendiente.",
  taskId = null,
  tag = "recordate-notification",
  requireInteraction = true,
} = {}) {
  if (!canUseBrowserNotifications() || Notification.permission !== "granted") return false;
  try {
    const targetUrl = new URL(assetUrl(taskId ? "/tareas" : "/dashboard"), window.location.origin).href;
    const registration = await navigator.serviceWorker?.ready;
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag,
        renotify: true,
        requireInteraction,
        icon: assetUrl("/favicon.svg"),
        badge: assetUrl("/favicon.svg"),
        data: {
          taskId,
          url: targetUrl,
        },
      });
      return true;
    }
    const notification = new Notification(title, { body, tag });
    notification.onclick = () => window.focus();
    return true;
  } catch {
    return false;
  }
}
