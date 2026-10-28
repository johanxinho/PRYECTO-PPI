-- Los roles privilegiados nunca provienen de user_metadata controlado por el cliente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'estudiante');
  IF requested_role NOT IN ('estudiante', 'padre', 'madre', 'trabajador') THEN
    requested_role := 'estudiante';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, avatar_url, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    requested_role,
    NULLIF(new.raw_user_meta_data->>'avatar_url', ''),
    'activo'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        avatar_url = EXCLUDED.avatar_url;

  RETURN new;
END;
$$;

-- Defensa adicional para clientes que intenten insertar profiles directamente por PostgREST.
DROP POLICY IF EXISTS "profiles insert own row" ON public.profiles;
CREATE POLICY "profiles insert own row"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('estudiante', 'padre', 'madre', 'trabajador')
    AND COALESCE(status, 'activo') = 'activo'
    AND COALESCE(is_active, true) = true
    AND disabled_at IS NULL
  );

-- La función de trigger no es una API RPC para clientes.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- El primer administrador se provisiona desde un contexto confiable, nunca por autoclaim.
DROP FUNCTION IF EXISTS public.claim_admin_role();

-- Los RPC deben requerir una sesión; sus cuerpos conservan las comprobaciones de rol.
REVOKE EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_directory() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_directory_profiles() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_directory_profiles() TO authenticated;
