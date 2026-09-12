-- Historial y rate-limit del asistente IA (Gemini vía Edge Function ai-chat).
-- Ya aplicado en el proyecto; este archivo documenta el esquema en el repo.

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role = any (array['user'::text, 'assistant'::text, 'tool'::text])),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_request_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_request_usage enable row level security;
