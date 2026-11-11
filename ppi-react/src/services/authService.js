import { localizeService } from "./localize.js";
// @ts-nocheck
import { supabase } from '../supabaseClient';

/**
 * authService: operaciones reutilizables de autenticación.
 * Todas las rutas son null-safe si Supabase no está configurado.
 */
const missingBackend = () => ({
  success: false,
  error: localizeService("services.backend.unavailable"),
});

const SELF_SIGNUP_ROLES = ['estudiante', 'padre', 'madre', 'trabajador'];

export function sanitizeSignupRole(role) {
  return SELF_SIGNUP_ROLES.includes(role) ? role : 'estudiante';
}

/** Mapea errores comunes de Auth al idioma activo sin exponer mensajes arbitrarios del proveedor. */
export function translateAuthError(error) {
  const details = `${error?.message || ''} ${error?.code || ''}`.toLowerCase();
  if (!details.trim()) return localizeService("services.auth.failed");
  if (details.includes('already registered') || details.includes('user_already_exists')) {
    return localizeService("services.auth.registered");
  }
  if (details.includes('invalid login credentials') || details.includes('invalid_credentials')) {
    return localizeService("services.auth.credentials");
  }
  if (details.includes('email not confirmed') || details.includes('email_not_confirmed')) {
    return localizeService("services.auth.confirmEmail");
  }
  if (details.includes('rate limit') || details.includes('too many')) {
    return localizeService("services.auth.rateLimit");
  }
  if (details.includes('network') || details.includes('fetch')) {
    return localizeService("services.auth.connection");
  }
  if (error) console.error("Authentication provider error", error);
  return localizeService("services.auth.operationFailed");
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
