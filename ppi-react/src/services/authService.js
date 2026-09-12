// @ts-nocheck
import { supabase } from '../supabaseClient'; // Cliente de autenticación y base de datos

// authService concentra Auth reutilizable. Si Supabase no está configurado,
// cada método falla con un mensaje claro en vez de romper con null.
const missingBackend = () => ({ success: false, error: 'Supabase no está configurado en este entorno.' });

export const authService = {
  async signup(email, password, fullName) {
    if (!supabase) return missingBackend();
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (authError) throw authError;
      return { success: true, user: authData.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async login(email, password) {
    if (!supabase) return missingBackend();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, session: data.session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async logout() {
    if (!supabase) return missingBackend();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
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
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
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
