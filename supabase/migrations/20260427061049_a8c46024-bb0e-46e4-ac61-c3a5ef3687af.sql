-- Video comments table for threaded discussion
CREATE TABLE public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  author_id uuid NOT NULL,
  parent_id uuid REFERENCES public.video_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX idx_video_comments_parent_id ON public.video_comments(parent_id);

ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access video_comments"
  ON public.video_comments FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Team can view video_comments"
  ON public.video_comments FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'editor'::app_role) OR
    has_role(auth.uid(), 'designer'::app_role) OR
    has_role(auth.uid(), 'writer'::app_role) OR
    has_role(auth.uid(), 'camera_operator'::app_role)
  );

CREATE POLICY "Team can post video_comments"
  ON public.video_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update own comments"
  ON public.video_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Authors can delete own comments"
  ON public.video_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE TRIGGER update_video_comments_updated_at
  BEFORE UPDATE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;

-- Shoot checklist (JSON array of {id, label, checked})
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS shoot_checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS due_date date;

CREATE INDEX IF NOT EXISTS idx_videos_due_date ON public.videos(due_date) WHERE due_date IS NOT NULL;