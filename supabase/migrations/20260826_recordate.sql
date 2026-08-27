create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists reminders_enabled boolean not null default true;
alter table public.profiles add column if not exists show_completed boolean not null default true;
alter table public.profiles add column if not exists browser_notifications_enabled boolean not null default false;
alter table public.profiles add column if not exists alarms_enabled boolean not null default true;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  subject text not null check (char_length(trim(subject)) > 0),
  date date not null,
  time time not null,
  priority text not null default 'Media' check (priority in ('Alta', 'Media', 'Baja')),
  reminder text not null default '30 minutos antes',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_task_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks for each row execute procedure public.touch_task_updated_at();

create table if not exists public.task_shares (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, recipient_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_shares enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles own row" on public.profiles;
drop policy if exists "profiles insert own row" on public.profiles;
drop policy if exists "profiles update own row" on public.profiles;
create policy "profiles own row" on public.profiles for select using (id = auth.uid());
create policy "profiles insert own row" on public.profiles for insert with check (id = auth.uid());
create policy "profiles update own row" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "tasks owner select" on public.tasks;
drop policy if exists "tasks owner or shared select" on public.tasks;
drop policy if exists "tasks owner insert" on public.tasks;
drop policy if exists "tasks owner update" on public.tasks;
drop policy if exists "tasks owner delete" on public.tasks;
create policy "tasks owner or shared select" on public.tasks for select using (user_id = auth.uid() or exists (select 1 from public.task_shares where task_id = tasks.id and recipient_id = auth.uid()));
create policy "tasks owner insert" on public.tasks for insert with check (user_id = auth.uid());
create policy "tasks owner update" on public.tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks owner delete" on public.tasks for delete using (user_id = auth.uid());

drop policy if exists "shares participants select" on public.task_shares;
drop policy if exists "shares owner insert" on public.task_shares;
drop policy if exists "shares owner delete" on public.task_shares;
create policy "shares participants select" on public.task_shares for select using (owner_id = auth.uid() or recipient_id = auth.uid());
create policy "shares owner insert" on public.task_shares for insert with check (owner_id = auth.uid() and exists (select 1 from public.tasks where id = task_id and user_id = auth.uid()));
create policy "shares owner delete" on public.task_shares for delete using (owner_id = auth.uid());

drop policy if exists "messages authenticated select" on public.messages;
drop policy if exists "messages own insert" on public.messages;
create policy "messages authenticated select" on public.messages for select using (auth.uid() is not null);
create policy "messages own insert" on public.messages for insert with check (sender_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

create or replace function public.share_task_by_email(requested_task_id uuid, recipient_email text)
returns public.task_shares language plpgsql security definer set search_path = public
as $$
declare recipient uuid; result public.task_shares;
begin
  if not exists (select 1 from public.tasks where id = requested_task_id and user_id = auth.uid()) then
    raise exception 'No tienes permiso para compartir esta tarea';
  end if;
  select id into recipient from public.profiles where lower(email) = lower(recipient_email);
  if recipient is null then raise exception 'No existe un usuario con ese correo'; end if;
  insert into public.task_shares (task_id, owner_id, recipient_id) values (requested_task_id, auth.uid(), recipient)
  on conflict (task_id, recipient_id) do update set created_at = now() returning * into result;
  return result;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql
as $$
begin
  if old.role is distinct from new.role and auth.uid() is not null then
    raise exception 'El rol solo puede ser asignado por un administrador del backend';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role before update on public.profiles for each row execute procedure public.prevent_profile_role_change();
