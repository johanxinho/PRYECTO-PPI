// @ts-nocheck
import { useMemo, useState } from "react";
import { Search, Shield, UserMinus, UserPlus, Users } from "lucide-react";
import { ROLE_OPTIONS, isAdminRole, roleLabel } from "../dataService";

function UserAvatar({ name = "?", url }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  if (url) {
    return <img className="avatar-image small-avatar" src={url} alt="" referrerPolicy="no-referrer" />;
  }
  return <span className="small-avatar">{initial}</span>;
}

export default function UsersDirectory({
  profile,
  sessionEmail,
  mode = "teacher",
  users,
  loading,
  onAssign,
  onSetStatus,
  onSetRole,
  busyId,
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const admin = mode === "admin" || isAdminRole(profile?.role, sessionEmail);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (users || []).filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (!needle) return true;
      return `${user.full_name} ${user.email} ${roleLabel(user.role)}`.toLowerCase().includes(needle);
    });
  }, [users, query, roleFilter]);

  return (
    <section className="panel-view directory-view">
      <span className="eyebrow accent-label">{admin && mode === "admin" ? "Cuenta administradora" : "Cuenta de profesor"}</span>
      <h2>{mode === "admin" ? "Administración" : "Asignar tareas"}</h2>
      <p className="panel-intro">
        {mode === "admin"
          ? "Desde aquí asignas el rol de profesor o de administrador, y puedes dar de baja cualquier cuenta."
          : "Elige un estudiante y asígnale una actividad. Le aparece en su agenda con la etiqueta Asignada."}
      </p>
      <div className="search-wrap directory-filters" aria-label="Filtros de usuarios">
        <label className="directory-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios"
          />
        </label>
        <select aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="">Todos los roles</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="empty-state loading-state" role="status">
          <span className="loading-spinner" />
          Cargando usuarios...
        </div>
      ) : visible.length ? (
        <ul className="directory-list">
          {visible.map((user) => {
            const disabled = user.status === "baja";
            const working = busyId === user.id;
            return (
              <li className={`directory-card ${disabled ? "is-disabled" : ""}`} key={user.id}>
                <UserAvatar name={user.full_name} url={user.avatar_url} />
                <div className="directory-copy">
                  <strong>{user.full_name}</strong>
                  <small>{user.email}</small>
                  <span className="directory-tags">
                    <span className="demo-tag">{roleLabel(user.role)}</span>
                    <span className={`status-tag ${disabled ? "is-baja" : "is-activo"}`}>
                      {disabled ? "Dada de baja" : "Activa"}
                    </span>
                  </span>
                </div>
                <div className="directory-actions">
                  {mode === "teacher" && !disabled && (
                    <button type="button" className="primary-button" disabled={working} onClick={() => onAssign(user)}>
                      <UserPlus size={14} /> Asignar tarea
                    </button>
                  )}
                  {mode === "admin" && (
                    <>
                      <label className="directory-role">
                        <span className="sr-only">Rol de {user.full_name}</span>
                        <select
                          value={ROLE_OPTIONS.some((item) => item.value === user.role) ? user.role : "estudiante"}
                          disabled={working}
                          onChange={(event) => onSetRole(user, event.target.value)}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      {disabled ? (
                        <button type="button" className="outline-button" disabled={working} onClick={() => onSetStatus(user, "activo")}>
                          <Shield size={14} /> Reactivar
                        </button>
                      ) : (
                        <button type="button" className="outline-button danger-outline" disabled={working} onClick={() => onSetStatus(user, "baja")}>
                          <UserMinus size={14} /> Dar de baja
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-state">
          <Users size={22} />
          <strong>No hay usuarios para mostrar.</strong>
          <p>Cuando un compañero se registre, aparecerá aquí.</p>
        </div>
      )}
    </section>
  );
}
