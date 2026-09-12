// @ts-nocheck
import { supabase } from '../supabaseClient'; // Cliente de autenticación y base de datos

// authService contiene las operaciones de autenticación reutilizables para
// registro, inicio de sesión, cierre de sesión y consulta de sesión.
export const authService = { // Objeto con métodos de Auth para no repetir código en los componentes
  /**
   * signup: crea una cuenta en Supabase Auth y envía el nombre completo
   * como metadata extra para que el trigger configure el perfil asociado.
   */
  async signup(email, password, fullName) { // Correo, contraseña y nombre del formulario de registro
    try { // Captura errores de red o de Auth
      // Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ // Pide a Auth crear el usuario
        email, // Correo de la cuenta
        password, // Contraseña
        options: { // Datos extra que viajan con el alta
          data: { // Metadata que el trigger puede copiar al perfil
            full_name: fullName, // Nombre completo
          },
        },
      });

      if (authError) throw authError; // Convierte el error de Auth en excepción

      return { success: true, user: authData.user }; // Alta correcta: devuelve el usuario
    } catch (error) { // Cualquier fallo (correo repetido, red, etc.)
      return { success: false, error: error.message }; // La UI muestra error.message
    }
  },

  /**
   * login: valida credenciales y devuelve la sesión activa si el usuario existe.
   */
  async login(email, password) { // Correo y contraseña del formulario de ingreso
    try { // Captura credenciales inválidas u otros errores
      const { data, error } = await supabase.auth.signInWithPassword({ // Inicio de sesión clásico
        email, // Correo
        password, // Contraseña
      });

      if (error) throw error; // Credencial incorrecta o usuario inexistente
      return { success: true, session: data.session }; // Sesión lista (token, user, etc.)
    } catch (error) { // Falla de login
      return { success: false, error: error.message }; // Mensaje para el formulario
    }
  },

  /**
   * logout: cierra la sesión actual del navegador y elimina la autenticación activa.
   */
  async logout() { // Cierra la sesión en este dispositivo
    try { // Puede fallar si ya no hay sesión
      const { error } = await supabase.auth.signOut(); // Invalida el token local
      if (error) throw error; // Error al salir
      return { success: true }; // Salida correcta
    } catch (error) { // Falla de logout
      return { success: false, error: error.message }; // Mensaje para la UI
    }
  },

  /**
   * getSession: obtiene la sesión actual para verificar si el usuario ya está autenticado.
   */
  async getSession() { // Sirve al arrancar la app para saber si hay usuario
    try { // Lectura de la sesión guardada
      const { data, error } = await supabase.auth.getSession(); // Pregunta a Auth
      if (error) throw error; // Error de lectura
      return data.session; // Sesión o null
    } catch (error) { // Falla inesperada
      console.error('Error getting session:', error); // Log para depurar
      return null; // La app trata como "no hay sesión"
    }
  },

  /**
   * getUserProfile: consulta el perfil público del usuario desde la tabla profiles.
   */
  async getUserProfile(userId) { // userId es el id de Auth / profiles
    try { // Lectura de una fila
      const { data, error } = await supabase // Consulta
        .from('profiles') // Tabla de perfiles
        .select('*') // Todos los campos del perfil
        .eq('id', userId) // Filtra por id
        .single(); // Una sola fila

      if (error) throw error; // No encontrado u otro error
      return data; // Perfil
    } catch (error) { // Falla de lectura
      console.error('Error getting profile:', error); // Log
      return null; // La UI puede mostrar un estado vacío
    }
  },

  /**
   * onAuthStateChange: conecta un listener para reaccionar cuando cambia el estado de autenticación.
   */
  onAuthStateChange(callback) { // callback recibe (event, session) cada vez que Auth cambia
    return supabase.auth.onAuthStateChange(callback); // Devuelve la suscripción para poder cancelarla
  },
};
