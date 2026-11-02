const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
const COURSES_SCOPE = "https://www.googleapis.com/auth/classroom.courses.readonly";
const STUDENT_WORK_SCOPE = "https://www.googleapis.com/auth/classroom.coursework.me.readonly";
const STAFF_WORK_SCOPE = "https://www.googleapis.com/auth/classroom.coursework.students.readonly";
const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

let scriptPromise = null;
let tokenClient = null;
let accessToken = null;
let expiresAt = 0;

export const isGoogleClassroomConfigured = Boolean(clientId && !clientId.includes("tu_client_id"));

function getGoogleApi() {
  return typeof window !== "undefined" ? window.google : null;
}

function loadGoogleIdentityScript() {
  if (getGoogleApi()?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT}"]`);
    const script = existing || document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = GOOGLE_SCRIPT;
    script.onload = () =>
      getGoogleApi()?.accounts?.oauth2
        ? resolve()
        : reject(new Error("Google Identity Services no está disponible."));
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services."));
    if (!existing) document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

export async function connectGoogleClassroom({ staff = false } = {}) {
  if (!isGoogleClassroomConfigured) {
    throw new Error("Configura VITE_GOOGLE_CLIENT_ID para habilitar Google Classroom.");
  }
  await loadGoogleIdentityScript();
  const google = getGoogleApi();
  return new Promise((resolve, reject) => {
    const scope = [COURSES_SCOPE, staff ? STAFF_WORK_SCOPE : STUDENT_WORK_SCOPE].join(" ");
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (response?.error || !response?.access_token) {
          reject(
            new Error(response?.error_description || "Google no concedió acceso a Classroom."),
          );
          return;
        }
        accessToken = response.access_token;
        expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
        resolve({ token: accessToken, scope: response.scope || scope });
      },
      error_callback: (error) =>
        reject(new Error(error?.message || "No se pudo abrir el consentimiento de Google.")),
    });
    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
}

function requireToken() {
  if (!accessToken || Date.now() >= expiresAt) {
    throw new Error("La autorización de Google expiró. Vuelve a conectar Classroom.");
  }
  return accessToken;
}

async function classroomRequest(path, params = {}) {
  const token = requireToken();
  const url = new URL(`https://classroom.googleapis.com/v1/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) accessToken = null;
    const apiError = payload?.error || {};
    const error = new Error(apiError.message || `Google Classroom respondió ${response.status}.`);
    error.name = "GoogleClassroomApiError";
    error.status = response.status;
    error.apiStatus = apiError.status || "";
    error.reason = apiError.errors?.[0]?.reason || "";
    throw error;
  }
  return payload;
}

async function listAllPages(path, params, field) {
  const items = [];
  let pageToken = "";
  const seenPageTokens = new Set();
  while (true) {
    const payload = await classroomRequest(path, { ...params, pageSize: 100, pageToken });
    items.push(...(Array.isArray(payload[field]) ? payload[field] : []));
    const nextPageToken = payload.nextPageToken || "";
    if (!nextPageToken || seenPageTokens.has(nextPageToken)) break;
    seenPageTokens.add(nextPageToken);
    pageToken = nextPageToken;
  }
  return items;
}

async function mapSettled(items, worker, concurrency = 5) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function describeCourseError(error) {
  const message = String(error?.message || "No se pudieron consultar las actividades de este curso.").trim();
  const status = Number(error?.status);
  return {
    status: Number.isFinite(status) && status > 0 ? status : null,
    apiStatus: String(error?.apiStatus || ""),
    reason: String(error?.reason || ""),
    message: status ? `HTTP ${status}: ${message}` : message,
  };
}

export async function listClassroomAssignments({ staff = false } = {}) {
  const courses = await listAllPages("courses", { courseStates: "ACTIVE" }, "courses");
  const settled = await mapSettled(courses, async (course) => {
    const work = await listAllPages(
      `courses/${encodeURIComponent(course.id)}/courseWork`,
      {
        courseWorkStates: staff ? undefined : "PUBLISHED",
        orderBy: "dueDate asc,updateTime desc",
      },
      "courseWork",
    );
    return work.map((item) => normalizeClassroomAssignment(item, course));
  });
  const assignments = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const failedCourses = settled.flatMap((result, index) => {
    if (result.status !== "rejected") return [];
    const course = courses[index];
    return [{
      courseId: String(course.id),
      courseName: course.name || String(course.id),
      ...describeCourseError(result.reason),
    }];
  });

  return {
    courses,
    failedCourses,
    failedCourseCount: failedCourses.length,
    skippedCourseCount: 0,
    assignments: assignments.sort((a, b) => {
      const dueAtA = `${a.date || "9999-12-31"}T${a.time || "23:59"}`;
      const dueAtB = `${b.date || "9999-12-31"}T${b.time || "23:59"}`;
      return dueAtA.localeCompare(dueAtB);
    }),
  };
}

function normalizeClassroomAssignment(item, course) {
  const dueDate = item.dueDate;
  const date =
    dueDate?.year && dueDate?.month && dueDate?.day
      ? `${String(dueDate.year).padStart(4, "0")}-${String(dueDate.month).padStart(2, "0")}-${String(dueDate.day).padStart(2, "0")}`
      : "";
  const time =
    item.dueTime?.hours !== undefined
      ? `${String(item.dueTime.hours).padStart(2, "0")}:${String(item.dueTime.minutes || 0).padStart(2, "0")}`
      : date
        ? "23:59"
        : "";
  const details = [
    item.description,
    item.alternateLink ? `Abrir en Google Classroom: ${item.alternateLink}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    id: `classroom:${course.id}:${item.id}`,
    source: "google_classroom",
    externalId: `${course.id}:${item.id}`,
    title: item.title || "Actividad de Google Classroom",
    subject: course.name || "Google Classroom",
    date,
    time,
    priority: "Media",
    reminder: "30 minutos antes",
    description: details,
    classroomUrl: item.alternateLink || `https://classroom.google.com/c/${course.id}`,
    courseId: String(course.id),
    courseName: course.name || "Google Classroom",
  };
}

export function disconnectGoogleClassroom() {
  const google = getGoogleApi();
  if (accessToken && google?.accounts?.oauth2?.revoke) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  expiresAt = 0;
  tokenClient = null;
}
