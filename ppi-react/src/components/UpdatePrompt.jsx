/* global __BUILD_ID__ */
// Aviso de versión nueva: GitHub Pages sirve el HTML con caché de 10 minutos,
// así que una pestaña abierta puede seguir usando el paquete anterior. Este
// componente consulta version.json (sin caché) y ofrece recargar.
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

const BUILD_ID = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";
const CHECK_INTERVAL_MS = 60 * 1000;

function versionUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/version.json`;
}

async function isOutdated() {
  if (BUILD_ID === "dev") return false;
  try {
    const response = await fetch(`${versionUrl()}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data?.id && data.id !== BUILD_ID);
  } catch {
    // Sin red o sin archivo de versión: no molestamos al usuario.
    return false;
  }
}

export default function UpdatePrompt() {
  const { t } = useI18n();
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    if (BUILD_ID === "dev") return undefined;
    let active = true;
    const check = () => {
      void isOutdated().then((stale) => {
        if (active && stale) setOutdated(true);
      });
    };
    check();
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    window.addEventListener("focus", check);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!outdated) return null;

  const reload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(Date.now()));
    window.location.replace(url.toString());
  };

  return (
    <div className="update-banner" role="status">
      <span>{t("core.updateAvailable")}</span>
      <button className="outline-button" type="button" onClick={reload}>
        {t("core.updateReload")}
      </button>
    </div>
  );
}