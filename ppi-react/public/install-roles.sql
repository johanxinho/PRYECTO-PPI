-- RECORDATE: instala administrador, profesor y bajas.
-- Ejecuta TODO este archivo de una vez en el SQL Editor.
-- Cuenta dueña: restrepojohan225@gmail.com
--
-- El error "Solo un administrador puede cambiar roles" salía porque un
-- trigger bloqueaba el UPDATE. Aquí se quita el trigger ANTES de asignar
-- el rol, y luego se vuelve a crear.

drop trigger if exists trg_protect_profile_fields on public.profiles;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador', 'administrador'));

alter table public.profiles add column if not exists status text;
update public.profiles set status = 'activo' where status is null;
alter table public.profiles alter column status set default 'activo';
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('activo', 'baja'));

alter table public.profiles add column if not exists disabled_at timestamptz;
alter table public.profiles add column if not exists disabled_by uuid;
alter table public.tasks add column if not exists assigned_by uuid;

update public.profiles
set role = 'administrador',
    status = 'activo',
    disabled_at = null,
    disabled_by = null
where lower(email) = 'restrepojohan225@gmail.com';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role = 'administrador'
        or lower(email) = 'restrepojohan225@gmail.com'
      )
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role in ('profesor', 'administrador')
        or lower(email) = 'restrepojohan225@gmail.com'
      )
  );
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lower(email) = 'restrepojohan225@gmail.com' then 'administrador'
    else role
  end
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.list_managed_users()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  status text,
  avatar_url text,
  created_at timestamptz,
  disabled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if not public.is_staff() then
    raise exception 'Solo el profesor o el administrador pueden ver el directorio.';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.role,
    coalesce(p.status, 'activo'),
    p.avatar_url,
    p.created_at,
    p.disabled_at
  from public.profiles p
  where p.id <> auth.uid()
    and (public.is_admin() or coalesce(p.status, 'activo') = 'activo')
  order by p.full_name asc, p.email asc;
end;
$$;

create or replace function public.set_user_status(target_id uuid, next_status text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare result public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede dar de baja o reactivar cuentas.';
  end if;
  if next_status not in ('activo', 'baja') then
    raise exception 'Estado no válido.';
  end if;
  if target_id = auth.uid() then
    raise exception 'No puedes darte de baja a ti mismo.';
  end if;

  update public.profiles
  set
    status = next_status,
    disabled_at = case when next_status = 'baja' then now() else null end,
    disabled_by = case when next_status = 'baja' then auth.uid() else null end
  where id = target_id
  returning * into result;
  return result;
end;
$$;

create or replace function public.set_user_role(target_id uuid, next_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare result public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede cambiar el rol de otra persona.';
  end if;
  if next_role not in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador', 'administrador') then
    raise exception 'Rol no permitido.';
  end if;
  if target_id = auth.uid() and next_role <> 'administrador' then
    raise exception 'No puedes quitarte el rol de administrador a ti mismo.';
  end if;

  update public.profiles
  set role = next_role
  where id = target_id
  returning * into result;
  return result;
end;
$$;

create or replace function public.assign_task_to_user(
  recipient_id uuid,
  task_title text,
  task_subject text,
  task_date date,
  task_time time,
  task_description text default null,
  task_priority text default 'Media',
  task_reminder text default '30 minutos antes'
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare created public.tasks;
declare recipient public.profiles%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Solo el profesor o el administrador pueden asignar tareas.';
  end if;
  if recipient_id is null or recipient_id = auth.uid() then
    raise exception 'Elige un usuario distinto a ti.';
  end if;
  select * into recipient from public.profiles where id = recipient_id;
  if not found then
    raise exception 'Ese usuario no está registrado.';
  end if;
  if coalesce(recipient.status, 'activo') = 'baja' then
    raise exception 'Esa cuenta está dada de baja.';
  end if;

  insert into public.tasks (
    user_id, title, description, subject, date, time, priority, reminder, completed, assigned_by
  ) values (
    recipient_id,
    trim(task_title),
    nullif(trim(coalesce(task_description, '')), ''),
    trim(task_subject),
    task_date,
    task_time,
    coalesce(task_priority, 'Media'),
    coalesce(nullif(trim(task_reminder), ''), '30 minutos antes'),
    false,
    auth.uid()
  )
  returning * into created;

  insert into public.notifications (user_id, task_id, type, title, body)
  values (recipient_id, created.id, 'system', 'Tarea asignada', created.title || ' · ' || created.subject);

  return created;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare chosen_role text;
begin
  chosen_role := coalesce(new.raw_user_meta_data->>'role', 'estudiante');
  if lower(new.email) = 'restrepojohan225@gmail.com' then
    chosen_role := 'administrador';
  elsif chosen_role not in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador') then
    chosen_role := 'estudiante';
  end if;

  insert into public.profiles (id, full_name, email, role, avatar_url, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    chosen_role,
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'activo'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = case
          when lower(excluded.email) = 'restrepojohan225@gmail.com' then 'administrador'
          else public.profiles.role
        end;
  return new;
end;
$$;

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el id del perfil';
  end if;
  if new.email is distinct from old.email then
    new.email := old.email;
  end if;
  if new.status is distinct from old.status and not public.is_admin() then
    new.status := old.status;
    new.disabled_at := old.disabled_at;
    new.disabled_by := old.disabled_by;
  end if;
  if new.role is distinct from old.role then
    if new.role not in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador', 'administrador') then
      raise exception 'Rol no permitido';
    end if;
    if not public.is_admin() then
      if new.role in ('profesor', 'administrador') then
        raise exception 'Solo un administrador puede asignar ese rol';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.list_managed_users() from public, anon;
revoke all on function public.set_user_status(uuid, text) from public, anon;
revoke all on function public.set_user_role(uuid, text) from public, anon;
revoke all on function public.assign_task_to_user(uuid, text, text, date, time, text, text, text) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.list_managed_users() to authenticated;
grant execute on function public.set_user_status(uuid, text) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.assign_task_to_user(uuid, text, text, date, time, text, text, text) to authenticated;

drop policy if exists "tasks assigned by staff select" on public.tasks;
create policy "tasks assigned by staff select"
  on public.tasks for select to authenticated
  using (assigned_by = auth.uid());

drop policy if exists "tasks assigned by staff update" on public.tasks;
create policy "tasks assigned by staff update"
  on public.tasks for update to authenticated
  using (assigned_by = auth.uid())
  with check (assigned_by = auth.uid());

drop policy if exists "tasks assigned by staff delete" on public.tasks;
create policy "tasks assigned by staff delete"
  on public.tasks for delete to authenticated
  using (assigned_by = auth.uid());
