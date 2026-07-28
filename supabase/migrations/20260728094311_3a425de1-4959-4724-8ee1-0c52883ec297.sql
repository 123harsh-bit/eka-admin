CREATE TABLE public.client_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'file',
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  notes text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_assets TO authenticated;
GRANT ALL ON public.client_assets TO service_role;

ALTER TABLE public.client_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client assets"
ON public.client_assets
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Internal team can view client assets"
ON public.client_assets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = client_assets.client_id
      AND c.is_active = true
  )
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
  )
);

CREATE TRIGGER update_client_assets_updated_at
BEFORE UPDATE ON public.client_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_client_assets_client_created ON public.client_assets (client_id, created_at DESC);
CREATE INDEX idx_client_assets_type ON public.client_assets (asset_type);
CREATE INDEX idx_notifications_recipient_created ON public.notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_videos_client_created ON public.videos (client_id, created_at DESC);
CREATE INDEX idx_videos_client_status ON public.videos (client_id, status);
CREATE INDEX idx_videos_assigned_editor_status_priority ON public.videos (assigned_editor, status, priority, date_planned) WHERE assigned_editor IS NOT NULL;
CREATE INDEX idx_videos_assigned_camera_status ON public.videos (assigned_camera_operator, status, shoot_date) WHERE assigned_camera_operator IS NOT NULL;
CREATE INDEX idx_videos_assigned_social_status ON public.videos (assigned_social_id, social_stage, status) WHERE assigned_social_id IS NOT NULL;
CREATE INDEX idx_writing_tasks_video_writer ON public.writing_tasks (video_id, assigned_writer) WHERE assigned_writer IS NOT NULL;
CREATE INDEX idx_design_tasks_video_designer ON public.design_tasks (video_id, assigned_designer) WHERE assigned_designer IS NOT NULL;
CREATE INDEX idx_activity_log_created ON public.activity_log (created_at DESC);

DROP POLICY IF EXISTS "Authenticated can view brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage brand assets" ON storage.objects;

CREATE POLICY "Admins can manage brand assets"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'brand-assets' AND public.is_admin())
WITH CHECK (bucket_id = 'brand-assets' AND public.is_admin());

CREATE POLICY "Internal team can view brand assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
  )
);