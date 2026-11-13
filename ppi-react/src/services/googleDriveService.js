const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
// drive.file es un permiso "no sensible": solo da acceso a los archivos que
// RECORDATE crea o que la persona abre desde la app. El permiso amplio
// (auth/drive) es restringido y Google lo bloquea mientras la app no complete
// la verificación y la auditoría de seguridad.
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const PICKER_SCRIPT = "https://apis.google.com/js/api.js";
const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const pickerApiKey = String(import.meta.env.VITE_GOOGLE_API_KEY || "").trim();
const MAX_MULTIPART_UPLOAD_BYTES = 5 * 1024 * 1024;

let scriptPromise = null;
let pickerPromise = null;
let accessToken = null;
let expiresAt = 0;

export const isGoogleDriveConfigured = Boolean(clientId && !clientId.includes("tu_client_id"));
export const isGooglePickerConfigured = Boolean(pickerApiKey && !pickerApiKey.includes("tu_api_key"));

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

export async function connectGoogleDrive() {
  if (!isGoogleDriveConfigured) {
    throw new Error("Configura VITE_GOOGLE_CLIENT_ID para habilitar Google Drive.");
  }
  await loadGoogleIdentityScript();
  const google = getGoogleApi();
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response?.error || !response?.access_token) {
          reject(new Error(response?.error_description || "Google no concedió acceso a Drive."));
          return;
        }
        accessToken = response.access_token;
        expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
        resolve({ scope: response.scope || DRIVE_SCOPE, expiresAt });
      },
      error_callback: (error) =>
        reject(new Error(error?.message || "No se pudo abrir el consentimiento de Google.")),
    });
    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
}

function requireToken() {
  if (!accessToken || Date.now() >= expiresAt) {
    accessToken = null;
    expiresAt = 0;
    throw new Error("La autorización de Google Drive expiró. Vuelve a conectar Drive.");
  }
  return accessToken;
}

function buildDriveQuery(search) {
  const parts = ["trashed = false"];
  const normalized = String(search || "").trim();
  if (normalized) {
    const escaped = normalized.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    parts.push(`(name contains '${escaped}' or fullText contains '${escaped}')`);
  }
  return parts.join(" and ");
}

async function readDriveError(response) {
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    accessToken = null;
    expiresAt = 0;
  }
  const reason = payload?.error?.errors?.[0]?.reason || payload?.error?.status || "";
  const detail = payload?.error?.message || "";
  if (response.status === 403) {
    if (reason === "SERVICE_DISABLED" || /has not been used in project|is disabled/i.test(detail)) {
      throw new Error(
        "La API de Google Drive no está habilitada en el proyecto de Google Cloud. Actívala y vuelve a intentar."
      );
    }
    if (
      reason === "insufficientPermissions" ||
      reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" ||
      /insufficient|scope/i.test(detail)
    ) {
      throw new Error(
        "El permiso concedido no alcanza para esta acción. Desconecta Drive, vuelve a conectarlo y acepta el permiso que muestra Google."
      );
    }
    if (/rate ?limit/i.test(reason) || /rate ?limit/i.test(detail)) {
      throw new Error("Google limitó temporalmente las consultas a Drive. Espera unos segundos y vuelve a intentar.");
    }
    throw new Error(detail ? `Google rechazó la acción: ${detail}` : "Google rechazó el permiso para esta acción.");
  }
  if (response.status === 401) {
    throw new Error("La autorización de Google Drive expiró. Vuelve a conectar Drive.");
  }
  throw new Error(detail || `Google Drive respondió ${response.status}.`);
}

