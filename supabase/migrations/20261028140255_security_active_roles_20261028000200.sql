-- Seguridad de cuentas y roles: la autorización depende del perfil activo en Supabase.
CREATE OR REPLACE FUNCTION public.is_active_account()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND COALESCE(status, 'activo') = 'activo'
      AND disabled_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND public.is_active_account();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() = 'administrador';
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() IN ('profesor', 'administrador');
$$;

CREATE OR REPLACE FUNCTION public.is_profesor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() = 'profesor';
$$;

CREATE OR REPLACE FUNCTION public.assert_active_account()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_active_account() THEN
    RAISE EXCEPTION 'account_inactive' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.is_active_account() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_profesor() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assert_active_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profesor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_active_account() TO authenticated;

-- Agrega la condición sin reemplazar las reglas de ownership ya auditadas.
DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND NOT (tablename = 'profiles' AND policyname = 'profiles insert own row')
  LOOP
    IF policy_row.qual IS NOT NULL
       AND position('is_active_account()' IN policy_row.qual) = 0 THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (public.is_active_account() AND (%s))',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        policy_row.qual
      );
    END IF;
    IF policy_row.with_check IS NOT NULL
       AND position('is_active_account()' IN policy_row.with_check) = 0 THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (public.is_active_account() AND (%s))',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        policy_row.with_check
      );
    END IF;
  END LOOP;
END $$;
