-- Preferencias de audio del navegador y trazabilidad de importaciones de Google Classroom.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alarm_sound text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS alarm_volume numeric(3,2) NOT NULL DEFAULT 0.55;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_alarm_sound_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_alarm_sound_check
      CHECK (alarm_sound IN ('classic', 'digital', 'chime', 'gentle'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_alarm_volume_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_alarm_volume_check
      CHECK (alarm_volume >= 0 AND alarm_volume <= 1);
  END IF;
END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'recordate',
  ADD COLUMN IF NOT EXISTS external_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_source_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_source_check
      CHECK (source IN ('recordate', 'google_classroom'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_google_classroom_external_id
  ON public.tasks (user_id, source, external_id)
  WHERE source = 'google_classroom' AND external_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
