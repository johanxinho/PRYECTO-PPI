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
alter table public.profiles add column if not exists push_notifications_enabled boolean not null default false;

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
  recipient_id uuid references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.messages add column if not exists read_at timestamptz;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null check (type in ('reminder', 'alarm', 'share', 'message', 'system')),
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_request_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.ai_request_usage enable row level security;
drop policy if exists "ai usage own rows" on public.ai_request_usage;
create policy "ai usage own rows" on public.ai_request_usage for select using (user_id = auth.uid());

create or replace function public.consume_ai_request(request_limit integer default 30)
returns boolean language plpgsql security definer set search_path = public
as $$
declare usage_row public.ai_request_usage;
begin
  if auth.uid() is null then return false; end if;
  insert into public.ai_request_usage (user_id) values (auth.uid())
  on conflict (user_id) do nothing;
  select * into usage_row from public.ai_request_usage where user_id = auth.uid() for update;
  if usage_row.window_started_at <= now() - interval '1 hour' then
    update public.ai_request_usage set window_started_at = now(), request_count = 1 where user_id = auth.uid();
    return true;
  end if;
  if usage_row.request_count >= request_limit then return false; end if;
  update public.ai_request_usage set request_count = request_count + 1 where user_id = auth.uid();
  return true;
end;
$$;

revoke all on function public.consume_ai_request(integer) from public;
grant execute on function public.consume_ai_request(integer) to authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "task attachments own read" on storage.objects;
drop policy if exists "task attachments own insert" on storage.objects;
drop policy if exists "task attachments own delete" on storage.objects;
create policy "task attachments own read" on storage.objects for select using (bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "task attachments own insert" on storage.objects for insert with check (bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "task attachments own delete" on storage.objects for delete using (bucket_id = 'task-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.notifications enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.task_attachments enable row level security;

drop policy if exists "notifications own rows" on public.notifications;
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own rows" on public.notifications for select using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ai conversations own rows" on public.ai_conversations;
drop policy if exists "ai conversations own insert" on public.ai_conversations;
drop policy if exists "ai conversations own update" on public.ai_conversations;
create policy "ai conversations own rows" on public.ai_conversations for select using (user_id = auth.uid());
create policy "ai conversations own insert" on public.ai_conversations for insert with check (user_id = auth.uid());
create policy "ai conversations own update" on public.ai_conversations for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ai messages own rows" on public.ai_messages;
drop policy if exists "ai messages own insert" on public.ai_messages;
create policy "ai messages own rows" on public.ai_messages for select using (user_id = auth.uid());
create policy "ai messages own insert" on public.ai_messages for insert with check (user_id = auth.uid() and exists (select 1 from public.ai_conversations where id = conversation_id and user_id = auth.uid()));

drop policy if exists "push subscriptions own rows" on public.push_subscriptions;
create policy "push subscriptions own rows" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "attachments owner rows" on public.task_attachments;
create policy "attachments owner rows" on public.task_attachments for all using (user_id = auth.uid() and exists (select 1 from public.tasks where id = task_id and user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.tasks where id = task_id and user_id = auth.uid()));

drop policy if exists "messages private select" on public.messages;
drop policy if exists "messages private insert" on public.messages;
drop policy if exists "messages private update" on public.messages;
drop policy if exists "messages authenticated select" on public.messages;
drop policy if exists "messages own insert" on public.messages;
create policy "messages private select" on public.messages for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "messages private insert" on public.messages for insert with check (sender_id = auth.uid() and recipient_id is not null and recipient_id <> auth.uid());
create policy "messages private update" on public.messages for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create or replace function public.protect_message_fields()
returns trigger language plpgsql
as $$
begin
  if old.sender_id is distinct from new.sender_id or old.recipient_id is distinct from new.recipient_id or old.body is distinct from new.body then
    raise exception 'Solo se puede actualizar el estado de lectura';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_message_fields on public.messages;
create trigger protect_message_fields before update on public.messages for each row execute procedure public.protect_message_fields();

create or replace function public.find_profile_by_email(requested_email text)
returns table (id uuid, full_name text, email text)
language sql security definer set search_path = public
as $$
  select p.id, p.full_name, p.email
  from public.profiles p
  where auth.uid() is not null and lower(p.email) = lower(trim(requested_email))
  limit 1;
$$;

create or replace function public.notify_task_created()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, task_id, type, title, body)
  values (new.user_id, new.id, 'system', 'Tarea creada', new.title || ' · ' || new.subject);
  return new;
end;
$$;

drop trigger if exists task_created_notification on public.tasks;
create trigger task_created_notification after insert on public.tasks for each row execute procedure public.notify_task_created();

create or replace function public.notify_private_message()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body)
  values (new.recipient_id, 'message', 'Nuevo mensaje', left(new.body, 140));
  return new;
end;
$$;

drop trigger if exists private_message_notification on public.messages;
create trigger private_message_notification after insert on public.messages for each row when (new.recipient_id is not null) execute procedure public.notify_private_message();

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

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
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
  insert into public.notifications (user_id, task_id, type, title, body)
  values (recipient, requested_task_id, 'share', 'Nueva tarea compartida', 'Te compartieron una tarea académica.');
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
