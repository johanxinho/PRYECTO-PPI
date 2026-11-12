// @ts-nocheck
import { useMemo, useState } from "react";
import { Search, Shield, UserMinus, UserPlus, Users } from "lucide-react";
import { ROLE_OPTIONS, isAdminRole } from "../dataService";
import { useI18n } from "../i18n";

const roleKeys = {
  estudiante: "student",
  padre: "parent",
  madre: "mother",
  profesor: "teacher",
  trabajador: "staff",
  administrador: "admin",
};

function roleText(role, t) {
  return t(`integrations.users.roles.${roleKeys[role] || "student"}`);
}

function UserAvatar({ name = "?", url }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  if (url) {
    return <img className="avatar-image small-avatar" src={url} alt="" referrerPolicy="no-referrer" />;
  }
  return <span className="small-avatar">{initial}</span>;
}

export default function UsersDirectory({
  profile,
  mode = "teacher",
  users,
  loading,
  onAssign,
  onSetStatus,
  onSetRole,
  busyId,
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const admin = mode === "admin" || isAdminRole(profile?.role);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (users || []).filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (!needle) return true;
      return `${user.full_name} ${user.email} ${roleText(user.role, t)}`.toLowerCase().includes(needle);
    });
  }, [users, query, roleFilter, t]);

  return (
    <section className="panel-view directory-view">
      <span className="eyebrow accent-label">{admin && mode === "admin" ? t("integrations.users.adminAccount") : t("integrations.users.teacherAccount")}</span>
      <h2>{mode === "admin" ? t("integrations.users.administration") : t("integrations.users.assignTasks")}</h2>
      <p className="panel-intro">
        {mode === "admin"
          ? t("integrations.users.adminIntro")
          : t("integrations.users.teacherIntro")}
      </p>
      <div className="search-wrap directory-filters" aria-label={t("integrations.users.filters")}>
        <label className="directory-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("integrations.users.searchPlaceholder")}
            aria-label={t("integrations.users.searchAria")}
          />
        </label>
        <select aria-label={t("integrations.users.filterRole")} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="">{t("integrations.users.allRoles")}</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{roleText(option.value, t)}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="empty-state loading-state" role="status">
          <span className="loading-spinner" />
          {t("integrations.users.loading")}
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
                    <span className="demo-tag">{roleText(user.role, t)}</span>
                    <span className={`status-tag ${disabled ? "is-baja" : "is-activo"}`}>
                      {disabled ? t("integrations.users.deactivated") : t("integrations.users.active")}
                    </span>
                  </span>
                </div>
                <div className="directory-actions">
                  {mode === "teacher" && !disabled && (
                    <button type="button" className="primary-button" disabled={working} onClick={() => onAssign(user)}>
                      <UserPlus size={14} /> {t("integrations.users.assignTask")}
                    </button>
                  )}
                  {mode === "admin" && (
                    <>
                      <label className="directory-role">
                        <span className="sr-only">{t("integrations.users.roleFor", { name: user.full_name })}</span>
                        <select
                          value={ROLE_OPTIONS.some((item) => item.value === user.role) ? user.role : "estudiante"}
                          disabled={working}
                          onChange={(event) => onSetRole(user, event.target.value)}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{roleText(option.value, t)}</option>
                          ))}
                        </select>
                      </label>
                      {disabled ? (
                        <button type="button" className="outline-button" disabled={working} onClick={() => onSetStatus(user, "activo")}>
                          <Shield size={14} /> {t("integrations.users.reactivate")}
                        </button>
                      ) : (
                        <button type="button" className="outline-button danger-outline" disabled={working} onClick={() => onSetStatus(user, "baja")}>
                          <UserMinus size={14} /> {t("integrations.users.deactivate")}
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
          <strong>{t("integrations.users.noUsers")}</strong>
          <p>{t("integrations.users.noUsersHint")}</p>
        </div>
      )}
    </section>
  );
}
