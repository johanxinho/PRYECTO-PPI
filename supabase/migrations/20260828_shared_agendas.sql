create or replace function public.share_task_by_email(requested_task_id uuid, recipient_email text)
returns public.task_shares language plpgsql security definer set search_path = public
as $$
declare recipient uuid; result public.task_shares;
begin
  if not exists (select 1 from public.tasks where id = requested_task_id and user_id = auth.uid()) then
    raise exception 'No tienes permiso para compartir esta tarea';
  end if;
  select id into recipient from public.profiles where lower(email) = lower(trim(recipient_email));
  if recipient is null then raise exception 'No existe un usuario con ese correo'; end if;
  if recipient = auth.uid() then raise exception 'No puedes compartir una tarea contigo mismo'; end if;
  select * into result from public.task_shares
  where task_id = requested_task_id and owner_id = auth.uid() and recipient_id = recipient;
  if found then return result; end if;
  insert into public.task_shares (task_id, owner_id, recipient_id)
  values (requested_task_id, auth.uid(), recipient)
  returning * into result;
  insert into public.notifications (user_id, task_id, type, title, body)
  values (recipient, requested_task_id, 'share', 'Nueva tarea compartida', 'Te compartieron una tarea académica.');
  return result;
end;
$$;

create or replace function public.list_task_shares()
returns table (
  id uuid,
  task_id uuid,
  owner_id uuid,
  recipient_id uuid,
  task_title text,
  owner_name text,
  owner_email text,
  recipient_name text,
  recipient_email text,
  created_at timestamptz
)
language sql security definer set search_path = public
as $$
  select s.id, s.task_id, s.owner_id, s.recipient_id, t.title,
    owner_profile.full_name, owner_profile.email,
    recipient_profile.full_name, recipient_profile.email, s.created_at
  from public.task_shares s
  join public.tasks t on t.id = s.task_id
  join public.profiles owner_profile on owner_profile.id = s.owner_id
  join public.profiles recipient_profile on recipient_profile.id = s.recipient_id
  where s.owner_id = auth.uid() or s.recipient_id = auth.uid()
  order by s.created_at desc;
$$;

revoke all on function public.list_task_shares() from public;
grant execute on function public.list_task_shares() to authenticated;
