import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const COURSES_SCOPE = "https://www.googleapis.com/auth/classroom.courses.readonly";
const WORK_SCOPE = "https://www.googleapis.com/auth/classroom.coursework.me.readonly";

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
              })
            )
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

describe("googleClassroomService pagination", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
  });

  afterEach(() => {
    delete window.google;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("carga todos los cursos y actividades, sin topes locales de 30 cursos o 250 tareas", async () => {
    installGoogleTokenMock();
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

    const { connectGoogleClassroom, listClassroomAssignments } =
      await import("../services/googleClassroomService");
    await connectGoogleClassroom();
    const result = await listClassroomAssignments();

    expect(result.courses).toHaveLength(35);
    expect(result.assignments).toHaveLength(260);
    expect(new Set(result.assignments.map((item) => item.externalId)).size).toBe(260);
    expect(result.skippedCourseCount).toBe(0);
    expect(maxConcurrentRequests).toBeGreaterThan(1);
    expect(maxConcurrentRequests).toBeLessThanOrEqual(5);
  });
});
