-- Create scheduled_posts table
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  created_by UUID NOT NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_type TEXT NOT NULL DEFAULT 'image', -- image, video, carousel, reel, story
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb, -- ["instagram","facebook","youtube","linkedin"]
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, ready, published, failed
  linked_video_id UUID,
  linked_design_task_id UUID,
  platform_urls JSONB NOT NULL DEFAULT '{}'::jsonb, -- {instagram: "url", facebook: "url", ...}
  analytics JSONB NOT NULL DEFAULT '{}'::jsonb, -- {instagram: {likes, comments, views, reach}, ...}
  analytics_updated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_scheduled_posts_client ON public.scheduled_posts(client_id);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_posts_assigned ON public.scheduled_posts(assigned_to);

-- Enable RLS
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins full access scheduled_posts"
ON public.scheduled_posts FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Social executives can view all scheduled_posts"
ON public.scheduled_posts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'social_executive'));

CREATE POLICY "Social executives can insert scheduled_posts"
ON public.scheduled_posts FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'social_executive') AND created_by = auth.uid());

CREATE POLICY "Social executives can update scheduled_posts"
ON public.scheduled_posts FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'social_executive'));

CREATE POLICY "Social executives can delete own scheduled_posts"
ON public.scheduled_posts FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'social_executive') AND created_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_posts_updated_at
BEFORE UPDATE ON public.scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for social media files (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-media', 'social-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins full access social-media bucket"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'social-media' AND is_admin())
WITH CHECK (bucket_id = 'social-media' AND is_admin());

CREATE POLICY "Social executives can upload to social-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media' AND has_role(auth.uid(), 'social_executive'));

CREATE POLICY "Social executives can view social-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'social-media' AND has_role(auth.uid(), 'social_executive'));

CREATE POLICY "Social executives can delete own social-media files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'social-media' AND has_role(auth.uid(), 'social_executive') AND owner = auth.uid());