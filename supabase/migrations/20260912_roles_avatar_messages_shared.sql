-- RECORDATE: roles ampliados, avatar, mensajes (inbox/enviados) y agendas compartidas enriquecidas
-- Ejecutar en el SQL Editor de Supabase si no usas CLI de migraciones.

-- 1) Roles: estudiante, padre, madre, profesor, trabajador
drop trigger if exists protect_profile_role on public.profiles;
drop function if exists public.prevent_profile_role_change();

alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles set role = 'estudiante' where role in ('student', 'Estudiante', 'estudiante');
update public.profiles set role = 'profesor' where role in ('admin', 'teacher', 'docente', 'Docente', 'profesor');
update public.profiles set role = 'padre' where lower(role) = 'padre';
update public.profiles set role = 'madre' where lower(role) = 'madre';
update public.profiles set role = 'trabajador' where lower(role) in ('trabajador', 'worker');
update public.profiles set role = 'estudiante' where role is null or role not in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador');

alter table public.profiles
  alter column role set default 'estudiante';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador'));

-- 2) Foto de perfil
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "avatars own insert" on storage.objects;
drop policy if exists "avatars own update" on storage.objects;
drop policy if exists "avatars own delete" on storage.objects;

create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars own insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars own update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars own delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Buscar perfil con rol y avatar (mensajes / compartir)
-- Drop functions whose return type changed (CREATE OR REPLACE cannot alter OUT row type)
drop function if exists public.find_profile_by_email(text);
drop function if exists public.list_my_messages();
drop function if exists public.list_task_shares();

create or replace function public.find_profile_by_email(requested_email text)
returns table (id uuid, full_name text, email text, role text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email, p.role, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and lower(p.email) = lower(trim(requested_email))
  limit 1;
$$;

revoke all on function public.find_profile_by_email(text) from public;
grant execute on function public.find_profile_by_email(text) to authenticated;

-- 4) Mensajes con datos del interlocutor (Recibidos / Enviados)
create or replace function public.list_my_messages()
returns table (
  id uuid,
  sender_id uuid,
  recipient_id uuid,
  body text,
  read_at timestamptz,
  created_at timestamptz,
  sender_name text,
  sender_email text,
  sender_avatar_url text,
  sender_role text,
  recipient_name text,
  recipient_email text,
  recipient_avatar_url text,
  recipient_role text
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.sender_id,
    m.recipient_id,
    m.body,
    m.read_at,
    m.created_at,
    sender.full_name,
    sender.email,
    sender.avatar_url,
    sender.role,
    recipient.full_name,
    recipient.email,
    recipient.avatar_url,
    recipient.role
  from public.messages m
  left join public.profiles sender on sender.id = m.sender_id
  left join public.profiles recipient on recipient.id = m.recipient_id
  where auth.uid() is not null
    and m.recipient_id is not null
    and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  order by m.created_at asc;
$$;

revoke all on function public.list_my_messages() from public;
grant execute on function public.list_my_messages() to authenticated;

create or replace function public.mark_messages_read(message_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare updated_count integer := 0;
begin
  if auth.uid() is null then
    return 0;
  end if;

  if message_ids is null then
    update public.messages
    set read_at = coalesce(read_at, now())
    where recipient_id = auth.uid()
      and read_at is null;
  else
    update public.messages
    set read_at = coalesce(read_at, now())
    where recipient_id = auth.uid()
      and id = any(message_ids)
      and read_at is null;
  end if;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_messages_read(uuid[]) from public;
grant execute on function public.mark_messages_read(uuid[]) to authenticated;

-- 5) Agendas compartidas: detalle de tarea + avatares (para que el destinatario vea el contenido)
create or replace function public.list_task_shares()
returns table (
  id uuid,
  task_id uuid,
  owner_id uuid,
  recipient_id uuid,
  task_title text,
  task_description text,
  task_subject text,
  task_date date,
  task_time time,
  task_priority text,
  task_completed boolean,
  task_reminder text,
  owner_name text,
  owner_email text,
  owner_avatar_url text,
  owner_role text,
  recipient_name text,
  recipient_email text,
  recipient_avatar_url text,
  recipient_role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.task_id,
    s.owner_id,
    s.recipient_id,
    t.title,
    t.description,
    t.subject,
    t.date,
    t.time,
    t.priority,
    t.completed,
    t.reminder,
    owner_profile.full_name,
    owner_profile.email,
    owner_profile.avatar_url,
    owner_profile.role,
    recipient_profile.full_name,
    recipient_profile.email,
    recipient_profile.avatar_url,
    recipient_profile.role,
    s.created_at
  from public.task_shares s
  join public.tasks t on t.id = s.task_id
  join public.profiles owner_profile on owner_profile.id = s.owner_id
  join public.profiles recipient_profile on recipient_profile.id = s.recipient_id
  where s.owner_id = auth.uid() or s.recipient_id = auth.uid()
  order by s.created_at desc;
$$;

revoke all on function public.list_task_shares() from public;
grant execute on function public.list_task_shares() to authenticated;

-- Asegurar lectura de adjuntos para destinatarios de agendas compartidas
drop policy if exists "attachments shared read" on public.task_attachments;
create policy "attachments shared read"
  on public.task_attachments for select
  using (
    exists (
      select 1
      from public.task_shares
      where task_id = task_attachments.task_id
        and recipient_id = auth.uid()
    )
  );

drop policy if exists "task attachments shared read" on storage.objects;
create policy "task attachments shared read"
  on storage.objects for select
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.task_attachments attachment
      join public.task_shares share on share.task_id = attachment.task_id
      where attachment.storage_path = name
        and share.recipient_id = auth.uid()
    )
  );

-- handle_new_user: rol por defecto estudiante y metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare chosen_role text;
begin
  chosen_role := coalesce(new.raw_user_meta_data->>'role', 'estudiante');
  if chosen_role not in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador') then
    chosen_role := 'estudiante';
  end if;

  insert into public.profiles (id, full_name, email, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    chosen_role,
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;
  return new;
end;
$$;
