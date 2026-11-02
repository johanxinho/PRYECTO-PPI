// @ts-nocheck
import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, GraduationCap, Import, LogOut, RefreshCw } from "lucide-react";
import {
  connectGoogleClassroom,
  disconnectGoogleClassroom,
  isGoogleClassroomConfigured,
  listClassroomAssignments,
  prepareGoogleClassroom,
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

export default function GoogleClassroomPanel({ profile, tasks = [], onImport, demo = false }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState("");
  const [alarmOffsets, setAlarmOffsets] = useState({});
  const [manualDeadlines, setManualDeadlines] = useState({});
  const [locallyImported, setLocallyImported] = useState(() => new Set());
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [failedCourses, setFailedCourses] = useState([]);
  const [error, setError] = useState("");
  const [partialWarning, setPartialWarning] = useState("");
  const [accessMode, setAccessMode] = useState(() =>
    ["profesor", "administrador"].includes(profile?.role) ? "staff" : "student",
  );
  const [connectedAccessMode, setConnectedAccessMode] = useState("");

  useEffect(() => {
    if (demo || !isGoogleClassroomConfigured) return;
    void prepareGoogleClassroom().catch(() => {});
  }, [demo]);

  const applyClassroomResult = (result) => {
    const nextCourses = Array.isArray(result.courses) ? result.courses : [];
    const nextAssignments = Array.isArray(result.assignments) ? result.assignments : [];
    const nextFailedCourses = Array.isArray(result.failedCourses) ? result.failedCourses : [];
    setCourses(nextCourses);
    setAssignments(nextAssignments);
    setFailedCourses(nextFailedCourses);

    const details = [];
    const failed = Number(result.failedCourseCount) || nextFailedCourses.length;
    const skipped = Number(result.skippedCourseCount) || 0;
    if (failed) details.push(`${failed} ${failed === 1 ? "curso no se pudo consultar" : "cursos no se pudieron consultar"}`);
    if (skipped) details.push(`${skipped} fuera del límite de consulta`);
    const permissionDenied = nextFailedCourses.filter(
      (failure) => Number(failure.status) === 403 || failure.apiStatus === "PERMISSION_DENIED",
    ).length;
    if (failed && permissionDenied === failed) {
      details.push("Google negó el acceso de lectura; confirma la cuenta y el rol elegidos, y usa Cambiar cuenta o rol para reautorizar");
    }
    setPartialWarning(
      details.length
        ? `Carga parcial: ${details.join("; ")}. Revisa el motivo en cada materia y vuelve a actualizar.`
        : "",
    );
  };

  const isImported = (assignment) =>
    locallyImported.has(assignment.externalId) ||
    tasks.some(
      (task) => task.source === "google_classroom" && task.externalId === assignment.externalId,
    );
  const alarmOffsetFor = (assignment) => alarmOffsets[assignment.externalId] || "30 minutos antes";
  const manualDeadlineFor = (assignment) => {
    const deadline = manualDeadlines[assignment.externalId] || {};
    return { date: deadline.date || "", time: deadline.time || "" };
  };

  const connect = async ({ selectAccount = true } = {}) => {
    if (demo) {
      setError("Google Classroom no está disponible en la demostración local.");
      return;
    }
    setLoading(true);
    setError("");
    setPartialWarning("");
    try {
      const staff = accessMode === "staff";
      await connectGoogleClassroom({ staff, selectAccount });
      const result = await listClassroomAssignments({ staff });
      applyClassroomResult(result);
      setConnectedAccessMode(accessMode);
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
      const result = await listClassroomAssignments({ staff: connectedAccessMode === "staff" });
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
    setFailedCourses([]);
    setConnectedAccessMode("");
    setError("");
    setPartialWarning("");
  };

  const reconnect = async () => {
    disconnectGoogleClassroom();
    setConnected(false);
    setAssignments([]);
    setCourses([]);
    setFailedCourses([]);
    setConnectedAccessMode("");
    setError("");
    setPartialWarning("");
    await connect({ selectAccount: true });
  };

  const setManualDeadline = (assignment, field, value) => {
    setManualDeadlines((current) => ({
      ...current,
      [assignment.externalId]: {
        ...current[assignment.externalId],
        [field]: value,
      },
    }));
  };

  const addAlarm = async (assignment) => {
    const manualDeadline = manualDeadlineFor(assignment);
    if (!assignment.date && (!manualDeadline.date || !manualDeadline.time)) {
      setError("Elige una fecha y una hora para crear la tarea y su alarma en RECORDATE.");
      return;
    }

    const assignmentToImport = assignment.date
      ? assignment
      : { ...assignment, date: manualDeadline.date, time: manualDeadline.time };
    setImportingId(assignment.externalId);
    setError("");
    try {
      const imported = await onImport(assignmentToImport, alarmOffsetFor(assignment));
      if (imported === false) {
        setError("No se agregó la actividad. Revisa el aviso de RECORDATE e inténtalo de nuevo.");
      } else {
        setLocallyImported((current) => new Set(current).add(assignment.externalId));
      }
    } catch (cause) {
      setError(cause?.message || "No se pudo agregar la actividad a RECORDATE.");
    } finally {
      setImportingId("");
    }
  };

  const assignmentsByCourse = new Map();
  assignments.forEach((assignment) => {
    const courseId = String(assignment.courseId || "");
    const grouped = assignmentsByCourse.get(courseId) || [];
    grouped.push(assignment);
    assignmentsByCourse.set(courseId, grouped);
  });
  const errorsByCourse = new Map(failedCourses.map((failure) => [String(failure.courseId), failure]));

  const renderAssignment = (assignment) => {
    const imported = isImported(assignment);
    const manualDeadline = manualDeadlineFor(assignment);
    const needsDeadline = !assignment.date;
    const cannotImportYet = needsDeadline && (!manualDeadline.date || !manualDeadline.time);
    const isImporting = importingId === assignment.externalId;

    return (
      <article className="classroom-item" key={assignment.id}>
        <div className="classroom-item-details">
          <h4>{assignment.title}</h4>
          <p>{assignment.date ? `${assignment.date} · ${assignment.time}` : "Sin fecha de entrega en Google Classroom."}</p>
          {assignment.description && <p className="classroom-assignment-description">{assignment.description}</p>}
        </div>
        <div className="classroom-item-actions">
          <a className="text-button" href={assignment.classroomUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> Ver
          </a>
          {needsDeadline && (
            <div className="classroom-deadline-fields">
              <label>
                <span>Fecha para RECORDATE</span>
                <input
                  type="date"
                  aria-label={`Fecha para RECORDATE: ${assignment.title}`}
                  value={manualDeadline.date}
                  onChange={(event) => setManualDeadline(assignment, "date", event.target.value)}
                  disabled={imported || isImporting}
                />
              </label>
              <label>
                <span>Hora para la alarma</span>
                <input
                  type="time"
                  aria-label={`Hora para la alarma: ${assignment.title}`}
                  value={manualDeadline.time}
                  onChange={(event) => setManualDeadline(assignment, "time", event.target.value)}
                  disabled={imported || isImporting}
                />
              </label>
            </div>
          )}
          <label className="classroom-alarm-select">
            <span>Recordatorio</span>
            <select
              aria-label={`Anticipación de alarma para ${assignment.title}`}
              value={alarmOffsetFor(assignment)}
              onChange={(event) => setAlarmOffsets((current) => ({ ...current, [assignment.externalId]: event.target.value }))}
              disabled={imported || isImporting}
            >
              {alarmOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button
            className="outline-button"
            type="button"
            disabled={imported || isImporting || cannotImportYet}
            onClick={() => addAlarm(assignment)}
          >
            <Import size={14} />
            {imported ? "Agregada" : isImporting ? "Agregando..." : "Agregar tarea y alarma"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="panel-view classroom-view">
      <span className="eyebrow accent-label">Servicios conectados</span>
      <h2>Google Classroom</h2>
      <p className="panel-intro">
        Consulta las tareas publicadas por materia y agrégalas a RECORDATE. Las tareas sin fecha también se muestran; para crearles una alarma, elige fecha y hora.
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
              <button className="outline-button" type="button" onClick={refresh} disabled={loading || accessMode !== connectedAccessMode}>
                <RefreshCw size={16} /> {loading ? "Actualizando..." : "Actualizar cursos"}
              </button>
              <button className="outline-button" type="button" onClick={reconnect} disabled={loading}>
                <BookOpen size={16} /> Cambiar cuenta o rol
              </button>
              <button className="text-button" type="button" onClick={disconnect} disabled={loading}><LogOut size={15} /> Desconectar</button>
            </>
          )}
        </div>
      )}
      {isGoogleClassroomConfigured && (
        <div className="classroom-access-control">
          <label>
            <span>Rol de esta cuenta en Google Classroom</span>
            <select
              aria-label="Rol de esta cuenta en Google Classroom"
              value={accessMode}
              onChange={(event) => setAccessMode(event.target.value)}
              disabled={loading || demo}
            >
              <option value="student">Estudiante</option>
              <option value="staff">Docente o administrador</option>
            </select>
          </label>
          <p>Selecciona el rol real de la cuenta de Google y, al conectar, elige la cuenta inscrita en estos cursos. RECORDATE solo pide acceso de lectura.</p>
          {connected && (
            <small>Conexión autorizada como {connectedAccessMode === "staff" ? "docente o administrador" : "estudiante"}.</small>
          )}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {partialWarning && <p className="classroom-warning" role="status">{partialWarning}</p>}
      {connected && accessMode !== connectedAccessMode && (
        <p className="classroom-warning" role="status">Cambiaste el rol. Pulsa «Cambiar cuenta o rol» para solicitar el permiso de lectura correspondiente y elegir la cuenta de Google.</p>
      )}
      {connected && (
        <>
          <div className="classroom-summary">
            <span><b>{courses.length}</b> cursos activos</span>
            <span><b>{assignments.length}</b> tareas publicadas</span>
          </div>
          {!courses.length && !loading && <p className="empty-copy">No se encontraron cursos activos en esta cuenta de Google.</p>}
          <div className="classroom-list">
            {courses.map((course) => {
              const courseId = String(course.id);
              const courseAssignments = assignmentsByCourse.get(courseId) || [];
              const courseError = errorsByCourse.get(courseId);
              return (
                <section className="classroom-course" key={courseId}>
                  <header className="classroom-course-heading">
                    <h3>{course.name || courseId}</h3>
                    <span>{courseAssignments.length} {courseAssignments.length === 1 ? "tarea" : "tareas"}</span>
                  </header>
                  {courseError && (
                    <p className="classroom-course-error">
                      No se pudieron cargar las tareas: {courseError.message || (courseError.status ? `HTTP ${courseError.status}` : "error de lectura sin detalle")}
                    </p>
                  )}
                  {!courseError && !courseAssignments.length && !loading && (
                    <p className="classroom-course-empty">No hay tareas publicadas en esta materia.</p>
                  )}
                  {courseAssignments.map(renderAssignment)}
                </section>
              );
            })}
          </div>
        </>
      )}
      <p className="classroom-note">La alarma sonora requiere RECORDATE abierta y los ajustes de Recordatorios/Alarmas activados. Las notificaciones del sistema dependen de los permisos del navegador y del teléfono; para avisar con la app cerrada todavía se requiere un emisor Web Push en Supabase.</p>
    </section>
  );
}
