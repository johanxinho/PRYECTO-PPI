// @ts-nocheck
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Brand, LogoMark } from "../Brand";
import { DiaTextReveal } from "./ui/dia-text-reveal";
import { hasSupabaseConfig, supabase } from "../supabaseClient";
import { appBase } from "../paths";

<<<<<<< HEAD
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
  return /no (fue|fue posible|encontramos|existe)|error|incorrect|inválid|imposible|falla|falló|requiere|coincide|mínimo|escribe|alcanzó|desactiv|expir|revisa spam/i.test(
    text || ""
  );
}

/**
 * Mensajes claros en español para el registro.
 * Evita jerga técnica (SQL, triggers) orientada a administradores.
 */
=======
// Renderiza la marca reutilizable en la pantalla de autenticación.
function Brand() {
  return (
    <div className="brand brand-light">
      <span className="brand-mark">R</span>
      <span>RECORDATE</span>
    </div>
  );
}

// Traduce errores técnicos del registro a mensajes comprensibles.
>>>>>>> 181bdc7 (carpe diem)
function signupErrorMessage(error) {
  const details = errorDetails(error);
  if (details.includes("already registered") || details.includes("already been registered") || details.includes("user_already_exists")) {
    return "Ese correo ya está registrado. Inicia sesión o usa otro correo.";
  }
  if (details.includes("signups not allowed") || details.includes("email signups are disabled")) {
    return "El registro por correo no está disponible en este momento. Prueba más tarde o usa la demostración.";
  }
  if (details.includes("invalid email") || details.includes("email_address_invalid")) {
    return "El correo electrónico no es válido.";
  }
  if (details.includes("password should be") || details.includes("weak_password") || (details.includes("password") && details.includes("least"))) {
    return "La contraseña es demasiado corta o no cumple los requisitos. Usa al menos 6 caracteres.";
  }
  if (details.includes("database error saving new user") || details.includes("saving new user") || details.includes("profiles") || details.includes("trigger")) {
    return "No pudimos crear tu perfil. Inténtalo de nuevo en unos minutos. Si continúa, avisa al docente o al administrador.";
  }
  if (details.includes("rate limit") || details.includes("too many requests") || details.includes("over_email_send_rate_limit")) {
    return "Se alcanzó el límite temporal de registros. Espera unos minutos e inténtalo de nuevo.";
  }
  if (details.includes("network") || details.includes("fetch")) {
    return "No fue posible conectar con el servicio. Revisa tu internet e inténtalo de nuevo.";
  }
  return "No fue posible crear la cuenta. Revisa los datos e inténtalo de nuevo.";
}

<<<<<<< HEAD
/** Errores del inicio de sesión traducidos a español. */
function loginErrorMessage(error) {
  const details = errorDetails(error);
  if (details.includes("email not confirmed") || details.includes("email_not_confirmed")) {
    return "Debes confirmar tu correo antes de entrar. Revisa tu bandeja o regístrate de nuevo para pedir otro código.";
  }
  if (details.includes("invalid login credentials") || details.includes("invalid_credentials")) {
    return "El correo o la contraseña son incorrectos.";
  }
  if (details.includes("user not found")) {
    return "No encontramos una cuenta con ese correo. Regístrate o revisa que esté bien escrito.";
  }
  if (details.includes("too many") || details.includes("rate limit")) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (details.includes("network") || details.includes("fetch")) {
    return "No fue posible conectar con el servicio. Revisa tu internet e inténtalo de nuevo.";
  }
  return "No fue posible iniciar sesión. Revisa tus datos e inténtalo de nuevo.";
}

