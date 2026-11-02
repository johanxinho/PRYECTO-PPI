-- Restore the least-privilege execute grant required by the authenticated ai-chat Edge Function.
-- The function is SECURITY DEFINER and binds usage to auth.uid(); anon and PUBLIC remain denied.
REVOKE ALL ON FUNCTION public.consume_ai_request(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_request(integer) TO authenticated;
