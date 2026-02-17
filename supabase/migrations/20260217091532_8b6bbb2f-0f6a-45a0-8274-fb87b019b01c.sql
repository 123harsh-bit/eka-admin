
-- =============================================
-- EKA CREATIVE AGENCY — FULL DATABASE SCHEMA
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'designer', 'writer', 'client');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  logo_url TEXT,
  project_title TEXT,
  industry TEXT,
  brand_colors JSONB DEFAULT '{}',
  brand_fonts JSONB DEFAULT '{}',
  contact_person TEXT,
  phone TEXT,
  contract_start DATE,
  contract_end DATE,
  monthly_deliverables INT DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','scripting','shooting','editing','internal_review','client_review','revisions','approved','ready_to_upload','live')),
  assigned_editor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date_planned DATE,
  date_delivered DATE,
  drive_link TEXT,
  live_url TEXT,
  thumbnail_url TEXT,
  internal_notes TEXT,
  is_internal_note_visible_to_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 6. Design tasks table
CREATE TABLE public.design_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'other' CHECK (task_type IN ('thumbnail','social_graphic','brand_kit','motion_graphic','lower_third','banner','other')),
  status TEXT NOT NULL DEFAULT 'briefed' CHECK (status IN ('briefed','in_progress','review','revisions','approved','delivered')),
  assigned_designer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  figma_link TEXT,
  drive_link TEXT,
  version_notes TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.design_tasks ENABLE ROW LEVEL SECURITY;

-- 7. Writing tasks table
CREATE TABLE public.writing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'other' CHECK (task_type IN ('script','caption','blog','ad_copy','email','bio','other')),
  status TEXT NOT NULL DEFAULT 'briefed' CHECK (status IN ('briefed','drafting','review','revisions','approved','delivered')),
  assigned_writer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  doc_link TEXT,
  word_count_target INT,
  version_notes TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.writing_tasks ENABLE ROW LEVEL SECURITY;

-- 8. Feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','voice')),
  content TEXT,
  timestamp_in_video TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 9. Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  related_video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  related_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 10. Activity log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Get client_id for a client user
CREATE OR REPLACE FUNCTION public.get_client_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_design_tasks_updated_at BEFORE UPDATE ON public.design_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_writing_tasks_updated_at BEFORE UPDATE ON public.writing_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES policies
CREATE POLICY "Admins can do everything with profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- USER_ROLES policies
CREATE POLICY "Admins can do everything with roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- CLIENTS policies
CREATE POLICY "Admins can do everything with clients" ON public.clients FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Team members can view active clients" ON public.clients FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Client users can view own client" ON public.clients FOR SELECT TO authenticated USING (user_id = auth.uid());

-- VIDEOS policies
CREATE POLICY "Admins can do everything with videos" ON public.videos FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Editors can view assigned videos" ON public.videos FOR SELECT TO authenticated USING (assigned_editor = auth.uid());
CREATE POLICY "Editors can update assigned videos" ON public.videos FOR UPDATE TO authenticated USING (assigned_editor = auth.uid());
CREATE POLICY "Client users can view own videos" ON public.videos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = videos.client_id AND c.user_id = auth.uid())
);
CREATE POLICY "Team can view all videos" ON public.videos FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'writer')
);

-- DESIGN_TASKS policies
CREATE POLICY "Admins can do everything with design_tasks" ON public.design_tasks FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Designers can view assigned tasks" ON public.design_tasks FOR SELECT TO authenticated USING (assigned_designer = auth.uid());
CREATE POLICY "Designers can update assigned tasks" ON public.design_tasks FOR UPDATE TO authenticated USING (assigned_designer = auth.uid());
CREATE POLICY "Team can view all design tasks" ON public.design_tasks FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'writer')
);
CREATE POLICY "Client users can view own design tasks" ON public.design_tasks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = design_tasks.client_id AND c.user_id = auth.uid())
);

-- WRITING_TASKS policies
CREATE POLICY "Admins can do everything with writing_tasks" ON public.writing_tasks FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Writers can view assigned tasks" ON public.writing_tasks FOR SELECT TO authenticated USING (assigned_writer = auth.uid());
CREATE POLICY "Writers can update assigned tasks" ON public.writing_tasks FOR UPDATE TO authenticated USING (assigned_writer = auth.uid());
CREATE POLICY "Team can view all writing tasks" ON public.writing_tasks FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'writer')
);
CREATE POLICY "Client users can view own writing tasks" ON public.writing_tasks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = writing_tasks.client_id AND c.user_id = auth.uid())
);

-- FEEDBACK policies
CREATE POLICY "Admins can do everything with feedback" ON public.feedback FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Client users can view own feedback" ON public.feedback FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = feedback.client_id AND c.user_id = auth.uid())
);
CREATE POLICY "Client users can insert feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = feedback.client_id AND c.user_id = auth.uid())
);
CREATE POLICY "Editors can view feedback on their videos" ON public.feedback FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = feedback.video_id AND v.assigned_editor = auth.uid())
);

-- NOTIFICATIONS policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Admins can do everything with notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ACTIVITY_LOG policies
CREATE POLICY "Admins can view all activity" ON public.activity_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Anyone can insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- STORAGE BUCKETS
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('voice-feedback', 'voice-feedback', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('client-logos', 'client-logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', false);

-- Storage policies for client-logos (public read)
CREATE POLICY "Anyone can view client logos" ON storage.objects FOR SELECT USING (bucket_id = 'client-logos');
CREATE POLICY "Admins can upload client logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-logos' AND public.is_admin());
CREATE POLICY "Admins can update client logos" ON storage.objects FOR UPDATE USING (bucket_id = 'client-logos' AND public.is_admin());
CREATE POLICY "Admins can delete client logos" ON storage.objects FOR DELETE USING (bucket_id = 'client-logos' AND public.is_admin());

-- Storage policies for voice-feedback
CREATE POLICY "Admins can manage voice feedback" ON storage.objects FOR ALL USING (bucket_id = 'voice-feedback' AND public.is_admin());
CREATE POLICY "Authenticated can upload voice feedback" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-feedback' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can view voice feedback" ON storage.objects FOR SELECT USING (bucket_id = 'voice-feedback' AND auth.role() = 'authenticated');

-- Storage policies for brand-assets
CREATE POLICY "Admins can manage brand assets" ON storage.objects FOR ALL USING (bucket_id = 'brand-assets' AND public.is_admin());
CREATE POLICY "Authenticated can view brand assets" ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets' AND auth.role() = 'authenticated');

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
