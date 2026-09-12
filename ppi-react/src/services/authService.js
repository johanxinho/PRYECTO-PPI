// @ts-nocheck
import { supabase } from '../supabaseClient';

// authService contiene las operaciones de autenticación reutilizables para
// registro, inicio de sesión, cierre de sesión y consulta de sesión.
export const authService = {
  // signup: crea una cuenta en Supabase Auth y envía el nombre completo
  // como metadata extra para que el trigger configure el perfil asociada.
  async signup(email, password, fullName) {
    try {
      // Registrar usuario en Supabase Auth
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
      return { success: false, error: error.message };
    }
  },

  // login: valida credenciales y devuelve la sesión activa si el usuario existe.
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, session: data.session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // logout: cierra la sesión actual del navegador y elimina la autenticación activa.
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // getSession: obtiene la sesión actual para verificar si el usuario ya está autenticado.
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  // getUserProfile: consulta el perfil público del usuario desde la tabla profiles.
  async getUserProfile(userId) {
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

  // onAuthStateChange: conecta un listener para reaccionar cuando cambia el estado de autenticación.
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
