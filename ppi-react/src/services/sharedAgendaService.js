// @ts-nocheck
import { supabase } from '../supabaseClient'; // Cliente para RPC y tablas de compartición

export const sharedAgendaService = { // Métodos para compartir, listar y revocar agendas
  /**
   * shareAgenda: comparte cada tarea de la lista con el correo destino
   * usando la función SQL share_task_by_email.
   */
  async shareAgenda(userId, targetEmail, tasks = []) { // userId no se usa en el RPC; tasks son las actividades
    try { // Captura errores de validación o de red
      if (!tasks.length) throw new Error('No hay actividades para compartir'); // No se comparte una lista vacía
      const results = await Promise.all(tasks.map(async (task) => { // Lanza un RPC por cada tarea en paralelo
        const { data, error } = await supabase.rpc('share_task_by_email', { // Función SQL segura
          requested_task_id: task.id, // Id de la tarea
          recipient_email: targetEmail.trim().toLowerCase(), // Correo limpio y en minúsculas
        });
        if (error) throw error; // Si una falla, se aborta el lote
        return data; // Resultado de esa tarea
      }));
      return { success: true, data: results }; // Todas se compartieron
    } catch (error) { // Lista vacía, correo inválido, etc.
      return { success: false, error: error.message }; // La UI muestra el mensaje
    }
  },

  /**
   * getSharedAgendas: lista las comparticiones donde el usuario es dueño o destinatario.
   */
  async getSharedAgendas(userId) { // userId filtra owner o recipient
    try { // Lectura de task_shares
      const { data, error } = await supabase // Consulta
        .from('task_shares') // Tabla de relaciones de compartición
        .select('id,task_id,owner_id,recipient_id,created_at,tasks(title,subject,date,time,priority,completed)') // Incluye datos de la tarea relacionada
        .or(`owner_id.eq.${userId},recipient_id.eq.${userId}`) // Dueño o receptor
        .order('created_at', { ascending: false }); // Más recientes primero

      if (error) throw error; // Error de lectura
      return data || []; // Arreglo (vacío si no hay)
    } catch (error) { // Falla de consulta
      return { success: false, error: error.message }; // Formato de error para la UI
    }
  },

  /**
   * revokeSharedAgenda: elimina una compartición por su id.
   */
  async revokeSharedAgenda(agendaId) { // agendaId es el id de la fila en task_shares
    try { // Borrado
      const { error } = await supabase // Delete
        .from('task_shares') // Tabla de shares
        .delete() // Operación de eliminación
        .eq('id', agendaId); // Solo esa fila

      if (error) throw error; // Error al borrar
      return { success: true }; // Revocada
    } catch (error) { // Falla
      return { success: false, error: error.message }; // Mensaje para la UI
    }
  },
};
