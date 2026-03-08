
-- Team Messages table
CREATE TABLE public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read messages in their channel or DMs
CREATE POLICY "Users can view own messages" ON public.team_messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR (recipient_id IS NULL AND (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'designer') OR has_role(auth.uid(), 'writer') OR has_role(auth.uid(), 'camera_operator')
  )));

CREATE POLICY "Users can send messages" ON public.team_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own messages" ON public.team_messages
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR is_admin());

-- Client Ratings table
CREATE TABLE public.client_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access ratings" ON public.client_ratings
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Clients can insert own ratings" ON public.client_ratings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_ratings.client_id AND c.user_id = auth.uid()));

CREATE POLICY "Clients can view own ratings" ON public.client_ratings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM clients c WHERE c.id = client_ratings.client_id AND c.user_id = auth.uid()));

CREATE POLICY "Team can view all ratings" ON public.client_ratings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'designer') OR has_role(auth.uid(), 'writer') OR has_role(auth.uid(), 'camera_operator'));

-- File Versions table
CREATE TABLE public.file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  file_url text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access file_versions" ON public.file_versions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Team can view file versions" ON public.file_versions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'designer') OR has_role(auth.uid(), 'writer') OR has_role(auth.uid(), 'camera_operator'));

CREATE POLICY "Team can insert file versions" ON public.file_versions
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Enable realtime for team_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_ratings;
