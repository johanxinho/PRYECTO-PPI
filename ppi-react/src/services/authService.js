// @ts-nocheck
import { supabase } from '../supabaseClient';

/**
 * authService: operaciones reutilizables de autenticación.
 * Todas las rutas son null-safe si Supabase no está configurado.
 */
const missingBackend = () => ({
  success: false,
  error: 'Supabase no está configurado en este entorno.',
});

const SELF_SIGNUP_ROLES = ['estudiante', 'padre', 'madre', 'trabajador'];

export function sanitizeSignupRole(role) {
  return SELF_SIGNUP_ROLES.includes(role) ? role : 'estudiante';
}

/** Traduce errores comunes de Auth a español para quien consuma el servicio. */
export function translateAuthError(error) {
  const details = `${error?.message || ''} ${error?.code || ''}`.toLowerCase();
  if (!details.trim()) return 'Ocurrió un error de autenticación.';
  if (details.includes('already registered') || details.includes('user_already_exists')) {
    return 'Ese correo ya está registrado.';
  }
  if (details.includes('invalid login credentials') || details.includes('invalid_credentials')) {
    return 'El correo o la contraseña son incorrectos.';
  }
  if (details.includes('email not confirmed') || details.includes('email_not_confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión.';
  }
  if (details.includes('rate limit') || details.includes('too many')) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (details.includes('network') || details.includes('fetch')) {
    return 'No fue posible conectar con el servicio.';
  }
  // Conserva mensajes ya localizados; no expongas detalles arbitrarios de proveedores externos.
  const raw = error?.message || '';
  if (/[áéíóúñ¿¡]/i.test(raw) || /\b(el|la|los|las|usuario|correo|contraseña|ya|existe|debe|puede)\b/i.test(raw)) return raw;
  return 'No fue posible completar la operación de autenticación.';
}

const OAUTH_ERROR_KEYS = ['error', 'error_code', 'error_description', 'state'];

/**
 * Lee el error que el proveedor (Google) devuelve en la URL de retorno.
 * Supabase lo coloca en la query o en el hash, según el flujo usado.
 */
export function readOAuthErrorFromLocation(loc = typeof window !== 'undefined' ? window.location : null) {
  if (!loc) return null;
  for (const raw of [loc.search, loc.hash]) {
    if (!raw || raw.length < 2) continue;
    const params = new URLSearchParams(raw.replace(/^[?#]/, ''));
    const code = params.get('error');
    if (!code) continue;
    return {
      code,
      description: params.get('error_description') || params.get('error_code') || '',
    };
  }
  return null;
}

/** Quita los parámetros de error de la URL para que no reaparezcan al recargar. */
export function clearOAuthErrorFromLocation() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  let changed = false;
  const search = new URLSearchParams(url.search);
  if (search.has('error')) {
    OAUTH_ERROR_KEYS.forEach((key) => search.delete(key));
    url.search = search.toString();
    changed = true;
  }
  if (url.hash.includes('error=')) {
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    OAUTH_ERROR_KEYS.forEach((key) => hash.delete(key));
    url.hash = hash.toString();
    changed = true;
  }
  if (!changed) return;
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export const authService = {
  translateAuthError,
  async signup(email, password, fullName, role = 'estudiante') {
    if (!supabase) return missingBackend();
    try {
      const safeRole = sanitizeSignupRole(role);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: safeRole,
          },
        },
      });

      if (authError) throw authError;

      return { success: true, user: authData.user };
    } catch (error) {
      return { success: false, error: translateAuthError(error) };
    }
  },

  async login(email, password) {
    if (!supabase) return missingBackend();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, session: data.session };
    } catch (error) {
      return { success: false, error: translateAuthError(error) };
    }
  },

  async logout() {
    if (!supabase) return missingBackend();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: translateAuthError(error) };
    }
  },

  async getSession() {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  async getUserProfile(userId) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  },

  onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
};