async function driveRequest(
  path,
  { params = {}, method = "GET", body, headers = {}, upload = false } = {}
) {
  const url = new URL(`${upload ? DRIVE_UPLOAD_API : DRIVE_API}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    method,
    credentials: "omit",
    headers: { Authorization: `Bearer ${requireToken()}`, ...headers },
    body,
  });
  if (!response.ok) return readDriveError(response);
  if (response.status === 204) return null;
  return response.json();
}

export async function listDriveFiles({ search = "", pageToken = "" } = {}) {
  const searching = Boolean(String(search || "").trim());
  const payload = await driveRequest("files", {
    params: {
      q: buildDriveQuery(search),
      pageSize: 100,
      pageToken,
      // Google rechaza orderBy cuando la consulta usa fullText: los resultados
      // ya vienen ordenados por relevancia.
      ...(searching ? {} : { orderBy: "folder,name" }),
      fields:
        "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size,owners(displayName,emailAddress))",
    },
  });
  return {
    files: Array.isArray(payload?.files) ? payload.files : [],
    nextPageToken: payload?.nextPageToken || "",
  };
}

const exportMimeTypes = {
  "application/vnd.google-apps.document": "application/pdf",
  "application/vnd.google-apps.spreadsheet":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.google-apps.presentation": "application/pdf",
  "application/vnd.google-apps.drawing": "application/pdf",
};

export async function downloadDriveFile(file) {
  const mimeType = exportMimeTypes[file?.mimeType];
  if (file?.mimeType?.startsWith("application/vnd.google-apps.") && !mimeType) {
    throw new Error("Este tipo de archivo de Google debe abrirse desde Drive.");
  }
  const path = mimeType
    ? `files/${encodeURIComponent(file.id)}/export`
    : `files/${encodeURIComponent(file.id)}`;
  const url = new URL(`${DRIVE_API}/${path}`);
  if (mimeType) url.searchParams.set("mimeType", mimeType);
  else url.searchParams.set("alt", "media");
  const response = await fetch(url, {
    credentials: "omit",
    headers: { Authorization: `Bearer ${requireToken()}` },
  });
  if (!response.ok) return readDriveError(response);
  return {
    blob: await response.blob(),
    filename: file.name || "archivo",
    mimeType: mimeType || file.mimeType || "application/octet-stream",
  };
}

export async function uploadDriveFile(file) {
  if (!file) throw new Error("Selecciona un archivo para subir.");
  const mimeType =
    String(file.type || "application/octet-stream").replace(/[^\w.+/-]/g, "") ||
    "application/octet-stream";
  if (file.size > MAX_MULTIPART_UPLOAD_BYTES) {
    return uploadDriveFileResumable(file, mimeType);
  }
  const boundary = `recordate_${Math.random().toString(16).slice(2)}`;
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: file.name })}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      file,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );
  return driveRequest("files", {
    upload: true,
    method: "POST",
    params: { uploadType: "multipart", fields: "id,name,mimeType,modifiedTime,webViewLink" },
    body,
  });
}

async function uploadDriveFileResumable(file, mimeType) {
  const token = requireToken();
  const startUrl = new URL(`${DRIVE_UPLOAD_API}/files`);
  startUrl.searchParams.set("uploadType", "resumable");
  startUrl.searchParams.set("fields", "id,name,mimeType,modifiedTime,webViewLink");
  const startResponse = await fetch(startUrl, {
    method: "POST",
    credentials: "omit",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
      "X-Upload-Content-Length": String(file.size),
    },
    body: JSON.stringify({ name: file.name }),
  });
  if (!startResponse.ok) return readDriveError(startResponse);
  const uploadUrl = startResponse.headers?.get("Location");
  if (!uploadUrl) throw new Error("Google no devolvió la URL para iniciar la carga del archivo.");
  const sessionUrl = new URL(uploadUrl);
  if (sessionUrl.protocol !== "https:" || !sessionUrl.hostname.endsWith(".googleapis.com")) {
    throw new Error("Google devolvió una URL de carga no válida; no se enviaron tus datos.");
  }
  const uploadResponse = await fetch(sessionUrl, {
    method: "PUT",
    credentials: "omit",
    headers: {
      Authorization: `Bearer ${requireToken()}`,
      "Content-Type": mimeType,
      "Content-Range": `bytes 0-${file.size - 1}/${file.size}`,
    },
    body: file,
  });
  if (!uploadResponse.ok) return readDriveError(uploadResponse);
  return uploadResponse.json();
}

export async function renameDriveFile(fileId, name) {
  const safeName = String(name || "").trim();
  if (!safeName || safeName.length > 255) throw new Error("Escribe un nombre de archivo válido.");
  return driveRequest(`files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    params: { fields: "id,name,mimeType,modifiedTime,webViewLink" },
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: safeName }),
  });
}

export async function trashDriveFile(fileId) {
  return driveRequest(`files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    params: { fields: "id,trashed" },
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
}

export function disconnectGoogleDrive() {
  const google = getGoogleApi();
  if (accessToken && google?.accounts?.oauth2?.revoke) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  expiresAt = 0;
}

function loadPickerScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("El selector de Google no está disponible."));
  if (window.google?.picker) return Promise.resolve();
  if (pickerPromise) return pickerPromise;
  pickerPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PICKER_SCRIPT}"]`);
    const script = existing || document.createElement("script");
    script.async = true;
    script.src = PICKER_SCRIPT;
    script.onload = () => {
      const gapi = window.gapi;
      if (!gapi?.load) {
        reject(new Error("El selector de Google no está disponible."));
        return;
      }
      gapi.load("picker", {
        callback: () => resolve(),
        onerror: () => reject(new Error("El selector de Google no está disponible.")),
      });
    };
    script.onerror = () => reject(new Error("No se pudo cargar el selector de Google."));
    if (!existing) document.head.appendChild(script);
  }).catch((error) => {
    pickerPromise = null;
    throw error;
  });
  return pickerPromise;
}

/**
 * Abre el selector de Google. Al elegir archivos, Google concede a RECORDATE
 * acceso a esos archivos concretos mediante el permiso drive.file, sin que la
 * app pueda leer el resto del Drive.
 */
export async function pickDriveFiles({ multiple = true } = {}) {
  if (!isGooglePickerConfigured) {
    throw new Error("Configura VITE_GOOGLE_API_KEY para elegir archivos de Drive.");
  }
  await loadPickerScript();
  const token = requireToken();
  const picker = window.google?.picker;
  if (!picker) throw new Error("El selector de Google no está disponible.");
  return new Promise((resolve) => {
    const view = new picker.View(picker.ViewId.DOCS);
    if (multiple) view.enableFeature(picker.Feature.MULTISELECT_ENABLED);
    const builder = new picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(pickerApiKey)
      .addView(view)
      .setCallback((data) => {
        if (data?.action === picker.Action.PICKED) {
          resolve((data.docs || []).map((doc) => ({ id: doc.id, name: doc.name })));
        } else if (data?.action === picker.Action.CANCEL) {
          resolve([]);
        }
      });
    const projectNumber = clientId.split("-")[0];
    if (/^\d+$/.test(projectNumber)) builder.setAppId(projectNumber);
    builder.build().setVisible(true);
  });
}
