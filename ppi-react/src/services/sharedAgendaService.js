import { supabase } from '../supabaseClient';

export const sharedAgendaService = {
  // Share agenda with another user
  async shareAgenda(userId, targetEmail, tasks = []) {
    try {
      // Find target user by email
      const { data: targetUser, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', targetEmail)
        .single();

      if (findError) throw new Error('Usuario no encontrado');

      // Create shared agenda record
      const { data, error } = await supabase.from('shared_agendas').insert({
        owner_id: userId,
        shared_with_id: targetUser.id,
        tasks_data: tasks,
        created_at: new Date().toISOString(),
        status: 'active',
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error sharing agenda:', error);
      return { success: false, error: error.message };
    }
  },

  // Get shared agendas for current user
  async getSharedAgendas(userId) {
    try {
      const { data, error } = await supabase
        .from('shared_agendas')
        .select('*, owner:profiles!owner_id(full_name, email)')
        .eq('shared_with_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching shared agendas:', error);
      return [];
    }
  },

  // Revoke shared agenda
  async revokeSharedAgenda(agendaId) {
    try {
      const { error } = await supabase
        .from('shared_agendas')
        .update({ status: 'revoked' })
        .eq('id', agendaId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error revoking agenda:', error);
      return { success: false, error: error.message };
    }
  },
};
