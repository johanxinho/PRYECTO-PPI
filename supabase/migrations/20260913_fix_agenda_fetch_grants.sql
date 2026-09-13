-- Asegura que el rol autenticado pueda leer la agenda y ejecutar RPCs usadas al entrar.
grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.notifications to authenticated;
grant select, insert, update, delete on table public.task_shares to authenticated;
grant select, insert, update, delete on table public.messages to authenticated;
grant select, insert, update, delete on table public.task_attachments to authenticated;

grant execute on function public.list_task_shares() to authenticated;
grant execute on function public.list_my_messages() to authenticated;
grant execute on function public.find_profile_by_email(text) to authenticated;
grant execute on function public.share_task_by_email(uuid, text) to authenticated;
grant execute on function public.mark_messages_read(uuid[]) to authenticated;

notify pgrst, 'reload schema';
