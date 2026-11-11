// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nProvider";
import { BookOpen, ExternalLink, GraduationCap, Import, LogOut, RefreshCw } from "lucide-react";
import {
  connectGoogleClassroom,
  disconnectGoogleClassroom,
  isGoogleClassroomConfigured,
  listClassroomAssignments,
  prepareGoogleClassroom,
  restoreGoogleClassroomSession,
} from "../services/googleClassroomService";



export default function GoogleClassroomPanel({ profile, tasks = [], onImport, demo = false }) {
  const { t } = useI18n();
  const alarmOptions = [t("integrations.classroom.alarm.now"), t("integrations.classroom.alarm.5m"), t("integrations.classroom.alarm.10m"), t("integrations.classroom.alarm.30m"), t("integrations.classroom.alarm.1h"), t("integrations.classroom.alarm.3h"), t("integrations.classroom.alarm.12h"), t("integrations.classroom.alarm.1d")];
  const [restoredSession] = useState(() => (demo ? null : restoreGoogleClassroomSession()));
  const [connected, setConnected] = useState(() => Boolean(restoredSession));
  const [loading, setLoading] = useState(() => Boolean(restoredSession));
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
    restoredSession
      ? restoredSession.staff ? "staff" : "student"
      : ["profesor", "administrador"].includes(profile?.role) ? "staff" : "student",
  );
  const [connectedAccessMode, setConnectedAccessMode] = useState(() =>
    restoredSession ? restoredSession.staff ? "staff" : "student" : "",
  );

  const applyClassroomResult = useCallback((result) => {
    const nextCourses = Array.isArray(result.courses) ? result.courses : [];
    const nextAssignments = Array.isArray(result.assignments) ? result.assignments : [];
    const nextFailedCourses = Array.isArray(result.failedCourses) ? result.failedCourses : [];
    setCourses(nextCourses);
    setAssignments(nextAssignments);
    setFailedCourses(nextFailedCourses);

    const details = [];
    const failed = Number(result.failedCourseCount) || nextFailedCourses.length;
    const skipped = Number(result.skippedCourseCount) || 0;
    if (failed) details.push(t("integrations.classroom.failedCourses", { count: failed }));
    if (skipped) details.push(t("integrations.classroom.skippedCourses", { count: skipped }));
    const permissionDenied = nextFailedCourses.filter(
      (failure) => Number(failure.status) === 403 || failure.apiStatus === "PERMISSION_DENIED",
    ).length;
    if (failed && permissionDenied === failed) {
      details.push(t("integrations.classroom.permissionDenied"));
    }
    const summary = details.map((detail) => detail.replace(/[.!?]+$/, "")).join("; ");
    setPartialWarning(
      details.length
        ? `${t("integrations.classroom.partialPrefix")} ${summary}. ${t("integrations.classroom.partialSuffix")}`
        : "",
    );
  }, [t]);

  const localizedApiError = (cause, fallback) => {
    const status = Number(cause?.status) || 0;
    if (status === 403 || cause?.apiStatus === "PERMISSION_DENIED") return t("integrations.classroom.permissionDenied");
    if (status === 401) return t("integrations.classroom.authorizationExpired");
    if (status === 429) return t("integrations.classroom.rateLimited");
    return status ? t("integrations.classroom.requestFailed", { status }) : fallback;
  };

  const handleSessionFailure = useCallback((cause, fallback) => {
    setError(localizedApiError(cause, fallback));
    if (cause?.status === 401 || /expiró/i.test(cause?.message || "")) {
      disconnectGoogleClassroom();
      setConnected(false);
      setConnectedAccessMode("");
    }
  }, [t]);

  useEffect(() => {
    if (demo || !isGoogleClassroomConfigured) return;
    let active = true;
    void prepareGoogleClassroom().catch(() => {});
    if (restoredSession) {
      void listClassroomAssignments({ staff: restoredSession.staff })
        .then((result) => {
          if (!active) return;
          applyClassroomResult(result);
          setConnected(true);
        })
        .catch((cause) => {
          if (active) handleSessionFailure(cause, t("integrations.classroom.restoreError"));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [demo, restoredSession, applyClassroomResult, handleSessionFailure]);

  const isImported = (assignment) =>
    locallyImported.has(assignment.externalId) ||
    tasks.some(
      (task) => task.source === "google_classroom" && task.externalId === assignment.externalId,
    );
  const alarmOffsetFor = (assignment) => alarmOffsets[assignment.externalId] || t("integrations.classroom.alarm.30m");
  const manualDeadlineFor = (assignment) => {
    const deadline = manualDeadlines[assignment.externalId] || {};
    return { date: deadline.date || "", time: deadline.time || "" };
  };

  const connect = async ({ selectAccount = true } = {}) => {
    if (demo) {
      setError(t("integrations.classroom.demoUnavailable"));
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
      setError(localizedApiError(cause, t("integrations.classroom.connectError")));
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
      handleSessionFailure(cause, t("integrations.classroom.refreshError"));
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
      setError(t("integrations.classroom.deadlineRequired"));
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
        setError(t("integrations.classroom.importRejected"));
      } else {
        setLocallyImported((current) => new Set(current).add(assignment.externalId));
      }
    } catch (cause) {
      setError(cause?.message || t("integrations.classroom.importError"));
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
          <p>{assignment.date ? `${assignment.date} · ${assignment.time}` : t("integrations.classroom.noDueDate")}</p>
          {assignment.description && <p className="classroom-assignment-description">{assignment.description}</p>}
        </div>
        <div className="classroom-item-actions">
          <a className="text-button" href={assignment.classroomUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> {t("integrations.classroom.view")}
          </a>
          {needsDeadline && (
            <div className="classroom-deadline-fields">
              <label>
                <span>{t("integrations.classroom.dateForRecordate")}</span>
                <input
                  type="date"
                  aria-label={t("integrations.classroom.dateAria", { title: assignment.title })}
                  value={manualDeadline.date}
                  onChange={(event) => setManualDeadline(assignment, "date", event.target.value)}
                  disabled={imported || isImporting}
                />
              </label>
              <label>
                <span>{t("integrations.classroom.alarmTime")}</span>
                <input
                  type="time"
                  aria-label={t("integrations.classroom.timeAria", { title: assignment.title })}
                  value={manualDeadline.time}
                  onChange={(event) => setManualDeadline(assignment, "time", event.target.value)}
                  disabled={imported || isImporting}
                />
              </label>
            </div>
          )}
          <label className="classroom-alarm-select">
            <span>{t("integrations.classroom.reminder")}</span>
            <select
              aria-label={t("integrations.classroom.alarmOffsetAria", { title: assignment.title })}
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
            {imported ? t("integrations.classroom.added") : isImporting ? t("integrations.classroom.adding") : t("integrations.classroom.addTaskAlarm")}
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="panel-view classroom-view">
      <span className="eyebrow accent-label">{t("integrations.common.connectedServices")}</span>
      <h2 translate="no">Google Classroom</h2>
      <p className="panel-intro">
        {t("integrations.classroom.intro")}
      </p>
      {!isGoogleClassroomConfigured ? (
        <div className="classroom-setup">
          <GraduationCap size={26} />
          <div>
            <strong>{t("integrations.common.missingClientId")}</strong>
            <p>{t("integrations.classroom.setupDetails")}</p>
          </div>
        </div>
      ) : (
        <div className="classroom-actions">
          {!connected ? (
            <button className="primary-button" type="button" onClick={connect} disabled={loading || demo}>
              <BookOpen size={16} /> {loading ? t("integrations.common.connecting") : t("integrations.classroom.connect")}
            </button>
          ) : (
            <>
              <button className="outline-button" type="button" onClick={refresh} disabled={loading || accessMode !== connectedAccessMode}>
                <RefreshCw size={16} /> {loading ? t("integrations.common.updating") : t("integrations.classroom.refresh")}
              </button>
              <button className="outline-button" type="button" onClick={reconnect} disabled={loading}>
                <BookOpen size={16} /> {t("integrations.classroom.changeAccountRole")}
              </button>
              <button className="text-button" type="button" onClick={disconnect} disabled={loading}><LogOut size={15} /> {t("integrations.common.disconnect")}</button>
            </>
          )}
        </div>
      )}
      {isGoogleClassroomConfigured && (
        <div className="classroom-access-control">
          <label>
            <span>{t("integrations.classroom.accountRole")}</span>
            <select
              aria-label={t("integrations.classroom.accountRole")}
              value={accessMode}
              onChange={(event) => setAccessMode(event.target.value)}
              disabled={loading || demo}
            >
              <option value="student">{t("integrations.classroom.student")}</option>
              <option value="staff">{t("integrations.classroom.staff")}</option>
            </select>
          </label>
          <p>{t("integrations.classroom.roleInfo")}</p>
          {connected && (
            <small>{t("integrations.classroom.authorizedAs", { role: connectedAccessMode === "staff" ? t("integrations.classroom.staff") : t("integrations.classroom.student") })}</small>
          )}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {partialWarning && <p className="classroom-warning" role="status">{partialWarning}</p>}
      {connected && accessMode !== connectedAccessMode && (
        <p className="classroom-warning" role="status">{t("integrations.classroom.roleChanged")}</p>
      )}
      {connected && (
        <>
          <div className="classroom-summary">
            <span><b>{courses.length}</b> {t("integrations.classroom.coursesActive", { count: courses.length })}</span>
            <span><b>{assignments.length}</b> {t("integrations.classroom.assignmentsPublished", { count: assignments.length })}</span>
          </div>
          {!courses.length && !loading && <p className="empty-copy">{t("integrations.classroom.noCourses")}</p>}
          <div className="classroom-list">
            {courses.map((course) => {
              const courseId = String(course.id);
              const courseAssignments = assignmentsByCourse.get(courseId) || [];
              const courseError = errorsByCourse.get(courseId);
              return (
                <section className="classroom-course" key={courseId}>
                  <header className="classroom-course-heading">
                    <h3>{course.name || courseId}</h3>
                    <span>{t("integrations.classroom.courseAssignments", { count: courseAssignments.length })}</span>
                  </header>
                  {courseError && (
                    <p className="classroom-course-error">
                      {t("integrations.classroom.courseLoadError", { reason: localizedApiError(courseError, t("integrations.classroom.unknownReadError")) })}
                    </p>
                  )}
                  {!courseError && !courseAssignments.length && !loading && (
                    <p className="classroom-course-empty">{t("integrations.classroom.noAssignments")}</p>
                  )}
                  {courseAssignments.map(renderAssignment)}
                </section>
              );
            })}
          </div>
        </>
      )}
      <p className="classroom-note">{t("integrations.classroom.note")}</p>
    </section>
  );
}
