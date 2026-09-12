// @ts-nocheck
import { useState } from "react"; // Hook de estado local del formulario.
import { ArrowLeft, ArrowRight } from "lucide-react"; // Iconos de flecha para volver y enviar.
import { Brand, LogoMark } from "../Brand"; // Marca RECORDATE (texto + isotipo).
import { DiaTextReveal } from "./ui/dia-text-reveal"; // Título con barrido de color.
import { hasSupabaseConfig, supabase } from "../supabaseClient"; // Cliente y bandera de configuración.

/**
 * Traduce errores de registro de Supabase a mensajes claros en español.
 * El alumno revisa el texto del error y elige la frase que verá el usuario.
 */
function signupErrorMessage(error) {  // Abre signupErrorMessage.
  const details = `${error?.message || ""} ${error?.code || ""}`.toLowerCase(); // Une mensaje y código en minúsculas para buscar.
  if (details.includes("already registered") || details.includes("already been registered")) return "Ese correo ya está registrado. Inicia sesión o usa otro correo."; // Correo duplicado.
  if (details.includes("signups not allowed") || details.includes("email signups are disabled")) return "El registro por correo está desactivado en Supabase. Activa Email en Authentication → Providers → Email."; // Signups apagados en el dashboard.
  if (details.includes("invalid email")) return "El correo electrónico no es válido."; // Formato de email inválido.
  if (details.includes("password")) return "La contraseña no cumple los requisitos de Supabase."; // Política de contraseña.
  if (details.includes("database error saving new user") || details.includes("saving new user")) return "Supabase no pudo crear el perfil. Ejecuta nuevamente la migración SQL completa y verifica que exista la tabla profiles."; // Trigger/perfil falló.
  if (details.includes("rate limit") || details.includes("too many requests")) return "Se alcanzó el límite temporal de registros. Espera unos minutos e inténtalo de nuevo."; // Rate limit de Auth.
  if (details.includes("profiles") || details.includes("database") || details.includes("trigger")) return "La cuenta no pudo guardarse en la base de datos. Verifica que ejecutaste la migración SQL."; // Tabla o trigger ausente.
  return "No fue posible crear la cuenta. Revisa los datos e inténtalo de nuevo."; // Mensaje genérico de respaldo.
} // Fin de signupErrorMessage.

/**
 * Traduce errores del OTP de verificación (código de 6 dígitos).
 * Cubre código vencido y demasiados intentos.
 */
function verificationErrorMessage(error) {  // Abre verificationErrorMessage.
  const details = `${error?.message || ""} ${error?.code || ""}`.toLowerCase(); // Texto unificado para comparar.
  if (details.includes("expired") || details.includes("invalid")) { // Código malo o caducado.
    return "El código de verificación es incorrecto o expiró."; // Avisa al usuario que lo pida de nuevo.
  } // Fin de verificationErrorMessage.
  if (details.includes("rate limit") || details.includes("too many")) { // Demasiados intentos.
    return "Se alcanzó el límite de intentos. Espera unos minutos e inténtalo de nuevo."; // Pide espera.
  } // Fin de el bloque.
  return "No fue posible verificar el código. Inténtalo de nuevo."; // Fallback genérico.
} // Fin de el bloque.

/**
 * Pantalla de autenticación: login, registro, verificación OTP y recuperación.
 * Recibe callbacks del padre (App) para entrar, volver o abrir el modo demo.
 */
