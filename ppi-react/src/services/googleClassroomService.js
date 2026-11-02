const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
const COURSES_SCOPE = "https://www.googleapis.com/auth/classroom.courses.readonly";
const STUDENT_WORK_SCOPE = "https://www.googleapis.com/auth/classroom.coursework.me.readonly";
const STAFF_WORK_SCOPE = "https://www.googleapis.com/auth/classroom.coursework.students.readonly";
const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const SCRIPT_LOAD_TIMEOUT_MS = 15_000;
const OAUTH_TIMEOUT_MS = 60_000;

let scriptPromise = null;
let tokenClient = null;
let accessToken = null;
let expiresAt = 0;
let sessionStaff = null;
const SESSION_STORAGE_KEY = "recordate.google-classroom.session.v1";

function getSessionStorage() {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  accessToken = null;
  expiresAt = 0;
  sessionStaff = null;
  try {
    getSessionStorage()?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage may be unavailable; the in-memory session is still cleared.
  }
}

function persistSession(staff) {
  sessionStaff = Boolean(staff);
  try {
    getSessionStorage()?.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ version: 1, token: accessToken, expiresAt, staff: sessionStaff }),
    );
  } catch {
    // Keep the current in-memory session if browser storage is unavailable.
  }
}

export function restoreGoogleClassroomSession() {
  const storage = getSessionStorage();
  if (!storage || !isGoogleClassroomConfigured) return null;
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const savedExpiresAt = Number(saved?.expiresAt);
    if (
      saved?.version !== 1 ||
      typeof saved.token !== "string" ||
      !saved.token ||
      !Number.isFinite(savedExpiresAt) ||
      savedExpiresAt <= Date.now() ||
      typeof saved.staff !== "boolean"
    ) {
      clearStoredSession();
      return null;
    }
    accessToken = saved.token;
    expiresAt = savedExpiresAt;
    sessionStaff = saved.staff;
    return { staff: sessionStaff, expiresAt };
  } catch {
    clearStoredSession();
    return null;
  }
}

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
    let settled = false;
    let timeoutId;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
      if (error) reject(error);
      else resolve();
    };
    const handleLoad = () =>
      getGoogleApi()?.accounts?.oauth2
        ? finish()
        : finish(new Error("Google Identity Services no está disponible."));
    const handleError = () =>
      finish(new Error("No se pudo cargar Google Identity Services."));
    timeoutId = window.setTimeout(
      () => finish(new Error("Google Identity Services tardó más de 15 segundos en cargar. Revisa tu conexión o el bloqueador del navegador y vuelve a intentar.")),
      SCRIPT_LOAD_TIMEOUT_MS,
    );
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    script.async = true;
    script.defer = true;
    script.src = GOOGLE_SCRIPT;
    if (!existing) document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

export function prepareGoogleClassroom() {
  if (!isGoogleClassroomConfigured) return Promise.resolve(false);
  return loadGoogleIdentityScript().then(() => true);
}

export function connectGoogleClassroom({ staff = false, selectAccount = true } = {}) {
  if (!isGoogleClassroomConfigured) {
    return Promise.reject(new Error("Configura VITE_GOOGLE_CLIENT_ID para habilitar Google Classroom."));
  }
  if (!getGoogleApi()?.accounts?.oauth2) {
    return loadGoogleIdentityScript().then(() => {
      throw new Error("Google Identity Services ya está listo. Pulsa de nuevo para abrir la autorización de forma segura.");
    });
  }
  const google = getGoogleApi();
  return new Promise((resolve, reject) => {
    const scope = [COURSES_SCOPE, staff ? STAFF_WORK_SCOPE : STUDENT_WORK_SCOPE].join(" ");
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      tokenClient = null;
      reject(new Error("Google no respondió en 60 segundos. Revisa si el navegador bloqueó la ventana de autorización y vuelve a intentar."));
    }, OAUTH_TIMEOUT_MS);
    const finish = (callback, value) => {
      if (settled) return false;
      settled = true;
      window.clearTimeout(timeoutId);
      callback(value);
      return true;
    };
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope,
        callback: (response) => {
          if (settled) {
            if (response?.access_token) {
              google.accounts.oauth2.revoke?.(response.access_token, () => {});
            }
            return;
          }
          if (response?.error || !response?.access_token) {
            finish(reject, new Error(response?.error_description || "Google no concedió acceso a Classroom."));
            return;
          }
          accessToken = response.access_token;
          expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
          persistSession(staff);
          finish(resolve, { token: accessToken, scope: response.scope || scope });
        },
        error_callback: (error) =>
          finish(reject, new Error(error?.message || "No se pudo abrir el consentimiento de Google.")),
      });
      const prompt = selectAccount ? "select_account consent" : accessToken ? "" : "consent";
      tokenClient.requestAccessToken({ prompt });
    } catch (error) {
      finish(reject, error instanceof Error ? error : new Error("No se pudo abrir el consentimiento de Google."));
    }
  });
}

function requireToken() {
  if (!accessToken) restoreGoogleClassroomSession();
  if (!accessToken || Date.now() >= expiresAt) {
    clearStoredSession();
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
    if (response.status === 401) clearStoredSession();
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
    try {
      google.accounts.oauth2.revoke(accessToken, () => {});
    } catch {
      // Always clear the local session, even if Google's revocation request fails.
    }
  }
  clearStoredSession();
  tokenClient = null;
}
