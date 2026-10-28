// @ts-nocheck
import { useState } from "react";
import { BookOpen, ExternalLink, GraduationCap, Import, LogOut, RefreshCw } from "lucide-react";
import {
  connectGoogleClassroom,
  disconnectGoogleClassroom,
  isGoogleClassroomConfigured,
  listClassroomAssignments,
} from "../services/googleClassroomService";

export default function GoogleClassroomPanel({ profile, tasks, onImport, demo = false }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  const isImported = (assignment) => tasks.some(
    (task) => task.source === "google_classroom" && task.externalId === assignment.externalId,
  );

  const connect = async () => {
    if (demo) {
      setError("Google Classroom no está disponible en la demostración local.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await connectGoogleClassroom({ staff: ["profesor", "administrador"].includes(profile?.role) });
      const result = await listClassroomAssignments({ staff: ["profesor", "administrador"].includes(profile?.role) });
      setCourses(result.courses || []);
      setAssignments(result.assignments || []);
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
    try {
      const result = await listClassroomAssignments({ staff: ["profesor", "administrador"].includes(profile?.role) });
      setCourses(result.courses || []);
      setAssignments(result.assignments || []);
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
  };

  return (
    <section className="panel-view classroom-view">
      <span className="eyebrow accent-label">Servicios conectados</span>
      <h2>Google Classroom</h2>
      <p className="panel-intro">
        Consulta tus cursos y trae actividades con fecha a RECORDATE. Solo se solicitan permisos de lectura y el token de Google se mantiene en memoria, no en Supabase.
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
            <button className="primary-button" type="button" onClick={connect} disabled={loading}>
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
                <div>
                  <span className="eyebrow">{assignment.courseName}</span>
                  <h3>{assignment.title}</h3>
                  <p>{assignment.date} · {assignment.time}</p>
                </div>
                <div className="classroom-item-actions">
                  <a className="text-button" href={assignment.classroomUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={14} /> Ver
                  </a>
                  <button className="outline-button" type="button" disabled={isImported(assignment)} onClick={() => onImport(assignment)}>
                    <Import size={14} /> {isImported(assignment) ? "Agregada" : "Agregar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <p className="classroom-note">Google puede mostrar “app no verificada” mientras el proyecto OAuth está en prueba. Usa cuentas de prueba configuradas en Google Cloud y solicita únicamente scopes de lectura.</p>
    </section>
  );
}
