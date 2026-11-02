import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const COURSES_SCOPE = "https://www.googleapis.com/auth/classroom.courses.readonly";
const WORK_SCOPE = "https://www.googleapis.com/auth/classroom.coursework.me.readonly";
const STAFF_WORK_SCOPE = "https://www.googleapis.com/auth/classroom.coursework.students.readonly";

function installGoogleTokenMock() {
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn((config) => ({
          requestAccessToken: vi.fn(() =>
            queueMicrotask(() =>
              config.callback({
                access_token: "test-classroom-token",
                expires_in: 3600,
                scope: `${COURSES_SCOPE} ${WORK_SCOPE}`,
              }),
            ),
          ),
        })),
        revoke: vi.fn(),
      },
    },
  };
}

function response(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

function errorResponse(status, payload) {
  return { ok: false, status, json: async () => payload };
}

async function connectService() {
  const { connectGoogleClassroom } = await import("../services/googleClassroomService");
  await connectGoogleClassroom();
  return import("../services/googleClassroomService");
}

describe("googleClassroomService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
    installGoogleTokenMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    document
      .querySelectorAll('script[src="https://accounts.google.com/gsi/client"]')
      .forEach((script) => script.remove());
    delete window.google;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("carga todos los cursos y actividades, sin topes locales de 30 cursos o 250 tareas", async () => {
    const courses = Array.from({ length: 35 }, (_, index) => ({
      id: `course-${index}`,
      name: `Curso ${index}`,
    }));
    let activeRequests = 0;
    let maxConcurrentRequests = 0;
    const fetchMock = vi.fn(async (request) => {
      const url = new URL(request);
      if (url.pathname.endsWith("/courses")) return response({ courses });
      activeRequests += 1;
      maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeRequests -= 1;
      const courseId = url.pathname.split("/").at(-2);
      if (courseId !== "course-0") return response({ courseWork: [] });
      const token = url.searchParams.get("pageToken");
      const page = token === "page-2" ? 1 : token === "page-3" ? 2 : 0;
      const count = page === 2 ? 60 : 100;
      const courseWork = Array.from({ length: count }, (_, index) => {
        const id = page * 100 + index;
        return {
          id: `assignment-${id}`,
          title: `Actividad ${id}`,
          dueDate: { year: 2026, month: 12, day: 1 },
        };
      });
      const nextPageToken = page < 2 ? `page-${page + 2}` : "";
      return response({ courseWork, nextPageToken });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { listClassroomAssignments } = await connectService();
    const result = await listClassroomAssignments();

    expect(result.courses).toHaveLength(35);
    expect(result.assignments).toHaveLength(260);
    expect(new Set(result.assignments.map((item) => item.externalId)).size).toBe(260);
    expect(result.failedCourses).toEqual([]);
    expect(result.skippedCourseCount).toBe(0);
    expect(maxConcurrentRequests).toBeGreaterThan(1);
    expect(maxConcurrentRequests).toBeLessThanOrEqual(5);
  });

  it("conserva tareas publicadas que no tienen fecha de entrega", async () => {
    const courses = [{ id: "course-bio", name: "Biología" }];
    const fetchMock = vi.fn(async (request) => {
      const url = new URL(request);
      if (url.pathname.endsWith("/courses")) return response({ courses });
      return response({
        courseWork: [
          { id: "with-date", title: "Ensayo", dueDate: { year: 2026, month: 11, day: 5 } },
          { id: "without-date", title: "Lectura", description: "Revisar el capítulo 2." },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { listClassroomAssignments } = await connectService();
    const result = await listClassroomAssignments();

    expect(result.assignments).toHaveLength(2);
    expect(result.assignments.find((item) => item.externalId.endsWith("without-date"))).toMatchObject({
      title: "Lectura",
      courseId: "course-bio",
      courseName: "Biología",
      date: "",
      time: "",
    });
  });

  it("conserva el código y mensaje de un fallo por curso", async () => {
    const courses = [{ id: "course-403", name: "Álgebra" }];
    const fetchMock = vi.fn(async (request) => {
      const url = new URL(request);
      if (url.pathname.endsWith("/courses")) return response({ courses });
      return errorResponse(403, {
        error: {
          code: 403,
          status: "PERMISSION_DENIED",
          message: "El usuario no puede leer las tareas de este curso.",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { listClassroomAssignments } = await connectService();
    const result = await listClassroomAssignments();

    expect(result.assignments).toEqual([]);
    expect(result.failedCourseCount).toBe(1);
    expect(result.failedCourses[0]).toMatchObject({
      courseId: "course-403",
      courseName: "Álgebra",
      status: 403,
      apiStatus: "PERMISSION_DENIED",
      message: "HTTP 403: El usuario no puede leer las tareas de este curso.",
    });
  });

  it("permite seleccionar la cuenta y solicita el scope de solo lectura para docentes", async () => {
    const { connectGoogleClassroom } = await import("../services/googleClassroomService");
    await connectGoogleClassroom({ staff: true, selectAccount: true });

    const [config] = window.google.accounts.oauth2.initTokenClient.mock.calls[0];
    const tokenClient = window.google.accounts.oauth2.initTokenClient.mock.results[0].value;
    expect(config.scope).toBe(`${COURSES_SCOPE} ${STAFF_WORK_SCOPE}`);
    expect(tokenClient.requestAccessToken).toHaveBeenCalledWith({ prompt: "select_account consent" });
  });

  it("muestra un error recuperable si Google Identity Services no carga", async () => {
    vi.useFakeTimers();
    delete window.google;
    const { connectGoogleClassroom } = await import("../services/googleClassroomService");
    const pending = connectGoogleClassroom();
    const assertion = expect(pending).rejects.toThrow(/tardó más de 15 segundos/);

    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it("espera un nuevo clic si GIS termina de cargar después del clic inicial", async () => {
    delete window.google;
    const { connectGoogleClassroom } = await import("../services/googleClassroomService");
    const pending = connectGoogleClassroom();
    const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    expect(script).not.toBeNull();

    installGoogleTokenMock();
    script.dispatchEvent(new Event("load"));

    await expect(pending).rejects.toThrow(/Pulsa de nuevo/);
    expect(window.google.accounts.oauth2.initTokenClient).not.toHaveBeenCalled();
    await connectGoogleClassroom();
    expect(window.google.accounts.oauth2.initTokenClient).toHaveBeenCalledTimes(1);
  });

  it("no deja la conexión pendiente si Google no devuelve el token OAuth", async () => {
    vi.useFakeTimers();
    window.google.accounts.oauth2.initTokenClient.mockImplementation(() => ({
      requestAccessToken: vi.fn(),
    }));
    const { connectGoogleClassroom } = await import("../services/googleClassroomService");
    const pending = connectGoogleClassroom();
    const assertion = expect(pending).rejects.toThrow(/Google no respondió en 60 segundos/);

    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
  });
});
