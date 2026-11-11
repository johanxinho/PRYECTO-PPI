// @ts-nocheck
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Brand, LogoMark } from "../Brand";
import LanguageSwitcher from "./LanguageSwitcher";
import { hasSupabaseConfig, supabase } from "../supabaseClient";
import { appBase } from "../paths";
import { useI18n } from "../i18n";

/** Validación simple de correo para formularios de acceso. */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

/** Une mensaje y código de error de Supabase en minúsculas para comparar. */
function errorDetails(error) {
  return `${error?.message || ""} ${error?.code || ""} ${error?.status || ""}`.toLowerCase();
}

/** True si el mensaje es un error (para estilo y role=alert). */
function isErrorMessage(text) {
  return /no (fue|fue posible|encontramos|existe|está)|error|incorrect|inválid|imposible|falla|falló|requiere|coincide|mínimo|escribe|alcanzó|desactiv|expir|revisa spam/i.test(
    text || ""
  );
}

/**
 * Mensajes claros en español para el registro.
 * Evita jerga técnica (SQL, triggers) orientada a administradores.
 */
function signupErrorMessage(error, t) {
  const details = errorDetails(error);
  if (details.includes("already registered") || details.includes("already been registered") || details.includes("user_already_exists")) {
    return t("auth.signup.email_exists");
  }
  if (details.includes("signups not allowed") || details.includes("email signups are disabled")) {
    return t("auth.signup.disabled");
  }
  if (details.includes("invalid email") || details.includes("email_address_invalid")) {
    return t("auth.error.email_invalid");
  }
  if (details.includes("password should be") || details.includes("weak_password") || (details.includes("password") && details.includes("least"))) {
    return t("auth.error.password_weak");
  }
  if (details.includes("database error saving new user") || details.includes("saving new user") || details.includes("profiles") || details.includes("trigger")) {
    return t("auth.signup.profile_failed");
  }
  if (details.includes("rate limit") || details.includes("too many requests") || details.includes("over_email_send_rate_limit")) {
    return t("auth.signup.rate_limited");
  }
  if (details.includes("network") || details.includes("fetch")) {
    return t("auth.error.connection_check");
  }
  return t("auth.signup.failed");
}

/** Errores del inicio de sesión traducidos a español. */
function loginErrorMessage(error, t) {
  const details = errorDetails(error);
  if (details.includes("email not confirmed") || details.includes("email_not_confirmed")) {
    return t("auth.login.confirm_email");
  }
  if (details.includes("invalid login credentials") || details.includes("invalid_credentials")) {
    return t("auth.login.credentials_invalid");
  }
  if (details.includes("user not found")) {
    return t("auth.login.account_missing");
  }
  if (details.includes("too many") || details.includes("rate limit")) {
    return t("auth.error.too_many_attempts");
  }
  if (details.includes("network") || details.includes("fetch")) {
    return t("auth.error.connection_check");
  }
  return t("auth.login.failed");
}

/** Errores del OTP de verificación (código de 6 dígitos). */
function verificationErrorMessage(error, t) {
  const details = errorDetails(error);
  if (details.includes("expired") || details.includes("otp_expired")) {
    return t("auth.verification.expired");
  }
  if (details.includes("invalid") || details.includes("otp_disabled") || details.includes("token")) {
    return t("auth.verification.invalid");
  }
  if (details.includes("rate limit") || details.includes("too many") || details.includes("over_email_send_rate_limit")) {
    return t("auth.verification.rate_limited");
  }
  return t("auth.verification.failed");
}

/** Errores al pedir o actualizar la contraseña. */
function recoveryErrorMessage(error, t) {
  const details = errorDetails(error);
  if (details.includes("rate limit") || details.includes("over_email_send_rate_limit") || details.includes("too many")) {
    return t("auth.recovery.rate_limited");
  }
  if (details.includes("user not found") || details.includes("unable to validate email")) {
    return t("auth.recovery.neutral_message");
  }
  if (details.includes("same_password") || details.includes("should be different")) {
    return t("auth.recovery.password_same");
  }
  if (details.includes("password")) {
    return t("auth.error.password_requirements");
  }
  if (details.includes("session") || details.includes("auth session missing")) {
    return t("auth.recovery.link_expired");
  }
  return t("auth.recovery.failed");
}

