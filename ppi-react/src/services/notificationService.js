import { assetUrl } from "../paths";

const ALARM_VIBRATION = [500, 180, 500, 180, 900];

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestBrowserNotificationPermission() {
  if (!canUseBrowserNotifications()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export async function registerRecordateServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") return null;
  return navigator.serviceWorker.register(assetUrl("/sw.js"));
}

/**
 * Muestra una notificación del sistema. La página puede pedir persistencia y vibración,
 * pero el navegador y el sistema operativo deciden si aparece como banner y qué sonido usa.
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
    let registration = null;
    try {
      registration = await navigator.serviceWorker?.ready;
    } catch {
      // Sin worker se intenta el aviso de pestaña abierta.
    }
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag,
        renotify: true,
        requireInteraction,
        silent: false,
        vibrate: ALARM_VIBRATION,
        timestamp: Date.now(),
        icon: assetUrl("/favicon.svg"),
        badge: assetUrl("/favicon.svg"),
        actions: [{ action: "open", title: "Ver en RECORDATE" }],
        data: { taskId, url: targetUrl },
      });
      return true;
    }
    const notification = new Notification(title, {
      body,
      tag,
      renotify: true,
      requireInteraction,
      silent: false,
      vibrate: ALARM_VIBRATION,
      icon: assetUrl("/favicon.svg"),
      data: { taskId, url: targetUrl },
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
