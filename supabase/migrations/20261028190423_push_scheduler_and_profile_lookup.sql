-- Harden profile lookup so inactive accounts cannot enumerate contacts.
CREATE OR REPLACE FUNCTION public.find_profile_by_email(requested_email text)
RETURNS TABLE(id uuid, full_name text, email text, role text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT p.id, p.full_name, p.email, p.role, p.avatar_url
  FROM public.profiles AS p
  WHERE auth.uid() IS NOT NULL
    AND public.is_active_account()
    AND requested_email IS NOT NULL
    AND length(trim(requested_email)) BETWEEN 3 AND 254
    AND lower(p.email) = lower(trim(requested_email))
    AND p.is_active = true
    AND COALESCE(p.status, 'activo') = 'activo'
    AND p.disabled_at IS NULL
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.find_profile_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_by_email(text) TO authenticated;

-- Preserve the wall-clock timezone chosen when a task is created. Existing records
-- use the institution's timezone; new tasks store the device's IANA timezone.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'America/Bogota';

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_time_zone_format_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_time_zone_format_check
      CHECK (time_zone ~ '^[A-Za-z0-9_+./-]{1,64}$');
  END IF;
END;
$migration$;

-- Delivery state is service-only. The unique key prevents duplicate pushes per
-- task, browser subscription, and scheduled instant.
CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'sent', 'failed', 'gone')),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE (subscription_id, task_id, scheduled_for)
);

ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_delivery_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.push_delivery_log TO service_role;

CREATE INDEX IF NOT EXISTS push_delivery_log_created_at_idx
  ON public.push_delivery_log (created_at);
CREATE INDEX IF NOT EXISTS push_delivery_log_task_schedule_idx
  ON public.push_delivery_log (task_id, scheduled_for);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS tasks_push_reminder_due_idx
  ON public.tasks (user_id, date)
  WHERE completed = false AND reminder IS NOT NULL;

-- Supabase-native Web Push scheduler. Credentials are read from Vault at run time;
-- no service-role key is stored in the cron job or sent over pg_net.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $secrets$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'recordate_push_scheduler_secret'
  ) OR NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'recordate_push_publishable_key'
  ) THEN
    RAISE EXCEPTION 'Required RECORDATE Web Push Vault secrets are missing';
  END IF;
END;
$secrets$;

DO $jobs$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN (
    'recordate-send-push-every-minute',
    'recordate-cleanup-push-delivery-log'
  );
END;
$jobs$;

SELECT cron.schedule(
  'recordate-send-push-every-minute',
  '* * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://oavqxmsyhmtnnwkyiycr.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'recordate_push_publishable_key'),
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'recordate_push_publishable_key'),
        'x-push-scheduler-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'recordate_push_scheduler_secret')
      ),
      body := jsonb_build_object('triggered_at', now()),
      timeout_milliseconds := 30000
    ) AS request_id;
  $job$
);

-- Keep the service-only idempotency table bounded over time.
SELECT cron.schedule(
  'recordate-cleanup-push-delivery-log',
  '17 3 * * *',
  $$DELETE FROM public.push_delivery_log WHERE created_at < now() - interval '90 days'$$
);
