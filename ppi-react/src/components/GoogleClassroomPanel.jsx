// @ts-nocheck
import { useState } from "react";
import { BookOpen, ExternalLink, GraduationCap, Import, LogOut, RefreshCw } from "lucide-react";
import {
  connectGoogleClassroom,
  disconnectGoogleClassroom,
  isGoogleClassroomConfigured,
  listClassroomAssignments,
} from "../services/googleClassroomService";

const alarmOptions = [
  "Al momento",
  "5 minutos antes",
  "10 minutos antes",
  "30 minutos antes",
  "1 hora antes",
  "3 horas antes",
  "12 horas antes",
  "1 día antes",
];

export default function GoogleClassroomPanel({ profile, tasks, onImport, demo = false }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState("");
  const [alarmOffsets, setAlarmOffsets] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [partialWarning, setPartialWarning] = useState("");

  const applyClassroomResult = (result) => {
    setCourses(result.courses || []);
    setAssignments(result.assignments || []);
    const details = [];
    const failed = Number(result.failedCourseCount) || 0;
    const skipped = Number(result.skippedCourseCount) || 0;
    if (failed) details.push(`${failed} ${failed === 1 ? "curso con error" : "cursos con error"}`);
    if (skipped) details.push(`${skipped} fuera del límite de consulta`);
    setPartialWarning(details.length
      ? `Carga parcial (${details.join("; ")}): algunas actividades podrían faltar.`
      : "");
  };

  const isImported = (assignment) => tasks.some(
    (task) => task.source === "google_classroom" && task.externalId === assignment.externalId,
  );
  const alarmOffsetFor = (assignment) => alarmOffsets[assignment.externalId] || "30 minutos antes";

  const connect = async () => {
    if (demo) {
      setError("Google Classroom no está disponible en la demostración local.");
      return;
    }
    setLoading(true);
    setError("");
    setPartialWarning("");
    try {
      await connectGoogleClassroom({ staff: ["profesor", "administrador"].includes(profile?.role) });
      const result = await listClassroomAssignments({ staff: ["profesor", "administrador"].includes(profile?.role) });
      applyClassroomResult(result);
      setConnected(true);
    } catch (cause) {
      setError(cause?.message || "No se pudo conectar con Google Classroom.");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!connected) return connect();
    setLoading(true);
    setError("");
    setPartialWarning("");
    try {
      const result = await listClassroomAssignments({ staff: ["profesor", "administrador"].includes(profile?.role) });
      applyClassroomResult(result);
    } catch (cause) {
      setError(cause?.message || "No se pudieron actualizar las actividades de Classroom.");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    disconnectGoogleClassroom();
    setConnected(false);
    setAssignments([]);
    setCourses([]);
    setError("");
    setPartialWarning("");
  };

  const addAlarm = async (assignment) => {
    setImportingId(assignment.externalId);
    setError("");
    try {
      const imported = await onImport(assignment, alarmOffsetFor(assignment));
      if (imported === false) setError("No se agregó la actividad. Revisa el aviso de RECORDATE e inténtalo de nuevo.");
    } catch (cause) {
      setError(cause?.message || "No se pudo agregar la actividad a RECORDATE.");
    } finally {
      setImportingId("");
    }
  };

  return (
    <section className="panel-view classroom-view">
      <span className="eyebrow accent-label">Servicios conectados</span>
      <h2>Google Classroom</h2>
      <p className="panel-intro">
        Consulta tus cursos y agrega cada actividad con fecha como tarea y alarma en RECORDATE. El token de Google se mantiene en memoria y solo se solicitan permisos de lectura.
      </p>
      {!isGoogleClassroomConfigured ? (
        <div className="classroom-setup">
          <GraduationCap size={26} />
          <div>
            <strong>Falta configurar el Client ID web de Google</strong>
            <p>Define <code>VITE_GOOGLE_CLIENT_ID</code> en el entorno de compilación y agrega el dominio de GitHub Pages como origen autorizado en Google Cloud.</p>
          </div>
        </div>
      ) : (
        <div className="classroom-actions">
          {!connected ? (
            <button className="primary-button" type="button" onClick={connect} disabled={loading || demo}>
              <BookOpen size={16} /> {loading ? "Conectando..." : "Conectar Google Classroom"}
            </button>
          ) : (
            <>
              <button className="outline-button" type="button" onClick={refresh} disabled={loading}>
                <RefreshCw size={16} /> {loading ? "Actualizando..." : "Actualizar cursos"}
              </button>
              <button className="text-button" type="button" onClick={disconnect}><LogOut size={15} /> Desconectar</button>
            </>
          )}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {partialWarning && <p className="classroom-warning" role="status">{partialWarning}</p>}
      {connected && (
        <>
          <div className="classroom-summary">
            <span><b>{courses.length}</b> cursos activos</span>
            <span><b>{assignments.length}</b> actividades con fecha</span>
          </div>
          <div className="classroom-list">
            {!assignments.length && !loading && <p className="empty-copy">No hay actividades publicadas con fecha de entrega.</p>}
            {assignments.map((assignment) => (
              <article className="classroom-item" key={assignment.id}>
                <div className="classroom-item-details">
                  <span className="eyebrow">{assignment.courseName}</span>
                  <h3>{assignment.title}</h3>
                  <p>{assignment.date} · {assignment.time}</p>
                </div>
                <div className="classroom-item-actions">
                  <a className="text-button" href={assignment.classroomUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} /> Ver
                  </a>
                  <label className="classroom-alarm-select">
                    <span>Alarma en RECORDATE</span>
                    <select
                      aria-label={`Anticipación de alarma para ${assignment.title}`}
                      value={alarmOffsetFor(assignment)}
                      onChange={(event) => setAlarmOffsets((current) => ({ ...current, [assignment.externalId]: event.target.value }))}
                      disabled={isImported(assignment) || importingId === assignment.externalId}
                    >
                      {alarmOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <button
                    className="outline-button"
                    type="button"
                    disabled={isImported(assignment) || importingId === assignment.externalId}
                    onClick={() => addAlarm(assignment)}
                  >
                    <Import size={14} />
                    {isImported(assignment) ? "Agregada" : importingId === assignment.externalId ? "Agregando..." : "Agregar alarma"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <p className="classroom-note">La alarma sonora requiere RECORDATE abierta y los ajustes de Recordatorios/Alarmas activados. Las notificaciones del sistema dependen de los permisos del navegador y del teléfono; para avisar con la app cerrada todavía se requiere un emisor Web Push en Supabase.</p>
    </section>
  );
}
