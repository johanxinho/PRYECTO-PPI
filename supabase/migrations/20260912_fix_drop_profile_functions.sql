-- Hotfix: drop functions before recreating with new return types.
-- Run this if 20260912_roles_avatar_messages_shared.sql failed with 42P13,
-- then re-run that migration (or run 20260912_roles_avatar_messages_shared.sql again;
-- it now includes these drops).

drop function if exists public.find_profile_by_email(text);
drop function if exists public.list_my_messages();
drop function if exists public.list_task_shares();
