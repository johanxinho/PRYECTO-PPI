// @ts-nocheck
import { useRef, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
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
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date;
}

function fileTypeLabel(file) {
  if (file.mimeType === "application/vnd.google-apps.folder") return "integrations.drive.folder";
  if (file.mimeType?.startsWith("application/vnd.google-apps.")) return "integrations.drive.googleDoc";
  return file.mimeType || "integrations.drive.file";
}

export default function GoogleDrivePanel({ demo = false }) {
  const { t, lang } = useI18n();
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
      setError(t("integrations.drive.demoUnavailable"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await connectGoogleDrive();
      setConnected(true);
      await loadFiles({ query: search.trim(), pageToken: "" });
    } catch (cause) {
      setError(cause?.message || t("integrations.drive.connectError"));
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
      setError(cause?.message || t("integrations.drive.refreshError"));
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
      setError(cause?.message || t("integrations.drive.searchError"));
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
      setError(cause?.message || t("integrations.drive.loadMoreError"));
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
      setError(cause?.message || t("integrations.drive.uploadError"));
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
      setError(cause?.message || t("integrations.drive.downloadError"));
    } finally {
      setBusyFileId("");
    }
  };

  const rename = async (file) => {
    const name = window.prompt(t("integrations.drive.newFileName"), file.name);
    if (name === null || !name.trim() || name.trim() === file.name) return;
    setBusyFileId(file.id);
    setError("");
    try {
      const updated = await renameDriveFile(file.id, name);
      setFiles((current) =>
        current.map((item) => (item.id === file.id ? { ...item, ...updated } : item))
      );
    } catch (cause) {
      setError(cause?.message || t("integrations.drive.renameError"));
    } finally {
      setBusyFileId("");
    }
  };

  const moveToTrash = async (file) => {
    if (!window.confirm(t("integrations.drive.trashConfirm", { name: file.name }))) return;
    setBusyFileId(file.id);
    setError("");
    try {
      await trashDriveFile(file.id);
      setFiles((current) => current.filter((item) => item.id !== file.id));
    } catch (cause) {
      setError(cause?.message || t("integrations.drive.trashError"));
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
      <span className="eyebrow accent-label">{t("integrations.common.connectedServices")}</span>
      <h2 translate="no">Google Drive</h2>
      <p className="panel-intro">{t("integrations.drive.description")}</p>
      {!isGoogleDriveConfigured ? (
        <div className="classroom-setup">
          <Cloud size={26} />
          <div>
            <strong>{t("integrations.common.missingClientId")}</strong>
            <p>
              {t("integrations.drive.setupDetails")}
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
              <Cloud size={16} /> {loading ? t("integrations.common.connecting") : t("integrations.drive.connect")}
            </button>
          ) : (
            <>
              <button className="outline-button" type="button" onClick={refresh} disabled={loading}>
                <RefreshCw size={16} /> {loading ? t("integrations.common.updating") : t("integrations.drive.refresh")}
              </button>
              <button
                className="outline-button"
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={loading}
              >
                <Upload size={16} /> {t("integrations.drive.upload")}
              </button>
              <input
                ref={fileInput}
                type="file"
                className="drive-file-input"
                aria-label={t("integrations.drive.selectUploadAria")}
                onChange={upload}
                hidden
              />
              <button className="text-button" type="button" onClick={disconnect} disabled={loading}>
                <LogOut size={15} /> {t("integrations.common.disconnect")}
              </button>
            </>
          )}
        </div>
      )}
      {connected && (
        <form className="drive-search" onSubmit={searchFiles}>
          <label htmlFor="drive-search-input">{t("integrations.drive.searchLabel")}</label>
          <div className="drive-search-row">
            <input
              id="drive-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("integrations.drive.searchPlaceholder")}
            />
            <button
              className="outline-button"
              type="submit"
              disabled={loading}
              aria-label={t("integrations.drive.searchAria")}
            >
              <Search size={16} /> {t("integrations.drive.search")}
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
              <b>{files.length}</b> {t("integrations.drive.filesLoaded", { count: files.length })}
            </span>
            <span>{t("integrations.drive.fullPermission")}</span>
          </div>
          <div className="classroom-list">
            {!files.length && !loading && (
              <p className="empty-copy">{t("integrations.drive.noFiles")}</p>
            )}
            {files.map((file) => (
              <article className="classroom-item drive-file" key={file.id}>
                <div className="classroom-item-details">
                  <span className="eyebrow">{t(fileTypeLabel(file))}</span>
                  <h3>{file.name}</h3>
                  <p>{t("integrations.drive.modified")}: {(file.modifiedTime ? new Intl.DateTimeFormat(lang === "es" ? "es-CO" : "en-US", { dateStyle: "medium" }).format(new Date(file.modifiedTime)) : t("integrations.drive.dateUnavailable"))}</p>
                </div>
                <div className="classroom-item-actions drive-file-actions">
                  {file.webViewLink && (
                    <a
                      className="text-button"
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} /> {t("integrations.drive.open")}
                    </a>
                  )}
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => download(file)}
                    disabled={loading || busyFileId === file.id}
                    aria-label={t("integrations.drive.downloadAria", { name: file.name })}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => rename(file)}
                    disabled={loading || busyFileId === file.id}
                    aria-label={t("integrations.drive.renameAria", { name: file.name })}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="outline-button drive-trash-button"
                    type="button"
                    onClick={() => moveToTrash(file)}
                    disabled={loading || busyFileId === file.id}
                    aria-label={t("integrations.drive.trashAria", { name: file.name })}
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
              <FolderOpen size={15} /> {loading ? t("integrations.common.loading") : t("integrations.drive.loadMore")}
            </button>
          )}
        </>
      )}
      <p className="classroom-note">
        {t("integrations.drive.note")}
      </p>
    </section>
  );
}
