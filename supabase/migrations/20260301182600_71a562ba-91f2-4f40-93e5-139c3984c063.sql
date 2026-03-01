
-- Create client_ideas table
CREATE TABLE public.client_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text,
  voice_note_url text,
  voice_duration_seconds integer,
  photo_urls jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','converted_to_project','declined')),
  admin_response text,
  converted_video_id uuid REFERENCES public.videos(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_ideas ENABLE ROW LEVEL SECURITY;

-- RLS: Clients can insert their own ideas
CREATE POLICY "Clients can insert own ideas" ON public.client_ideas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_ideas.client_id AND c.user_id = auth.uid())
  );

-- RLS: Clients can view their own ideas
CREATE POLICY "Clients can view own ideas" ON public.client_ideas
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_ideas.client_id AND c.user_id = auth.uid())
  );

-- RLS: Admins full access
CREATE POLICY "Admins full access client_ideas" ON public.client_ideas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Updated_at trigger
CREATE TRIGGER set_updated_at_client_ideas
  BEFORE UPDATE ON public.client_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_ideas;

-- Create storage bucket for idea images
INSERT INTO storage.buckets (id, name, public) VALUES ('client-idea-images', 'client-idea-images', true);

-- Storage RLS: Authenticated users can upload
CREATE POLICY "Authenticated users can upload idea images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-idea-images');

-- Storage RLS: Public read
CREATE POLICY "Public read idea images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-idea-images');
