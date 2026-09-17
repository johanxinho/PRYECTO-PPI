-- RECORDATE: perfil administrador (dar de baja), profesor (ver usuarios y asignar tareas)
-- y puente con las tablas del modelo PPI (usuarios, actividades, …).
-- Ejecutar en el SQL Editor de Supabase si no usas CLI de migraciones.

-- 1) Rol administrador + estado de cuenta
alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles set role = 'estudiante'
  where role is null or role not in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador', 'administrador');

alter table public.profiles
  alter column role set default 'estudiante';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador', 'administrador'));

alter table public.profiles
  add column if not exists status text not null default 'activo';

update public.profiles set status = 'activo' where status is null or status not in ('activo', 'baja');

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('activo', 'baja'));

alter table public.profiles add column if not exists disabled_at timestamptz;
alter table public.profiles add column if not exists disabled_by uuid references public.profiles(id) on delete set null;

alter table public.tasks add column if not exists assigned_by uuid references public.profiles(id) on delete set null;

create index if not exists tasks_assigned_by_idx on public.tasks (assigned_by);
create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_role_idx on public.profiles (role);

-- 2) Enlace con las tablas de papel del PPI (id entero ↔ uuid de Auth)
create table if not exists public.papel_links (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  usuario_id bigint,
  papel text not null default 'estudiante',
  estado text not null default 'activo' check (estado in ('activo', 'baja')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.papel_links enable row level security;

drop policy if exists "papel links own read" on public.papel_links;
create policy "papel links own read"
  on public.papel_links for select to authenticated
  using (profile_id = auth.uid());

grant select on public.papel_links to authenticated;

-- 3) Helpers de rol
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), '') = 'administrador'
    and coalesce((select status from public.profiles where id = auth.uid()), 'activo') = 'activo';
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), '') in ('profesor', 'administrador')
    and coalesce((select status from public.profiles where id = auth.uid()), 'activo') = 'activo';
$$;

revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- 4) Sincroniza profiles con usuarios / papel_links si esas tablas existen
create or replace function public.sync_papel_account(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles%rowtype;
  has_usuarios boolean;
  email_col text;
  name_col text;
  role_col text;
  status_col text;
  auth_col text;
  found_id bigint;
  insert_sql text;
begin
  select * into p from public.profiles where id = target_id;
  if not found then
    return;
  end if;

  insert into public.papel_links (profile_id, papel, estado, updated_at)
  values (p.id, p.role, p.status, now())
  on conflict (profile_id) do update
    set papel = excluded.papel,
        estado = excluded.estado,
        updated_at = now();

  has_usuarios := to_regclass('public.usuarios') is not null;
  if not has_usuarios then
    return;
  end if;

  select c.column_name into email_col
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'usuarios'
    and c.column_name in ('correo', 'email', 'correo_electronico')
  order by case c.column_name when 'correo' then 1 when 'email' then 2 else 3 end
  limit 1;

  select c.column_name into name_col
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'usuarios'
    and c.column_name in ('nombre', 'nombre_completo', 'full_name', 'nombres')
  order by 1
  limit 1;

  select c.column_name into role_col
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'usuarios'
    and c.column_name in ('rol', 'role', 'tipo', 'papel')
  limit 1;

  select c.column_name into status_col
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'usuarios'
    and c.column_name in ('estado', 'status', 'activo')
  limit 1;

  select c.column_name into auth_col
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'usuarios'
    and c.column_name in ('auth_user_id', 'profile_id', 'user_id', 'id_auth')
  limit 1;

  if auth_col is null then
    begin
      execute 'alter table public.usuarios add column if not exists auth_user_id uuid unique';
      auth_col := 'auth_user_id';
    exception when others then
      auth_col := null;
    end;
  end if;

  if email_col is null then
    return;
  end if;

  execute format('select min(id)::bigint from public.usuarios where lower(%I::text) = lower($1)', email_col)
    into found_id
    using p.email;

  if found_id is null then
    insert_sql := format(
      'insert into public.usuarios (%s) values (%s) returning id',
      concat_ws(
        ', ',
        email_col,
        name_col,
        role_col,
        status_col,
        auth_col
      ),
      concat_ws(
        ', ',
        '$1',
        case when name_col is null then null else '$2' end,
        case when role_col is null then null else '$3' end,
        case when status_col is null then null else '$4' end,
        case when auth_col is null then null else '$5' end
      )
    );
    begin
      execute insert_sql into found_id using p.email, p.full_name, p.role, p.status, p.id;
    exception when others then
      found_id := null;
    end;
  else
    begin
      if name_col is not null then
        execute format('update public.usuarios set %I = $1 where id = $2', name_col) using p.full_name, found_id;
      end if;
      if role_col is not null then
        execute format('update public.usuarios set %I = $1 where id = $2', role_col) using p.role, found_id;
      end if;
      if status_col is not null then
        execute format('update public.usuarios set %I = $1 where id = $2', status_col) using p.status, found_id;
      end if;
      if auth_col is not null then
        execute format('update public.usuarios set %I = $1 where id = $2', auth_col) using p.id, found_id;
      end if;
    exception when others then
      null;
    end;
  end if;

  if found_id is not null then
    update public.papel_links
    set usuario_id = found_id, updated_at = now()
    where profile_id = p.id;
  end if;
end;
$$;

revoke all on function public.sync_papel_account(uuid) from public, anon, authenticated;

-- 5) handle_new_user: incluye administrador y sincroniza papel
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare chosen_role text;
begin
  chosen_role := coalesce(new.raw_user_meta_data->>'role', 'estudiante');
  if chosen_role not in ('estudiante', 'padre', 'madre', 'profesor', 'trabajador', 'administrador') then
    chosen_role := 'estudiante';
  end if;
  -- Nadie se auto-registra como administrador: el primer admin se reclama desde la app.
  if chosen_role = 'administrador' then
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
        email = excluded.email;

  perform public.sync_papel_account(new.id);
  return new;