function Login({ onLogin, onBack, recovery = false, onRecoveryDone, onDemo }) {  // Abre Login.
  const [isSignUp, setIsSignUp] = useState(false); // true = formulario de registro.
  const [isRecovery, setIsRecovery] = useState(recovery); // true = flujo de contraseña olvidada.
  const [email, setEmail] = useState(""); // Correo que escribe el usuario.
  const [password, setPassword] = useState(""); // Contraseña de login/registro.
  const [confirmPassword, setConfirmPassword] = useState(""); // Confirmación en registro.
  const [fullName, setFullName] = useState(""); // Nombre para metadata de Supabase.
  const [verificationEmail, setVerificationEmail] = useState(""); // Email al que se envió el OTP.
  const [verificationCode, setVerificationCode] = useState(""); // Código de 6 dígitos.
  const [needsVerification, setNeedsVerification] = useState(false); // true = mostrar el paso OTP.
  const [message, setMessage] = useState(""); // Mensaje de error o éxito bajo el form.
  const [loading, setLoading] = useState(false); // Deshabilita botones mientras hay red.
  const [newPassword, setNewPassword] = useState(""); // Nueva contraseña en recovery.
  const [confirmNewPassword, setConfirmNewPassword] = useState(""); // Confirmación de la nueva.

  /**
   * Pide a Supabase el correo de “olvidé mi contraseña”.
   * Valida el email y la config antes de llamar a la API.
   */
  const requestRecovery = async (event) => {  // Abre requestRecovery.
    event.preventDefault(); // Evita recargar la página al enviar el form.
    if (!email.includes("@")) { // Validación mínima de correo.
      setMessage("Escribe un correo electrónico válido."); // Feedback inmediato.
      return; // No llama a la red.
    } // Fin de requestRecovery.
    if (!hasSupabaseConfig) { // Sin URL/key de Supabase no hay Auth.
      setMessage("La recuperación de contraseña requiere configurar Supabase."); // Explica el requisito.
      return; // Sale sin fetch.
    } // Fin de Login.
    setLoading(true); // Bloquea el botón “Enviando...”.
    try { // Captura fallos de red.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` }); // Envía el enlace al correo, con redirect a esta app.
      setMessage(error ? "No fue posible enviar el enlace de recuperación." : "Te enviamos un enlace para recuperar tu contraseña."); // Éxito o error de Auth.
    } catch { // Fetch falló (offline, CORS, etc.).
      setMessage("No fue posible conectar con el servicio. Inténtalo de nuevo."); // Mensaje de conexión.
    } finally { // Siempre se ejecuta.
      setLoading(false); // Rehabilita el botón.
    } // Fin de el bloque.
  }; // Fin de el bloque.

  /**
   * Guarda la nueva contraseña cuando el usuario llega desde el enlace mágico.
   * Exige 6+ caracteres y que las dos cajas coincidan.
   */
  const updatePassword = async (event) => {  // Abre updatePassword.
    event.preventDefault(); // No recarga.
    if (newPassword.length < 6) { // Mínimo alineado con Supabase.
      setMessage("La contraseña debe tener mínimo 6 caracteres."); // Avisa.
      return; // No llama a updateUser.
    } // Fin de updatePassword.
    if (newPassword !== confirmNewPassword) { // Deben ser iguales.
      setMessage("Las contraseñas no coinciden."); // Avisa.
      return; // Sale.
    } // Fin de el bloque.
    setLoading(true); // Spinner de “Actualizando...”.
    try { // Auth puede lanzar.
      const { error } = await supabase.auth.updateUser({ password: newPassword }); // Actualiza la sesión actual.
      if (error) setMessage("No fue posible actualizar la contraseña."); // Error de API.
      else { // Todo bien.
        setMessage("Contraseña actualizada correctamente."); // Confirma al usuario.
        setIsRecovery(false); // Sale del modo recovery.
        onRecoveryDone?.(); // Avisa al padre (limpia query params, etc.).
      } // Fin de el bloque.
    } catch { // Red caída.
      setMessage("No fue posible conectar con el servicio. Inténtalo de nuevo."); // Feedback.
    } finally { // Limpieza.
      setLoading(false); // Quita el loading.
    } // Fin de el bloque.
  }; // Fin de el bloque.

  /**
   * Verifica el OTP de 6 dígitos enviado al correo de registro.
   * Si hay sesión, entra; si no, pide que inicie sesión a mano.
   */
  const verifyCode = async (event) => {  // Abre verifyCode.
    event.preventDefault(); // No recarga.
    setMessage(""); // Limpia alertas previas.
    if (!/^\d{6}$/.test(verificationCode)) { // Exactamente 6 dígitos.
      setMessage("Escribe el código de verificación de 6 dígitos."); // Formato inválido.
      return; // No llama a verifyOtp.
    } // Fin de verifyCode.
    setLoading(true); // “Verificando...”.
    try { // Llamada a Auth.
      const { data, error } = await supabase.auth.verifyOtp({ // Confirma el código.
        email: verificationEmail, // El mismo correo del signup.
        token: verificationCode, // Los 6 dígitos.
        type: "signup", // OTP de registro (no magic link).
      }); // Cierra la llamada y el bloque.
      if (error) { // Código malo o expirado.
        setMessage(verificationErrorMessage(error)); // Mensaje traducido.
      } else if (data.session) { // Supabase devolvió sesión.
        onLogin(data.session); // Entra a la agenda.
      } else { // Verificado pero sin sesión automática.
        setMessage("Correo verificado. Ahora puedes iniciar sesión."); // Pide login.
        setNeedsVerification(false); // Cierra el paso OTP.
        setIsSignUp(false); // Muestra el form de entrada.
      } // Fin de el bloque.
    } catch { // Sin red.
      setMessage("No fue posible conectar con el servicio. Inténtalo de nuevo."); // Feedback.
    } finally { // Siempre.
      setLoading(false); // Rehabilita botones.
    } // Fin de el bloque.
  }; // Fin de el bloque.

  /**
   * Reenvía el correo OTP al mismo verificationEmail.
   * No es un <form>: se dispara con un botón type="button".
   */
  const resendCode = async () => {  // Abre resendCode.
    setMessage(""); // Limpia el aviso anterior.
    setLoading(true); // Evita doble clic.
    try { // Auth.resend puede fallar.
      const { error } = await supabase.auth.resend({ // Pide otro código.
        type: "signup", // Mismo tipo que el OTP original.
        email: verificationEmail, // Destinatario guardado.
      }); // Cierra la llamada y resendCode.
      setMessage(error ? verificationErrorMessage(error) : "Te enviamos un nuevo código de verificación."); // Error traducido o éxito.
    } catch { // Red.
      setMessage("No fue posible reenviar el código. Inténtalo de nuevo."); // Feedback.
    } finally { // Limpieza.
      setLoading(false); // Quita loading.
    } // Fin de el bloque.
  }; // Fin de el bloque.

  /**
   * Login o registro según isSignUp. Valida campos y llama a Supabase Auth.
   * Si el signup no devuelve sesión, pasa al paso de verificación OTP.
   */
  const handleSubmit = async (event) => {  // Abre handleSubmit.
    event.preventDefault(); // Evita GET nativo del form.
    setMessage(""); // Limpia mensajes.
    if (!hasSupabaseConfig) { // Sin credenciales no hay Auth real.
      setMessage("La autenticación requiere configurar Supabase. Puedes explorar la demostración mientras tanto."); // Invita al demo.
      return; // Sale.
    } // Fin de handleSubmit.
    if (isSignUp && !fullName.trim()) { // Registro exige nombre.
      setMessage("Escribe tu nombre para crear la cuenta."); // Validación UX.
      return; // Sale.
    } // Fin de el bloque.
    if (!email.includes("@")) { // Correo mínimo.
      setMessage("Escribe un correo electrónico válido."); // Feedback.
      return; // Sale.
    } // Fin de el bloque.
    if (password.length < 6) { // Política mínima.
      setMessage("La contraseña debe tener mínimo 6 caracteres."); // Feedback.
      return; // Sale.
    } // Fin de el bloque.
    if (isSignUp && password !== confirmPassword) { // Las dos cajas deben coincidir.
      setMessage("Las contraseñas no coinciden."); // Feedback.
      return; // Sale.
    } // Fin de el bloque.
    setLoading(true); // “Conectando...”.
    try { // Una sola rama: signUp o signIn.
      const result = isSignUp // Elige el método Auth.
        ? await supabase.auth.signUp({ // Crea cuenta.
            email: email.trim(), // Correo sin espacios.
            password, // Contraseña en claro (viaja por HTTPS a Supabase).
            options: { data: { full_name: fullName.trim() } }, // Metadata para el trigger de profiles.
          }) // Cierra argumentos.
        : await supabase.auth.signInWithPassword({ // Inicia sesión.
            email: email.trim(), // Correo recortado.
            password, // Contraseña.
          }); // Cierra la llamada y el bloque.
      if (result.error) setMessage(isSignUp ? signupErrorMessage(result.error) : "El correo o la contraseña son incorrectos."); // Error de Auth.
      else if (result.data.session) onLogin(result.data.session); // Sesión lista: entra.
      else { // Signup con confirmación por correo (no hay session aún).
        setVerificationEmail(email.trim()); // Recuerda a quién se envió.
        setVerificationCode(""); // Limpia el input OTP.
        setNeedsVerification(true); // Muestra el paso de código.
        setMessage("Te enviamos un código de 6 dígitos a tu correo."); // Instrucción.
      } // Fin de el bloque.
    } catch { // Fetch falló.
      setMessage("No fue posible conectar con el servicio. Inténtalo de nuevo."); // Feedback.
    } finally { // Siempre.
      setLoading(false); // Quita loading.
    } // Fin de el bloque.
  }; // Fin de el bloque.

  return ( // UI a dos columnas: cita + panel de formularios.
    <main className="auth-page">{/* Contenedor principal de autenticación. */}
      <div className="auth-aside">{/* Columna izquierda: marca y frase. */}
        <button className="back-link" onClick={onBack}>{/* Vuelve al landing. */}
          <ArrowLeft size={16} /> Volver al inicio{/* Icono + texto de retorno. */}
        </button>{/* Cierra el <button>. */}
        <Brand light />{/* Logotipo en versión clara (fondo oscuro). */}
        <LogoMark />{/* Isotipo decorativo grande. */}
        <div className="auth-quote">{/* Bloque de copy académico. */}
          <span className="eyebrow">Tu espacio académico</span>{/* Etiqueta pequeña sobre el h1. */}
          <h1>{/* Título con énfasis animado. */}
            Lo importante, <em><DiaTextReveal text="en el momento correcto." delay={0.2} /></em>{/* Barrido de color sobre la frase clave. */}
          </h1>{/* Cierra el <h1>. */}
          <p>Una agenda clara para que puedas concentrarte en aprender.</p>{/* Subtítulo de valor. */}
        </div>{/* Cierra el <div>. */}
        <span className="auth-footer">RECORDATE · PPI IE La Candelaria</span>{/* Crédito del proyecto escolar. */}
      </div>{/* Cierra el <div>. */}
      <section className="auth-panel">{/* Columna derecha: formularios. */}
        <div className="mobile-auth-brand">{/* Marca visible solo en móvil. */}
          <Brand size="lg" />{/* Logo grande para pantallas chicas. */}
        </div>{/* Cierra el <div>. */}
        <span className="eyebrow accent-label">{/* Etiqueta que cambia según el paso. */}
          {needsVerification ? "Confirma tu correo" : isRecovery ? "Recupera tu acceso" : isSignUp ? "Comienza hoy" : "Bienvenido de nuevo"} // Copy del paso actual.
        </span>{/* Cierra el <span>. */}
        <h2>{needsVerification ? "Verifica tu cuenta." : isRecovery ? recovery ? "Crea una nueva contraseña." : "Recupera tu contraseña." : isSignUp ? "Crea tu cuenta." : "Entra a tu agenda."}</h2>{/* Título del panel. */}
        <p className="auth-subtitle">{/* Párrafo de ayuda bajo el h2. */}
          {needsVerification // Rama OTP.
            ? `Escribe el código que enviamos a ${verificationEmail}.` // Indica el correo destino.
            : isRecovery ? recovery ? "Elige una contraseña nueva para volver a entrar." : "Te enviaremos un enlace seguro a tu correo." // Recovery: nueva pass vs. pedir enlace.
            : isSignUp // Registro.
              ? "Organiza tus actividades académicas desde el primer día." // Copy de signup.
              : "Tus tareas y recordatorios te están esperando."} // Copy de login.
        </p>{/* Cierra el <p>. */}
        {needsVerification ? ( // Paso 1: formulario OTP.
          <>{/* Fragmento: form + dos botones extra. */}
            <form onSubmit={verifyCode} noValidate>{/* Valida el código en JS, no en HTML5. */}
              <label>{/* Etiqueta + input del OTP. */}
                Código de verificación// Texto visible del label.
                <input// Campo controlado del formulario.
                  inputMode="numeric" /* Teclado numérico en móvil. */
                  autoComplete="one-time-code" /* Autocompletar OTP del SMS/mail. */
                  maxLength="6" /* Máximo 6 caracteres. */
                  value={verificationCode} /* Valor controlado. */
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} /* Solo dígitos. */
                  required /* Campo obligatorio. */
                />{/* Cierra el input. */}
              </label>{/* Cierra el <label>. */}
              {message && <p className="auth-message" role="alert">{message}</p>}{/* Alerta accesible si hay mensaje. */}
              <button className="primary-button auth-submit" type="submit" disabled={loading}>{/* Envía el OTP. */}
                {loading ? "Verificando..." : "Verificar código"} <ArrowRight size={16} />{/* Texto según loading + flecha. */}
              </button>{/* Cierra el <button>. */}
            </form>{/* Cierra el <form>. */}
            <button className="switch-button" type="button" onClick={resendCode} disabled={loading}>{/* Pide otro código. */}
              Reenviar código// Copy del reenvío.
            </button>{/* Cierra el <button>. */}
            <button className="switch-button" type="button" onClick={() => { setNeedsVerification(false); setMessage(""); }}>{/* Vuelve al form de registro. */}
              Volver al registro// Copy de retorno.
            </button>{/* Cierra el <button>. */}
          </>// Cierra el fragmento.
        ) : isRecovery && recovery ? <form onSubmit={updatePassword} noValidate>{/* Paso: nueva contraseña (llegó del enlace). */}
          <label> Nueva contraseña <input type="password" minLength="6" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>{/* Input de nueva pass. */}
          <label> Confirmar nueva contraseña <input type="password" minLength="6" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required /></label>{/* Confirmación. */}
          {message && <p className="auth-message" role="alert">{message}</p>}{/* Alerta si hay mensaje. */}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? "Actualizando..." : "Actualizar contraseña"}</button>{/* Submit de update. */}
        </form> : isRecovery ? <form onSubmit={requestRecovery} noValidate>{/* Paso: pedir el enlace al correo. */}
          <label>Correo electrónico <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{/* Email para el reset. */}
          {message && <p className="auth-message" role="alert">{message}</p>}{/* Alerta. */}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar enlace"}</button>{/* Submit del reset. */}
        </form> : <form onSubmit={handleSubmit} noValidate>{/* Login / registro principal. */}
          {isSignUp && ( // Solo en registro: campo nombre.
            <label>{/* Label de nombre completo. */}
              Nombre// Texto del label.
              <input// Campo controlado del formulario.
                value={fullName} /* Valor controlado del nombre. */
                onChange={(event) => setFullName(event.target.value)} /* Actualiza fullName. */
                required /* Obligatorio en signup. */
              />{/* Cierra el input. */}
            </label>// Cierra el <label>.
          )} // Cierra el condicional JSX.
          <label>{/* Correo para login y registro. */}
            Correo electrónico// Texto del label.
            <input// Campo controlado del formulario.
              type="email" /* Tipo email: teclado y validación nativa. */
              autoComplete="email" /* Autocompletar del navegador. */
              value={email} /* Valor controlado. */
              onChange={(event) => setEmail(event.target.value)} /* Guarda el correo. */
              required /* Obligatorio. */
            />{/* Cierra el input. */}
          </label>{/* Cierra el <label>. */}
          <label>{/* Contraseña. */}
            Contraseña// Texto del label.
            <input// Campo controlado del formulario.
              type="password" /* Oculta los caracteres. */
              autoComplete={isSignUp ? "new-password" : "current-password"} /* Hint distinto en alta vs. entrada. */
              minLength="6" /* Mínimo 6. */
              value={password} /* Valor controlado. */
              onChange={(event) => setPassword(event.target.value)} /* Guarda la pass. */
              required /* Obligatorio. */
            />{/* Cierra el input. */}
          </label>{/* Cierra el <label>. */}
          {isSignUp && ( // Solo registro: confirmar contraseña.
            <label>{/* Label de confirmación. */}
              Confirmar contraseña// Texto del label.
              <input// Campo controlado del formulario.
                type="password" /* Campo oculto. */
                autoComplete="new-password" /* Gestor de contraseñas. */
                minLength="6" /* Mínimo 6. */
                value={confirmPassword} /* Valor controlado. */
                onChange={(event) => setConfirmPassword(event.target.value)} /* Guarda la confirmación. */
                required /* Obligatorio en signup. */
              />{/* Cierra el input. */}
            </label>// Cierra el <label>.
          )} // Cierra el condicional JSX.
          {message && ( // Muestra alerta solo si hay texto.
            <p className="auth-message" role="alert">{/* role=alert para lectores de pantalla. */}
              {message} // Contenido del mensaje.
            </p>// Cierra el <p>.
          )} // Cierra el condicional JSX.
          <button// Botón de acción.
            className="primary-button auth-submit" /* Botón principal del form. */
            type="submit" /* Dispara handleSubmit. */
            disabled={loading} /* Inerte mientras hay red. */
          >  {/* Continúa el bloque. */}
            {loading // Texto dinámico.
              ? "Conectando..." // Esperando a Supabase.
              : isSignUp // Según el modo.
                ? "Crear mi cuenta" // CTA de registro.
                : "Iniciar sesión"} // CTA de login.
            <ArrowRight size={16} />{/* Flecha a la derecha del CTA. */}
          </button>{/* Cierra el <button>. */}
        </form>}{/* Cierra el <form>. */}
        {!needsVerification && !isRecovery && !isSignUp && ( // Link “olvidé mi contraseña” solo en login.
          <button className="switch-button" type="button" onClick={() => { setIsRecovery(true); setMessage(""); }}>¿Olvidaste tu contraseña?</button>/* Entra al flujo de recovery. */
        )} // Cierra el condicional JSX.
        {onDemo && !needsVerification && !isRecovery && ( // Demo solo si el padre lo pasó y no estamos en OTP/recovery.
          <button className="switch-button demo-button" type="button" onClick={onDemo}>{/* Entra sin cuenta. */}
            Explorar demostración// Copy del atajo demo.
          </button>// Cierra el <button>.
        )} // Cierra el condicional JSX.
        {!needsVerification && ( // Toggle login ↔ registro ↔ volver de recovery.
        <button// Botón de acción.
          className="switch-button" /* Estilo de enlace. */
          type="button" /* No envía ningún form. */
          onClick={() => { // Alterna modos.
            if (isRecovery) { setIsRecovery(false); setMessage(""); return; } // Desde recovery vuelve a login.
            setIsSignUp((current) => !current); // Invierte registro/login.
            setMessage(""); // Limpia alertas.
          }} // Cierra el objeto de estilo.
        >  {/* Continúa el bloque. */}
          {isSignUp // Copy según modo.
            ? "¿Ya tienes cuenta? Inicia sesión" // Desde signup.
            : isRecovery // Desde recovery.
              ? "Volver al inicio de sesión" // Regreso.
            : "¿No tienes cuenta? Regístrate"} // Desde login.
        </button>// Cierra el <button>.
        )} // Cierra el condicional JSX.
        <p className="auth-note">{/* Nota de privacidad / entorno. */}
          {hasSupabaseConfig // Hay backend real.
            ? "No guardamos contraseñas en este navegador." // Recordatorio de seguridad.
            : "Supabase no está configurado en este entorno. La demostración guarda datos solo en este dispositivo."} // Aviso de demo local.
        </p>{/* Cierra el <p>. */}
      </section>{/* Cierra el <section>. */}
    </main>// Cierra el <main>.
  ); // Cierra la llamada.
} // Fin de el bloque.

export default Login; // Exporta el componente para App.jsx.
