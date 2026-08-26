import { useState } from "react";
import { hasSupabaseConfig, supabase } from "../supabaseClient";

function Brand() {
  return (
    <div className="brand brand-light">
      <span className="brand-mark">R</span>
      <span>RECORDATE</span>
    </div>
  );
}

function signupErrorMessage(error) {
  const details = `${error?.message || ""} ${error?.code || ""}`.toLowerCase();
  if (details.includes("already registered") || details.includes("already been registered")) return "Ese correo ya está registrado. Inicia sesión o usa otro correo.";
  if (details.includes("signups not allowed") || details.includes("email signups are disabled")) return "El registro por correo está desactivado en Supabase. Activa Email en Authentication → Providers → Email.";
  if (details.includes("invalid email")) return "El correo electrónico no es válido.";
  if (details.includes("password")) return "La contraseña no cumple los requisitos de Supabase.";
  if (details.includes("database error saving new user") || details.includes("saving new user")) return "Supabase no pudo crear el perfil. Ejecuta nuevamente la migración SQL completa y verifica que exista la tabla profiles.";
  if (details.includes("rate limit") || details.includes("too many requests")) return "Se alcanzó el límite temporal de registros. Espera unos minutos e inténtalo de nuevo.";
  if (details.includes("profiles") || details.includes("database") || details.includes("trigger")) return "La cuenta no pudo guardarse en la base de datos. Verifica que ejecutaste la migración SQL.";
  return "No fue posible crear la cuenta. Revisa los datos e inténtalo de nuevo.";
}

function Login({ onLogin, onBack }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!hasSupabaseConfig) {
      setMessage(
        "La autenticación requiere configurar Supabase en las variables de entorno.",
      );
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setMessage("Escribe tu nombre para crear la cuenta.");
      return;
    }
    if (!email.includes("@")) {
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
            options: { data: { full_name: fullName.trim() } },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error) setMessage(isSignUp ? signupErrorMessage(result.error) : "El correo o la contraseña son incorrectos.");
      else if (result.data.session) onLogin(result.data.session);
      else setMessage("Revisa tu correo para confirmar la cuenta.");
    } catch {
      setMessage(
        "No fue posible conectar con el servicio. Inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="auth-page">
      <div className="auth-aside">
        <button className="back-link" onClick={onBack}>
          ← Volver al inicio
        </button>
        <Brand />
        <div className="auth-quote">
          <span className="eyebrow">Tu espacio académico</span>
          <h1>
            Lo importante, <em>en el momento correcto.</em>
          </h1>
          <p>Una agenda clara para que puedas concentrarte en aprender.</p>
        </div>
        <span className="auth-footer">RECORDATE · PPI IE La Candelaria</span>
      </div>
      <section className="auth-panel">
        <div className="mobile-auth-brand">
          <Brand />
        </div>
        <span className="eyebrow accent-label">
          {isSignUp ? "Comienza hoy" : "Bienvenido de nuevo"}
        </span>
        <h2>{isSignUp ? "Crea tu cuenta." : "Entra a tu agenda."}</h2>
        <p className="auth-subtitle">
          {isSignUp
            ? "Organiza tus actividades académicas desde el primer día."
            : "Tus tareas y recordatorios te están esperando."}
        </p>
        <form onSubmit={handleSubmit} noValidate>
          {isSignUp && (
            <label>
              Nombre
              <input
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
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
              <input
                type="password"
                minLength="6"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
          )}
          {message && (
            <p className="auth-message" role="alert">
              {message}
            </p>
          )}
          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Conectando..."
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
            setMessage("");
          }}
        >
          {isSignUp
            ? "¿Ya tienes cuenta? Inicia sesión"
            : "¿No tienes cuenta? Regístrate"}
        </button>
        <p className="auth-note">No guardamos contraseñas en este navegador.</p>
      </section>
    </main>
  );
}

export default Login;
