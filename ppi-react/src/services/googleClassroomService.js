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
    script.onload = () => getGoogleApi()?.accounts?.oauth2 ? resolve() : reject(new Error("Google Identity Services no está disponible."));
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
          reject(new Error(response?.error_description || "Google no concedió acceso a Classroom."));
          return;
        }
        accessToken = response.access_token;
        expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
        resolve({ token: accessToken, scope: response.scope || scope });
      },
      error_callback: (error) => reject(new Error(error?.message || "No se pudo abrir el consentimiento de Google.")),
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
    throw new Error(payload?.error?.message || `Google Classroom respondió ${response.status}.`);
  }
  return payload;
}

async function listAllPages(path, params, field) {
  const items = [];
  let pageToken = "";
  do {
    const payload = await classroomRequest(path, { ...params, pageSize: 100, pageToken });
    items.push(...(Array.isArray(payload[field]) ? payload[field] : []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken && items.length < 250);
  return items;
}

export async function listClassroomAssignments({ staff = false } = {}) {
  const courses = await listAllPages("courses", { courseStates: "ACTIVE" }, "courses");
  const coursesToLoad = courses.slice(0, 30);
  const settled = await Promise.allSettled(
    coursesToLoad.map(async (course) => {
      const work = await listAllPages(`courses/${encodeURIComponent(course.id)}/courseWork`, {
        courseWorkStates: staff ? undefined : "PUBLISHED",
        orderBy: "dueDate asc,updateTime desc",
      }, "courseWork");
      return work.map((item) => normalizeClassroomAssignment(item, course));
    }),
  );
  const assignments = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  return {
    courses,
    failedCourseCount: settled.filter((result) => result.status === "rejected").length,
    skippedCourseCount: Math.max(0, courses.length - coursesToLoad.length),
    assignments: assignments
      .filter((item) => item.date)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
  };
}

function normalizeClassroomAssignment(item, course) {
  const dueDate = item.dueDate;
  const date = dueDate?.year && dueDate?.month && dueDate?.day
    ? `${String(dueDate.year).padStart(4, "0")}-${String(dueDate.month).padStart(2, "0")}-${String(dueDate.day).padStart(2, "0")}`
    : "";
  const dueTime = item.dueTime?.hours !== undefined
    ? `${String(item.dueTime.hours).padStart(2, "0")}:${String(item.dueTime.minutes || 0).padStart(2, "0")}`
    : "23:59";
  const details = [item.description, item.alternateLink ? `Abrir en Google Classroom: ${item.alternateLink}` : ""]
    .filter(Boolean)
    .join("\n\n");
  return {
    id: `classroom:${course.id}:${item.id}`,
    source: "google_classroom",
    externalId: `${course.id}:${item.id}`,
    title: item.title || "Actividad de Google Classroom",
    subject: course.name || "Google Classroom",
    date,
    time: dueTime,
    priority: "Media",
    reminder: "30 minutos antes",
    description: details,
    classroomUrl: item.alternateLink || `https://classroom.google.com/c/${course.id}`,
    courseId: course.id,
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
