-- Fix 42501: restaurar grants de authenticated tras hardening (RLS sigue aplicando).
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.task_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.messages TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.task_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_messages TO authenticated;
GRANT SELECT ON TABLE public.ai_request_usage TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
REVOKE ALL ON TABLE public.profiles, public.tasks, public.task_shares, public.messages, public.notifications, public.task_attachments, public.push_subscriptions, public.ai_conversations, public.ai_messages, public.ai_request_usage FROM anon;