/** Errores del OTP de verificación (código de 6 dígitos). */
function verificationErrorMessage(error) {
  const details = errorDetails(error);
  if (details.includes("expired") || details.includes("otp_expired")) {
    return "El código de verificación expiró. Usa «Reenviar código» para pedir uno nuevo.";
  }
  if (details.includes("invalid") || details.includes("otp_disabled") || details.includes("token")) {
    return "El código de verificación es incorrecto. Revísalo o pide uno nuevo.";
  }
  if (details.includes("rate limit") || details.includes("too many") || details.includes("over_email_send_rate_limit")) {
    return "Se alcanzó el límite de intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  return "No fue posible verificar el código. Inténtalo de nuevo.";
}

/** Errores al pedir o actualizar la contraseña. */
function recoveryErrorMessage(error) {
  const details = errorDetails(error);
  if (details.includes("rate limit") || details.includes("over_email_send_rate_limit") || details.includes("too many")) {
    return "Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (details.includes("user not found") || details.includes("unable to validate email")) {
    return "Si el correo está registrado, te enviaremos un enlace. Revisa también la carpeta de spam.";
  }
  if (details.includes("same_password") || details.includes("should be different")) {
    return "La nueva contraseña debe ser distinta a la anterior.";
  }
  if (details.includes("password")) {
    return "La contraseña no cumple los requisitos. Usa al menos 6 caracteres.";
  }
  if (details.includes("session") || details.includes("auth session missing")) {
    return "El enlace de recuperación expiró o ya se usó. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».";
  }
  return "No fue posible completar la recuperación. Inténtalo de nuevo.";
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
=======
// Gestiona el inicio de sesión, registro y verificación de cuentas.
function Login({ onLogin, onBack }) {
>>>>>>> 181bdc7 (carpe diem)
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecovery, setIsRecovery] = useState(recovery);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
<<<<<<< HEAD
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
      setMessage("Escribe un correo electrónico válido.");
      return;
    }
    if (!hasSupabaseConfig) {
      setMessage("La recuperación de contraseña requiere configurar Supabase.");
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
          ? recoveryErrorMessage(error)
          : "Si el correo está registrado, te enviamos un enlace para recuperar tu contraseña. Revisa también spam."
      );
    } catch {
      setMessage("No fue posible conectar con el servicio. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setMessage("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage(recoveryErrorMessage(error));
      } else {
        setMessage("Contraseña actualizada correctamente. Ya puedes usar la agenda.");
        setIsRecovery(false);
        onRecoveryDone?.();
      }
    } catch {
      setMessage("No fue posible conectar con el servicio. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!/^\d{6}$/.test(verificationCode)) {
      setMessage("Escribe el código de verificación de 6 dígitos.");
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
        setMessage(verificationErrorMessage(error));
      } else if (data.session) {
        onLogin(data.session);
      } else {
        setMessage("Correo verificado. Ahora puedes iniciar sesión.");
        setNeedsVerification(false);
        setIsSignUp(false);
      }
    } catch {
      setMessage("No fue posible conectar con el servicio. Inténtalo de nuevo.");
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
      setMessage(error ? verificationErrorMessage(error) : "Te enviamos un nuevo código de verificación. Revisa tu correo y spam.");
    } catch {
      setMessage("No fue posible reenviar el código. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

=======
  const [verificationCode, setVerificationCode] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // Valida el formulario y ejecuta el flujo de autenticación correspondiente.
>>>>>>> 181bdc7 (carpe diem)
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!hasSupabaseConfig) {
      setMessage("La autenticación requiere configurar Supabase. Puedes explorar la demostración mientras tanto.");
      return;
    }
    if (awaitingVerification) {
      if (!/^\d{6}$/.test(verificationCode)) {
        setMessage("Escribe el código de 6 dígitos que recibiste por correo.");
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: verificationCode,
          type: "signup",
        });
        if (error) throw error;
        if (data.session) {
          onLogin(data.session);
        } else {
          setIsSignUp(false);
          setMessage("Código verificado. Ya puedes iniciar sesión.");
        }
        setAwaitingVerification(false);
        setVerificationCode("");
      } catch (error) {
        setMessage(
          error.message?.toLowerCase().includes("expired")
            ? "El código expiró. Regístrate de nuevo para recibir otro."
            : "El código no es válido. Revisa el correo e inténtalo de nuevo.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setMessage("Escribe tu nombre para crear la cuenta.");
      return;
    }
    if (!isValidEmail(email)) {
      setMessage("Escribe un correo electrónico válido.");
      return;
    }
    if (password.length < 6) {
      setMessage("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
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
<<<<<<< HEAD
      if (result.error) {
        setMessage(isSignUp ? signupErrorMessage(result.error) : loginErrorMessage(result.error));
      } else if (result.data.session) {
        onLogin(result.data.session);
      } else if (isSignUp) {
        setVerificationEmail(email.trim());
        setVerificationCode("");
        setNeedsVerification(true);
        setMessage("Te enviamos un código de 6 dígitos a tu correo. Revisa también la carpeta de spam.");
      } else {
        setMessage("No se pudo abrir la sesión. Inténtalo de nuevo.");
      }
=======
      if (result.error) setMessage(isSignUp ? signupErrorMessage(result.error) : result.error.message.toLowerCase().includes("not confirmed") ? "Confirma tu correo con el código recibido antes de iniciar sesión." : "El correo o la contraseña son incorrectos.");
      else if (result.data.session) onLogin(result.data.session);
      else if (isSignUp) {
        setAwaitingVerification(true);
        setMessage("Te enviamos un código de 6 dígitos a tu correo.");
      } else setMessage("Revisa tu correo para confirmar la cuenta.");
>>>>>>> 181bdc7 (carpe diem)
    } catch {
      setMessage("No fue posible conectar con el servicio. Inténtalo de nuevo.");
    } finally {
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
        <button className="back-link" type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Volver al inicio
        </button>
        <Brand light />
        <LogoMark />
        <div className="auth-quote">
          <span className="eyebrow">Tu espacio académico</span>
          <h1>
            Lo importante, <em><DiaTextReveal text="en el momento correcto." delay={0.2} /></em>
          </h1>
          <p>Una agenda clara para que puedas concentrarte en aprender.</p>
        </div>
        <span className="auth-footer">RECORDATE · PPI IE La Candelaria</span>
      </div>
      <section className="auth-panel" aria-busy={loading}>
        <div className="mobile-auth-brand">
          <Brand size="lg" />
        </div>
        <span className="eyebrow accent-label">
          {needsVerification ? "Confirma tu correo" : isRecovery ? "Recupera tu acceso" : isSignUp ? "Comienza hoy" : "Bienvenido de nuevo"}
        </span>
        <h2>
          {needsVerification
            ? "Verifica tu cuenta."
            : isRecovery
              ? recovery
                ? "Crea una nueva contraseña."
                : "Recupera tu contraseña."
              : isSignUp
                ? "Crea tu cuenta."
                : "Entra a tu agenda."}
        </h2>
        <p className="auth-subtitle">
          {needsVerification
            ? `Escribe el código que enviamos a ${verificationEmail}.`
            : isRecovery
              ? recovery
                ? "Elige una contraseña nueva para volver a entrar."
                : "Te enviaremos un enlace seguro a tu correo."
              : isSignUp
                ? "Organiza tus actividades académicas desde el primer día."
                : "Tus tareas y recordatorios te están esperando."}
        </p>
<<<<<<< HEAD
        {needsVerification ? (
          <>
            <form onSubmit={verifyCode} noValidate>
              <label>
                Código de verificación
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
                {loading ? "Verificando..." : "Verificar código"} <ArrowRight size={16} />
              </button>
            </form>
            <button className="switch-button" type="button" onClick={resendCode} disabled={loading}>
              Reenviar código
            </button>
            <button
              className="switch-button"
              type="button"
              onClick={() => {
                setNeedsVerification(false);
                setMessage("");
              }}
            >
              Volver al registro
            </button>
          </>
        ) : isRecovery && recovery ? (
          <form onSubmit={updatePassword} noValidate>
            <label>
              Nueva contraseña
=======
        <form onSubmit={handleSubmit} noValidate>
          {isSignUp && !awaitingVerification && (
            <label>
              Nombre
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
          )}
          {!awaitingVerification && <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>}
          <label>
            Contraseña
            <input
              type="password"
              minLength="6"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {isSignUp && (
            <label>
              Confirmar contraseña
>>>>>>> 181bdc7 (carpe diem)
              <input
                type="password"
                minLength="6"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
<<<<<<< HEAD
            <label>
              Confirmar nueva contraseña
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
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        ) : isRecovery ? (
          <form onSubmit={requestRecovery} noValidate>
            <label>
              Correo electrónico
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
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {isSignUp && (
              <label>
                Nombre
                <input
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
            )}
            <label>
              Correo electrónico
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Contraseña
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
                Confirmar contraseña
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
              {loading ? "Conectando..." : isSignUp ? "Crear mi cuenta" : "Iniciar sesión"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
        {!needsVerification && !isRecovery && !isSignUp && (
=======
          )}
          {awaitingVerification && (
            <label>
              Código de verificación
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength="6"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                required
              />
            </label>
          )}
          {message && (
            <p className="auth-message" role="alert">
              {message}
            </p>
          )}
>>>>>>> 181bdc7 (carpe diem)
          <button
            className="switch-button"
            type="button"
            onClick={() => {
              setIsRecovery(true);
              setMessage("");
            }}
          >
<<<<<<< HEAD
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {onDemo && !needsVerification && !isRecovery && (
          <button className="switch-button demo-button" type="button" onClick={onDemo}>
            Explorar demostración
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
              ? "¿Ya tienes cuenta? Inicia sesión"
              : isRecovery
                ? "Volver al inicio de sesión"
                : "¿No tienes cuenta? Regístrate"}
          </button>
        )}
        <p className="auth-note">
          {hasSupabaseConfig
            ? "No guardamos contraseñas en este navegador. El acceso lo gestiona Supabase de forma segura."
            : "Supabase no está configurado en este entorno. La demostración guarda datos solo en este dispositivo."}
        </p>
=======
            {loading
              ? "Conectando..."
              : awaitingVerification
                ? "Verificar código"
                : isSignUp
                ? "Crear mi cuenta"
                : "Iniciar sesión"}
            <span>→</span>
          </button>
        </form>
        <button
          className="switch-button"
          type="button"
          onClick={() => {
            setIsSignUp((current) => !current);
            setAwaitingVerification(false);
            setVerificationCode("");
            setMessage("");
          }}
        >
          {isSignUp
            ? "¿Ya tienes cuenta? Inicia sesión"
            : "¿No tienes cuenta? Regístrate"}
        </button>
        <p className="auth-note">No guardamos contraseñas en este navegador.</p>
>>>>>>> 181bdc7 (carpe diem)
      </section>
    </main>
  );
}

export default Login;
