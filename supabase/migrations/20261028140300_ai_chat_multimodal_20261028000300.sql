-- El frontend ya puede enviar imágenes a Gemini; conserva el contrato del historial aunque los datos binarios no se almacenan.
ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_messages_image_urls_array_check'
      AND conrelid = 'public.ai_messages'::regclass
  ) THEN
    ALTER TABLE public.ai_messages
      ADD CONSTRAINT ai_messages_image_urls_array_check
      CHECK (jsonb_typeof(image_urls) = 'array');
  END IF;
END $$;
