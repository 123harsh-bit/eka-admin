
CREATE POLICY "Client users can update own videos status"
ON public.videos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = videos.client_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = videos.client_id AND c.user_id = auth.uid()
  )
);
