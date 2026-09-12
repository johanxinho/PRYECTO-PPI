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

/** Traduce errores comunes de Auth a español para quien consuma el servicio. */
function translateAuthError(error) {
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
  // Si el mensaje ya viene en español o es corto, reutilízalo; si no, genérico.
  const raw = error?.message || '';
  if (/[áéíóúñ¿¡]/i.test(raw) || raw.length < 80) return raw;
  return 'No fue posible completar la operación de autenticación.';
}

export const authService = {
  async signup(email, password, fullName) {
    if (!supabase) return missingBackend();
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
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
