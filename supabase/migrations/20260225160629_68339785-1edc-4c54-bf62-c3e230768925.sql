
-- 1. Create attendance_logs table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  login_time timestamptz NOT NULL,
  logout_time timestamptz,
  total_hours_worked numeric(4,2),
  status text CHECK (status IN ('on_time','late','left_early','half_day','absent')),
  admin_note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance" ON public.attendance_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins full access attendance" ON public.attendance_logs
  FOR ALL USING (public.is_admin());

CREATE POLICY "System can insert attendance" ON public.attendance_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update own attendance" ON public.attendance_logs
  FOR UPDATE USING (user_id = auth.uid());

-- 2. Add presence columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;

-- 3. Add camera operator columns to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS assigned_camera_operator uuid REFERENCES public.profiles(id);
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shoot_date date;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shoot_start_time time;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shoot_location text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shoot_notes text;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS footage_uploaded_at timestamptz;

-- 4. Camera operator RLS policies on videos
CREATE POLICY "Camera operators view assigned videos" ON public.videos
  FOR SELECT USING (assigned_camera_operator = auth.uid());

CREATE POLICY "Camera operators update assigned videos" ON public.videos
  FOR UPDATE USING (assigned_camera_operator = auth.uid());

-- 5. Update the app_role enum to include camera_operator
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'camera_operator';

-- 6. Enable realtime for attendance_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
