-- security_tighten_grants_storage (live en oavqxmsyhmtnnwkyiycr)
-- Adjuntos: carpeta {uid}/… ; mensajes UPDATE solo read_at; no reasignar tasks.user_id; storage mime/size.

CREATE OR REPLACE FUNCTION public.protect_task_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'No se puede cambiar el dueño de la tarea';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_task_owner ON public.tasks;
CREATE TRIGGER trg_protect_task_owner
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.protect_task_owner();

-- Asegurar protect_message_fields (solo read_at)
CREATE OR REPLACE FUNCTION public.protect_message_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
      OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
      OR NEW.body IS DISTINCT FROM OLD.body THEN
      RAISE EXCEPTION 'Solo se puede marcar el mensaje como leído';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_message_fields ON public.messages;
CREATE TRIGGER protect_message_fields
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.protect_message_fields();

-- Storage task-attachments: ownership por primer segmento de path = auth.uid()
DROP POLICY IF EXISTS "task attachments own delete" ON storage.objects;
DROP POLICY IF EXISTS "task attachments own insert" ON storage.objects;
DROP POLICY IF EXISTS "task attachments own read" ON storage.objects;
DROP POLICY IF EXISTS "task attachments shared read" ON storage.objects;

CREATE POLICY "task attachments own delete" ON storage.objects
  FOR DELETE TO public
  USING ((bucket_id = 'task-attachments') AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] = (auth.uid())::text));

CREATE POLICY "task attachments own insert" ON storage.objects
  FOR INSERT TO public
  WITH CHECK ((bucket_id = 'task-attachments') AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] = (auth.uid())::text));

CREATE POLICY "task attachments own read" ON storage.objects
  FOR SELECT TO public
  USING ((bucket_id = 'task-attachments') AND (auth.uid() IS NOT NULL) AND ((storage.foldername(name))[1] = (auth.uid())::text));

CREATE POLICY "task attachments shared read" ON storage.objects
  FOR SELECT TO public
  USING ((bucket_id = 'task-attachments') AND (EXISTS (
    SELECT 1 FROM task_attachments attachment
    JOIN task_shares share ON share.task_id = attachment.task_id
    WHERE attachment.storage_path = objects.name AND share.recipient_id = auth.uid()
  )));

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'task-attachments';

UPDATE storage.buckets
SET file_size_limit = 4194304,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'ai-chat';

UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'avatars';
