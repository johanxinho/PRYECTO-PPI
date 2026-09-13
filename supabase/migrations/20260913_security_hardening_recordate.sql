-- RECORDATE: hardening de seguridad (RLS grants, SECURITY DEFINER, perfiles, storage)

DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', r.tablename);
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM authenticated;', r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.usuarios, public.actividades, public.agendas_compartidas, public.cursos, public.matriculas, public.mensajes, public.recordatorios FROM authenticated, anon;

REVOKE EXECUTE ON FUNCTION public.consume_ai_request(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_profile_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_my_messages() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_task_shares() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_private_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.share_task_by_email(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.protect_message_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_task_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.find_profile_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_task_shares() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_task_by_email(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_task_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_message_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id OR NEW.body IS DISTINCT FROM OLD.body THEN
      RAISE EXCEPTION 'Solo se puede marcar el mensaje como leído';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'No se puede cambiar el id del perfil'; END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN NEW.email := OLD.email; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role NOT IN ('estudiante','padre','madre','profesor','trabajador') THEN
    RAISE EXCEPTION 'Rol no permitido';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

DROP POLICY IF EXISTS "Users can create their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their profile" ON public.profiles;

DROP POLICY IF EXISTS "ai usage own rows" ON public.ai_request_usage;
DROP POLICY IF EXISTS "ai usage own select" ON public.ai_request_usage;
CREATE POLICY "ai usage own select" ON public.ai_request_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

UPDATE storage.buckets SET file_size_limit = 4194304, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'] WHERE id = 'ai-chat';
UPDATE storage.buckets SET file_size_limit = 2097152, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'] WHERE id = 'avatars';
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'task-attachments';
