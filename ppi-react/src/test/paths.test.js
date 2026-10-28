import { afterEach, describe, expect, it } from "vitest";
import { resolveCurrentRoute } from "../paths";

const knownRoutes = ["/dashboard", "/tareas", "/mensajes"];

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("resolveCurrentRoute", () => {
  it("resolves a recognized view query at the app root", () => {
    window.history.replaceState({}, "", "/?view=%2Ftareas");
    expect(resolveCurrentRoute(knownRoutes)).toBe("/tareas");
  });

  it("prefers a known pathname to a different view query", () => {
    window.history.replaceState({}, "", "/mensajes?view=%2Ftareas");
    expect(resolveCurrentRoute(knownRoutes)).toBe("/mensajes");
  });

  it("ignores unrecognized query paths", () => {
    window.history.replaceState({}, "", "/?view=%2Fadmin-secret");
    expect(resolveCurrentRoute(knownRoutes)).toBe("/");
  });
});