end;
$$;

-- 6) El usuario no puede auto-promoverse a profesor/admin ni reactivarse
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
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
    if new.role in ('profesor', 'administrador') and not public.is_admin() then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

-- 7) Políticas: el profesor/admin ve las tareas que asignó
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

-- 8) Directorio de usuarios
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
    p.status,
    p.avatar_url,
    p.created_at,
    p.disabled_at
  from public.profiles p
  where p.id <> auth.uid()
    and (
      public.is_admin()
      or p.status = 'activo'
    )
  order by p.full_name asc, p.email asc;
end;
$$;

revoke all on function public.list_managed_users() from public, anon;
grant execute on function public.list_managed_users() to authenticated;

-- 9) Primer administrador de la institución
create or replace function public.claim_admin_role()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if exists (select 1 from public.profiles where role = 'administrador' and status = 'activo') then
    raise exception 'Ya existe un administrador. Pídele que te asigne el rol.';
  end if;

  update public.profiles
  set role = 'administrador', status = 'activo', disabled_at = null, disabled_by = null
  where id = auth.uid()
  returning * into result;

  perform public.sync_papel_account(auth.uid());
  return result;
end;
$$;

revoke all on function public.claim_admin_role() from public, anon;
grant execute on function public.claim_admin_role() to authenticated;

-- 10) Dar de baja / reactivar (solo administrador)
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
  if not exists (select 1 from public.profiles where id = target_id) then
    raise exception 'Ese usuario no existe.';
  end if;

  update public.profiles
  set
    status = next_status,
    disabled_at = case when next_status = 'baja' then now() else null end,
    disabled_by = case when next_status = 'baja' then auth.uid() else null end
  where id = target_id
  returning * into result;

  perform public.sync_papel_account(target_id);
  return result;
end;
$$;

revoke all on function public.set_user_status(uuid, text) from public, anon;
grant execute on function public.set_user_status(uuid, text) to authenticated;