/** URL absoluta de la app (incluye /PRYECTO-PPI en GitHub Pages). */
function appUrl(path) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${appBase}${clean}`;
}

/**
 * Pantalla de autenticación: login, registro, verificación OTP y recuperación.
 * Recibe callbacks del padre (App) para entrar, volver o abrir el modo demo.
 */
function Login({ onLogin, onBack, recovery = false, onRecoveryDone, onDemo }) {
  const { lang, setLang, t } = useI18n();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecovery, setIsRecovery] = useState(recovery);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const requestRecovery = async (event) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setMessage(t("auth.error.email_invalid"));
      return;
    }
    if (!hasSupabaseConfig) {
      setMessage(t("auth.recovery.supabase_required"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: appUrl("/reset-password"),
      });
      // Mensaje neutro: no revelamos si el correo existe.
      setMessage(
        error
          ? recoveryErrorMessage(error, t)
          : t("auth.recovery.sent_neutral")
      );
    } catch {
      setMessage(t("auth.error.connection"));
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setMessage(t("auth.error.password_min"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage(t("auth.error.password_mismatch"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage(recoveryErrorMessage(error, t));
      } else {
        setMessage(t("auth.recovery.password_updated"));
        setIsRecovery(false);
        onRecoveryDone?.();
      }
    } catch {
      setMessage(t("auth.error.connection"));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!/^\d{6}$/.test(verificationCode)) {
      setMessage(t("auth.verification.enter_code"));
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: verificationEmail,
        token: verificationCode,
        type: "signup",
      });
      if (error) {
        setMessage(verificationErrorMessage(error, t));
      } else if (data.session) {
        onLogin(data.session);
      } else {
        setMessage(t("auth.verification.email_confirmed"));
        setNeedsVerification(false);
        setIsSignUp(false);
      }
    } catch {
      setMessage(t("auth.error.connection"));
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setMessage("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verificationEmail,
      });
      setMessage(error ? verificationErrorMessage(error, t) : t("auth.verification.resent"));
    } catch {
      setMessage(t("auth.verification.resend_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!hasSupabaseConfig) {
      setMessage(t("auth.error.supabase_required"));
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setMessage(t("auth.error.name_required"));
      return;
    }
    if (!isValidEmail(email)) {
      setMessage(t("auth.error.email_invalid"));
      return;
    }
    if (password.length < 6) {
      setMessage(t("auth.error.password_min"));
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setMessage(t("auth.error.password_mismatch"));
      return;
    }
    setLoading(true);
    try {
      const result = isSignUp
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { full_name: fullName.trim() },
              emailRedirectTo: appUrl("/"),
            },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error) {
        setMessage(isSignUp ? signupErrorMessage(result.error, t) : loginErrorMessage(result.error, t));
      } else if (result.data.session) {
        onLogin(result.data.session);
      } else if (isSignUp) {
        setVerificationEmail(email.trim());
        setVerificationCode("");
        setNeedsVerification(true);
        setMessage(t("auth.verification.sent"));
      } else {
        setMessage(t("auth.login.session_failed"));
      }
    } catch {
      setMessage(t("auth.error.connection"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setMessage("");
    if (!hasSupabaseConfig) {
      setMessage(t("auth.google.supabase_required"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: appUrl("/"),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        const details = errorDetails(error);
        setMessage(
          details.includes("provider is not enabled") || details.includes("unsupported provider")
            ? t("auth.google.not_enabled")
            : loginErrorMessage(error, t),
        );
        setLoading(false);
      }
    } catch {
      setMessage(t("auth.google.connection_failed"));
      setLoading(false);
    }
  };

  const messageClass = message
    ? `auth-message${isErrorMessage(message) ? " auth-message-error" : " auth-message-success"}`
    : "";

  return (
    <main className="auth-page">
      {/* Columna visual + formulario (login, registro, OTP o recuperación). */}
      <div className="auth-aside">
        <div className="auth-aside-top">
          <button className="back-link" type="button" onClick={onBack}>
            <ArrowLeft size={16} /> {t("auth.nav.back_home")}
          </button>
          <LanguageSwitcher lang={lang} onChange={setLang} />
        </div>
        <Brand light />
        <LogoMark />
        <div className="auth-quote">
          <span className="eyebrow"> {t("auth.hero.eyebrow")} </span>
          <h1>
            {t("auth.hero.title_prefix")}<em>{t("auth.hero.title_suffix")}</em>
          </h1>
          <p> {t("auth.hero.description")} </p>
        </div>
        <span className="auth-footer" translate="no">RECORDATE · PPI IE La Candelaria</span>
      </div>
      <section className="auth-panel" aria-busy={loading}>
        <div className="mobile-auth-brand">
          <Brand size="lg" />
          <LanguageSwitcher lang={lang} onChange={setLang} />
        </div>
        <span className="eyebrow accent-label">
          {needsVerification ? t("auth.verification.heading") : isRecovery ? t("auth.recovery.eyebrow") : isSignUp ? t("auth.signup.eyebrow") : t("auth.login.eyebrow")}
        </span>
        <h2>
          {needsVerification
            ? t("auth.verification.title")
            : isRecovery
              ? recovery
                ? t("auth.recovery.new_password_title")
                : t("auth.recovery.title")
              : isSignUp
                ? t("auth.signup.title")
                : t("auth.login.title")}
        </h2>
        <p className="auth-subtitle">
          {needsVerification
            ? t("auth.verification.code_sent_to", { email: verificationEmail })
            : isRecovery
              ? recovery
                ? t("auth.recovery.choose_password")
                : t("auth.recovery.description")
              : isSignUp
                ? t("auth.signup.description")
                : t("auth.login.description")}
        </p>
        {needsVerification ? (
          <>
            <form onSubmit={verifyCode} noValidate>
              <label>
                {t("auth.verification.code_label")}
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength="6"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                  required
                />
              </label>
              {message && (
                <p className={messageClass} role={isErrorMessage(message) ? "alert" : "status"}>
                  {message}
                </p>
              )}
              <button className="primary-button auth-submit" type="submit" disabled={loading}>
                {loading ? t("auth.verification.verifying") : t("auth.verification.verify")} <ArrowRight size={16} />
              </button>
            </form>
            <button className="switch-button" type="button" onClick={resendCode} disabled={loading}>
              {t("auth.verification.resend")}
            </button>
            <button
              className="switch-button"
              type="button"
              onClick={() => {
                setNeedsVerification(false);
                setMessage("");
              }}
            >
              {t("auth.verification.back_signup")}
            </button>
          </>
        ) : isRecovery && recovery ? (
          <form onSubmit={updatePassword} noValidate>
            <label>
              {t("auth.recovery.new_password")}
              <input
                type="password"
                minLength="6"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
            <label>
              {t("auth.recovery.confirm_new_password")}
              <input
                type="password"
                minLength="6"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                required
              />
            </label>
            {message && (
              <p className={messageClass} role={isErrorMessage(message) ? "alert" : "status"}>
                {message}
              </p>
            )}
            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              {loading ? t("auth.recovery.updating") : t("auth.recovery.update_password")}
            </button>
          </form>
        ) : isRecovery ? (
          <form onSubmit={requestRecovery} noValidate>
            <label>
              {t("auth.form.email")}
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {message && (
              <p className={messageClass} role={isErrorMessage(message) ? "alert" : "status"}>
                {message}
              </p>
            )}
            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              {loading ? t("auth.recovery.sending") : t("auth.recovery.send_link")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {isSignUp && (
              <label>
                {t("auth.form.name")}
                <input
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
            )}
            <label>
              {t("auth.form.email")}
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              {t("auth.form.password")}
              <input
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength="6"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {isSignUp && (
              <label>
                {t("auth.form.confirm_password")}
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength="6"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
            )}
            {message && (
              <p className={messageClass} role={isErrorMessage(message) ? "alert" : "status"}>
                {message}
              </p>
            )}
            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              {loading ? t("auth.login.connecting") : isSignUp ? t("auth.signup.create_account") : t("auth.login.submit")}
              <ArrowRight size={16} />
            </button>
            <div className="auth-divider"><span> {t("auth.login.or_continue")} </span></div>
            <button className="outline-button auth-google-button" type="button" onClick={handleGoogleSignIn} disabled={loading} aria-busy={loading}>
              <span className="google-mark-wrap" translate="no">
                <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              </span>
              {loading ? t("auth.google.connecting") : t("auth.google.continue")}
            </button>
          </form>
        )}
        {!needsVerification && !isRecovery && !isSignUp && (
          <button
            className="switch-button"
            type="button"
            onClick={() => {
              setIsRecovery(true);
              setMessage("");
            }}
          >
            {t("auth.recovery.forgot_password")}
          </button>
        )}
        {onDemo && !needsVerification && !isRecovery && (
          <button className="switch-button demo-button" type="button" onClick={onDemo}>
            {t("auth.demo.explore")}
          </button>
        )}
        {!needsVerification && (
          <button
            className="switch-button"
            type="button"
            onClick={() => {
              if (isRecovery) {
                setIsRecovery(false);
                setMessage("");
                return;
              }
              setIsSignUp((current) => !current);
              setMessage("");
            }}
          >
            {isSignUp
              ? t("auth.signup.have_account")
              : isRecovery
                ? t("auth.recovery.back_login")
                : t("auth.login.no_account")}
          </button>
        )}
        <p className="auth-note">
          {hasSupabaseConfig
            ? t("auth.note.supabase")
            : t("auth.note.demo")}
        </p>
      </section>
    </main>
  );
}

export default Login;
