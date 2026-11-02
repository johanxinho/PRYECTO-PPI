-- A user must still be an active staff member to read or manage tasks they assigned.
-- is_staff() resolves the current active profile role; assigned_by alone is not sufficient.
ALTER POLICY "tasks assigned by staff select"
  ON public.tasks
  USING (
    public.is_active_account()
    AND public.is_staff()
    AND assigned_by = auth.uid()
  );

ALTER POLICY "tasks assigned by staff update"
  ON public.tasks
  USING (
    public.is_active_account()
    AND public.is_staff()
    AND assigned_by = auth.uid()
  )
  WITH CHECK (
    public.is_active_account()
    AND public.is_staff()
    AND assigned_by = auth.uid()
  );

ALTER POLICY "tasks assigned by staff delete"
  ON public.tasks
  USING (
    public.is_active_account()
    AND public.is_staff()
    AND assigned_by = auth.uid()
  );
