
DROP POLICY IF EXISTS "Scoped voice-feedback uploads" ON storage.objects;
CREATE POLICY "Scoped voice-feedback uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-feedback' AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.user_id = auth.uid()
        AND POSITION(c.id::text IN storage.objects.name) > 0
    )
  )
);

DROP POLICY IF EXISTS "Scoped client-idea-images uploads" ON storage.objects;
CREATE POLICY "Scoped client-idea-images uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-idea-images' AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.user_id = auth.uid()
        AND POSITION(c.id::text IN storage.objects.name) > 0
    )
  )
);
