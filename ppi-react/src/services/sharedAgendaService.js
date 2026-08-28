import { supabase } from '../supabaseClient';

export const sharedAgendaService = {
  // Share agenda with another user
  async shareAgenda(userId, targetEmail, tasks = []) {
    try {
      if (!tasks.length) throw new Error('No hay actividades para compartir');
      const results = await Promise.all(tasks.map(async (task) => {
        const { data, error } = await supabase.rpc('share_task_by_email', {
          requested_task_id: task.id,
          recipient_email: targetEmail.trim().toLowerCase(),
        });
        if (error) throw error;
        return data;
      }));
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get shared agendas for current user
  async getSharedAgendas(userId) {
    try {
      const { data, error } = await supabase
        .from('task_shares')
        .select('id,task_id,owner_id,recipient_id,created_at,tasks(title,subject,date,time,priority,completed)')
        .or(`owner_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Revoke shared agenda
  async revokeSharedAgenda(agendaId) {
    try {
      const { error } = await supabase
        .from('task_shares')
        .delete()
        .eq('id', agendaId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
