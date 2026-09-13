// @ts-nocheck
import { supabase } from '../supabaseClient';
import { listSharedTasks, revokeSharedTask, shareTask } from '../dataService';

export const sharedAgendaService = {
  async shareAgenda(userId, targetEmail, tasks = []) {
    try {
      if (!tasks.length) throw new Error('No hay actividades para compartir');
      const results = await Promise.all(
        tasks.map(async (task) => shareTask(task.id, targetEmail)),
      );
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getSharedAgendas(userId) {
    try {
      if (userId) {
        const data = await listSharedTasks();
        return data;
      }
      const { data, error } = await supabase
        .from('task_shares')
        .select('id,task_id,owner_id,recipient_id,created_at,tasks(title,description,subject,date,time,priority,completed,reminder,task_attachments(id,storage_path,file_name,content_type))')
        .or(`owner_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async revokeSharedAgenda(agendaId) {
    try {
      await revokeSharedTask(agendaId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
