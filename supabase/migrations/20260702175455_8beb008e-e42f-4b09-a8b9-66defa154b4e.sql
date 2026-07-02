
-- Add social exec assignment + workflow stage on videos
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS assigned_social_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS social_stage text,
  ADD COLUMN IF NOT EXISTS social_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS social_posted_at timestamptz;

-- RLS: social executives see + update their assigned videos
DROP POLICY IF EXISTS "Social exec view assigned videos" ON public.videos;
CREATE POLICY "Social exec view assigned videos" ON public.videos
  FOR SELECT USING (assigned_social_id = auth.uid());

DROP POLICY IF EXISTS "Social exec update assigned videos" ON public.videos;
CREATE POLICY "Social exec update assigned videos" ON public.videos
  FOR UPDATE USING (assigned_social_id = auth.uid());

-- Allow social_executive in team-view policy too
DROP POLICY IF EXISTS "Team can view all videos" ON public.videos;
CREATE POLICY "Team can view all videos" ON public.videos
  FOR SELECT USING (
    has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'designer'::app_role)
    OR has_role(auth.uid(), 'writer'::app_role)
    OR has_role(auth.uid(), 'camera_operator'::app_role)
  );

-- Auto-assign default social exec on approval, and auto-live when posted
CREATE OR REPLACE FUNCTION public.videos_social_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_social uuid;
BEGIN
  -- On transition into approved/ready_to_upload, auto-assign a default social exec if none set
  IF (TG_OP = 'UPDATE') AND NEW.status IN ('approved','ready_to_upload')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.assigned_social_id IS NULL THEN
    SELECT ur.user_id INTO default_social
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'social_executive' AND p.is_active = true
    ORDER BY p.created_at ASC
    LIMIT 1;
    IF default_social IS NOT NULL THEN
      NEW.assigned_social_id := default_social;
      IF NEW.social_stage IS NULL THEN NEW.social_stage := 'queued'; END IF;
    END IF;
  END IF;

  -- When marked posted with a live_url, flip to live
  IF NEW.social_stage = 'posted' AND NEW.live_url IS NOT NULL AND NEW.live_url <> ''
     AND NEW.status <> 'live' THEN
    NEW.status := 'live';
    IF NEW.social_posted_at IS NULL THEN NEW.social_posted_at := now(); END IF;
    IF NEW.date_delivered IS NULL THEN NEW.date_delivered := CURRENT_DATE; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_videos_social_workflow ON public.videos;
CREATE TRIGGER trg_videos_social_workflow
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.videos_social_workflow();
