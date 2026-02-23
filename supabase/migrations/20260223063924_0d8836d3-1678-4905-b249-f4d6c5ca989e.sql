
-- 1. Update daily_todos RLS to allow all authenticated users (not just admin)
DROP POLICY IF EXISTS "Admins can manage their own todos" ON public.daily_todos;

CREATE POLICY "Users can manage their own todos"
ON public.daily_todos FOR ALL
TO authenticated
USING (admin_id = auth.uid())
WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins can view all team todos"
ON public.daily_todos FOR SELECT
TO authenticated
USING (is_admin());

-- 2. Make voice-feedback bucket public so audio URLs work
UPDATE storage.buckets SET public = true WHERE id = 'voice-feedback';

-- 3. Add public SELECT policy for voice-feedback bucket
CREATE POLICY "Voice feedback files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-feedback');
