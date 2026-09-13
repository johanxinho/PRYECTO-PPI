-- Privilegios por columna (alineado al live tras fix 42501).
-- profiles: SELECT+INSERT tabla; UPDATE solo campos de perfil (no id/email).
-- messages: SELECT+INSERT; UPDATE solo read_at.
-- tasks: SELECT+INSERT+DELETE; UPDATE sin user_id/id/created_at.

REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (
  full_name, role, avatar_url, reminders_enabled, show_completed,
  browser_notifications_enabled, alarms_enabled, push_notifications_enabled
) ON TABLE public.profiles TO authenticated;

REVOKE UPDATE ON TABLE public.messages FROM authenticated;
GRANT UPDATE (read_at) ON TABLE public.messages TO authenticated;

REVOKE UPDATE ON TABLE public.tasks FROM authenticated;
GRANT UPDATE (
  title, description, subject, date, time, priority, reminder, completed,
  due_date, alarm, status, owner_id, assigned_to, updated_at
) ON TABLE public.tasks TO authenticated;
