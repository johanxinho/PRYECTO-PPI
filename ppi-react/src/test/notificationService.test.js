import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showBrowserNotification } from "../services/notificationService";

class MockNotification {
  static permission = "granted";
  static requestPermission = vi.fn(async () => "granted");
  static instances = [];
  constructor(title, options) {
    this.title = title;
    this.options = options;
    this.close = vi.fn();
    MockNotification.instances.push(this);
  }
}

beforeEach(() => {
  MockNotification.permission = "granted";
  MockNotification.instances = [];
  Object.defineProperty(window, "Notification", { configurable: true, writable: true, value: MockNotification });
});

afterEach(() => {
  delete window.Notification;
  delete navigator.serviceWorker;
});

describe("notificationService", () => {
  it("envía una notificación persistente al Service Worker con vibración y enlace a la tarea", async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { ready: Promise.resolve({ showNotification }) },
    });

    await expect(showBrowserNotification({ title: "Alarma", body: "Entrega", taskId: "task-1" })).resolves.toBe(true);
    expect(showNotification).toHaveBeenCalledWith("Alarma", expect.objectContaining({
      body: "Entrega",
      requireInteraction: true,
      silent: false,
      vibrate: [500, 180, 500, 180, 900],
      actions: [{ action: "open", title: "Ver en RECORDATE" }],
      data: expect.objectContaining({ taskId: "task-1", url: expect.stringContaining("tareas") }),
    }));
  });

  it("usa una notificación de pestaña abierta si no existe Service Worker", async () => {
    await expect(showBrowserNotification({ title: "Prueba" })).resolves.toBe(true);
    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toBe("Prueba");
  });

  it("no muestra notificaciones si el usuario no concedió permiso", async () => {
    MockNotification.permission = "denied";
    await expect(showBrowserNotification()).resolves.toBe(false);
    expect(MockNotification.instances).toHaveLength(0);
  });
});
