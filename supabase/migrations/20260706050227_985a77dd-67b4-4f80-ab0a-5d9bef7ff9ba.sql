DROP POLICY IF EXISTS scripts_insert ON public.scripts;
CREATE POLICY scripts_insert ON public.scripts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());