-- 11) Cambiar rol (solo administrador)
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

  perform public.sync_papel_account(target_id);
  return result;
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- 12) El profesor asigna una tarea al estudiante (tasks + actividades del PPI)
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
declare
  created public.tasks;
  recipient public.profiles%rowtype;
  has_actividades boolean;
  student_fk bigint;
  staff_fk bigint;
  insert_cols text := '';
  insert_vals text := '';
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if not public.is_staff() then
    raise exception 'Solo el profesor o el administrador pueden asignar tareas.';
  end if;
  if recipient_id is null or recipient_id = auth.uid() then
    raise exception 'Elige un usuario distinto a ti para asignar la tarea.';
  end if;
  if length(trim(coalesce(task_title, ''))) = 0 or length(trim(coalesce(task_subject, ''))) = 0 then
    raise exception 'La tarea necesita título y materia.';
  end if;
  if task_date is null or task_time is null then
    raise exception 'La tarea necesita fecha y hora.';
  end if;
  if coalesce(task_priority, 'Media') not in ('Alta', 'Media', 'Baja') then
    raise exception 'Prioridad no válida.';
  end if;

  select * into recipient from public.profiles where id = recipient_id;
  if not found then
    raise exception 'Ese usuario no está registrado.';
  end if;
  if recipient.status = 'baja' then
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
  values (
    recipient_id,
    created.id,
    'system',
    'Tarea asignada',
    created.title || ' · ' || created.subject
  );

  perform public.sync_papel_account(recipient_id);
  perform public.sync_papel_account(auth.uid());

  has_actividades := to_regclass('public.actividades') is not null;
  if has_actividades then
    select usuario_id into student_fk from public.papel_links where profile_id = recipient_id;
    select usuario_id into staff_fk from public.papel_links where profile_id = auth.uid();

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'actividades' and column_name = 'fecha_a'
    ) then
      insert_cols := 'fecha_a';
      insert_vals := quote_literal(created.date);
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'actividades' and column_name = 'actividad_a'
    ) then
      insert_cols := concat_ws(', ', nullif(insert_cols, ''), 'actividad_a');
      insert_vals := concat_ws(', ', nullif(insert_vals, ''), quote_literal(created.title));
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'actividades' and column_name = 'alarma_a'
    ) then
      insert_cols := concat_ws(', ', nullif(insert_cols, ''), 'alarma_a');
      insert_vals := concat_ws(', ', nullif(insert_vals, ''), quote_literal('SI'));
    end if;
    if student_fk is not null and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'actividades' and column_name = 'id_estudiante_fk'
    ) then
      insert_cols := concat_ws(', ', nullif(insert_cols, ''), 'id_estudiante_fk');
      insert_vals := concat_ws(', ', nullif(insert_vals, ''), student_fk::text);
    end if;
    if staff_fk is not null and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'actividades' and column_name = 'id_administrador_fk'
    ) and public.is_admin() then
      insert_cols := concat_ws(', ', nullif(insert_cols, ''), 'id_administrador_fk');
      insert_vals := concat_ws(', ', nullif(insert_vals, ''), staff_fk::text);
    elsif staff_fk is not null and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'actividades' and column_name = 'id_trabajador_fk'
    ) then
      insert_cols := concat_ws(', ', nullif(insert_cols, ''), 'id_trabajador_fk');
      insert_vals := concat_ws(', ', nullif(insert_vals, ''), staff_fk::text);
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'actividades' and column_name = 'task_id'
    ) then
      insert_cols := concat_ws(', ', nullif(insert_cols, ''), 'task_id');
      insert_vals := concat_ws(', ', nullif(insert_vals, ''), quote_literal(created.id::text));
    end if;

    if insert_cols is not null and length(insert_cols) > 0 then
      begin
        execute format('insert into public.actividades (%s) values (%s)', insert_cols, insert_vals);
      exception when others then
        null;
      end;
    end if;
  end if;

  return created;
end;
$$;

revoke all on function public.assign_task_to_user(uuid, text, text, date, time, text, text, text) from public, anon;
grant execute on function public.assign_task_to_user(uuid, text, text, date, time, text, text, text) to authenticated;

-- 13) Cuentas dadas de baja no deben operar
create or replace function public.assert_active_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and status = 'baja'
  ) then
    raise exception 'Tu cuenta está dada de baja. Habla con el administrador.';
  end if;
end;
$$;

revoke all on function public.assert_active_account() from public, anon;
grant execute on function public.assert_active_account() to authenticated;
