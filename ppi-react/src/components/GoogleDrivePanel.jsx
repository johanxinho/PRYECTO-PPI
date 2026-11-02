// @ts-nocheck
import { useRef, useState } from "react";
import {
  Cloud,
  Download,
  ExternalLink,
  FolderOpen,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  downloadDriveFile,
  isGoogleDriveConfigured,
  listDriveFiles,
  renameDriveFile,
  trashDriveFile,
  uploadDriveFile,
} from "../services/googleDriveService";

function formatModifiedDate(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(date);
}

function fileTypeLabel(file) {
  if (file.mimeType === "application/vnd.google-apps.folder") return "Carpeta";
  if (file.mimeType?.startsWith("application/vnd.google-apps.")) return "Documento de Google";
  return file.mimeType || "Archivo";
}

export default function GoogleDrivePanel({ demo = false }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyFileId, setBusyFileId] = useState("");
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [nextPageToken, setNextPageToken] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const loadFiles = async ({ query = activeQuery, pageToken = "", append = false } = {}) => {
    const result = await listDriveFiles({ search: query, pageToken });
    setFiles((current) => (append ? [...current, ...result.files] : result.files));
    setActiveQuery(query);
    setNextPageToken(result.nextPageToken);
  };

  const connect = async () => {
    if (demo) {
      setError("Google Drive no está disponible en la demostración.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await connectGoogleDrive();
      setConnected(true);
      await loadFiles({ query: search.trim(), pageToken: "" });
    } catch (cause) {
      setError(cause?.message || "No se pudo conectar con Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      await loadFiles({ query: activeQuery, pageToken: "" });
    } catch (cause) {
      setError(cause?.message || "No se pudo actualizar Google Drive.");
      if (/expiró|vuelve a conectar/i.test(cause?.message || "")) setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loadFiles({ query: search.trim(), pageToken: "" });
    } catch (cause) {
      setError(cause?.message || "No se pudo buscar en Google Drive.");
      if (/expiró|vuelve a conectar/i.test(cause?.message || "")) setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextPageToken) return;
    setLoading(true);
    setError("");
    try {
      await loadFiles({ query: activeQuery, pageToken: nextPageToken, append: true });
    } catch (cause) {
      setError(cause?.message || "No se pudieron cargar más archivos.");
    } finally {
      setLoading(false);
    }
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      await uploadDriveFile(file);
      await loadFiles({ query: activeQuery, pageToken: "" });
    } catch (cause) {
      setError(cause?.message || "No se pudo subir el archivo a Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  const download = async (file) => {
    setBusyFileId(file.id);
    setError("");
    try {
      const result = await downloadDriveFile(file);
      const objectUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) {
      setError(cause?.message || "No se pudo descargar el archivo.");
    } finally {
      setBusyFileId("");
    }
  };

  const rename = async (file) => {
    const name = window.prompt("Nuevo nombre del archivo", file.name);
    if (name === null || !name.trim() || name.trim() === file.name) return;
    setBusyFileId(file.id);
    setError("");
    try {
      const updated = await renameDriveFile(file.id, name);
      setFiles((current) =>
        current.map((item) => (item.id === file.id ? { ...item, ...updated } : item))
      );
    } catch (cause) {
      setError(cause?.message || "No se pudo cambiar el nombre del archivo.");
    } finally {
      setBusyFileId("");
    }
  };

  const moveToTrash = async (file) => {
    if (!window.confirm(`¿Mover “${file.name}” a la papelera de Google Drive?`)) return;
    setBusyFileId(file.id);
    setError("");
    try {
      await trashDriveFile(file.id);
      setFiles((current) => current.filter((item) => item.id !== file.id));
    } catch (cause) {
      setError(cause?.message || "No se pudo mover el archivo a la papelera.");
    } finally {
      setBusyFileId("");
    }
  };

  const disconnect = () => {
    disconnectGoogleDrive();
    setConnected(false);
    setFiles([]);
    setNextPageToken("");
    setActiveQuery("");
    setError("");
  };

  return (
    <section className="panel-view classroom-view drive-view">
      <span className="eyebrow accent-label">Servicios conectados</span>
      <h2>Google Drive</h2>
      <p className="panel-intro">
        Busca y abre todos tus archivos, sube archivos nuevos, cambia nombres o muévelos a la
        papelera. Google solicitará el permiso de Drive; el token se mantiene solo en esta pestaña y
        tendrás que volver a conectar cuando expire.
      </p>
      {!isGoogleDriveConfigured ? (
        <div className="classroom-setup">
          <Cloud size={26} />
          <div>
            <strong>Falta configurar el Client ID web de Google</strong>
            <p>
              Define <code>VITE_GOOGLE_CLIENT_ID</code> en el entorno de compilación y autoriza el
              origen de GitHub Pages en Google Cloud.
            </p>
          </div>
        </div>
      ) : (
        <div className="classroom-actions">
          {!connected ? (
            <button
              className="primary-button"
              type="button"
              onClick={connect}
              disabled={loading || demo}
            >
              <Cloud size={16} /> {loading ? "Conectando..." : "Conectar Google Drive"}
            </button>
          ) : (
            <>
              <button className="outline-button" type="button" onClick={refresh} disabled={loading}>
                <RefreshCw size={16} /> {loading ? "Actualizando..." : "Actualizar archivos"}
              </button>
              <button
                className="outline-button"
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={loading}
              >
                <Upload size={16} /> Subir archivo
              </button>
              <input
                ref={fileInput}
                type="file"
                className="drive-file-input"
                aria-label="Seleccionar archivo para subir a Drive"
                onChange={upload}
                hidden
              />
              <button className="text-button" type="button" onClick={disconnect} disabled={loading}>
                <LogOut size={15} /> Desconectar
              </button>
            </>
          )}
        </div>
      )}
      {connected && (
        <form className="drive-search" onSubmit={searchFiles}>
          <label htmlFor="drive-search-input">Buscar en tus archivos de Drive</label>
          <div className="drive-search-row">
            <input
              id="drive-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o contenido del archivo"
            />
            <button
              className="outline-button"
              type="submit"
              disabled={loading}
              aria-label="Buscar archivos"
            >
              <Search size={16} /> Buscar
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {connected && (
        <>
          <div className="classroom-summary">
            <span>
              <b>{files.length}</b> archivos cargados
            </span>
            <span>Permiso completo de Drive</span>
          </div>
          <div className="classroom-list">
            {!files.length && !loading && (
              <p className="empty-copy">No se encontraron archivos para esta búsqueda.</p>
            )}
            {files.map((file) => (
              <article className="classroom-item drive-file" key={file.id}>
                <div className="classroom-item-details">
                  <span className="eyebrow">{fileTypeLabel(file)}</span>
                  <h3>{file.name}</h3>
                  <p>Modificado: {formatModifiedDate(file.modifiedTime)}</p>
                </div>
                <div className="classroom-item-actions drive-file-actions">
                  {file.webViewLink && (
                    <a
                      className="text-button"
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} /> Abrir
                    </a>
                  )}
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => download(file)}
                    disabled={loading || busyFileId === file.id}
                    aria-label={`Descargar ${file.name}`}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => rename(file)}
                    disabled={loading || busyFileId === file.id}
                    aria-label={`Renombrar ${file.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="outline-button drive-trash-button"
                    type="button"
                    onClick={() => moveToTrash(file)}
                    disabled={loading || busyFileId === file.id}
                    aria-label={`Mover ${file.name} a la papelera`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {nextPageToken && (
            <button
              className="outline-button drive-load-more"
              type="button"
              onClick={loadMore}
              disabled={loading}
            >
              <FolderOpen size={15} /> {loading ? "Cargando..." : "Cargar más archivos"}
            </button>
          )}
        </>
      )}
      <p className="classroom-note">
        Google concede a esta conexión capacidad de ver y administrar todos los archivos de Drive.
        La acción de papelera siempre pide confirmación y los archivos pueden restaurarse desde
        Google Drive. Revoca el acceso desde tu cuenta de Google cuando quieras.
      </p>
    </section>
  );
}
