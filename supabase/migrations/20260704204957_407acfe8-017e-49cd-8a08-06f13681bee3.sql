
CREATE POLICY "script-assets read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'script-assets');

CREATE POLICY "script-assets insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'script-assets' AND (
    public.is_admin()
    OR public.has_role(auth.uid(), 'writer'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'designer'::app_role)
    OR public.has_role(auth.uid(), 'social_executive'::app_role)
  )
);

CREATE POLICY "script-assets delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'script-assets' AND (
    public.is_admin() OR owner = auth.uid()
  )
);
