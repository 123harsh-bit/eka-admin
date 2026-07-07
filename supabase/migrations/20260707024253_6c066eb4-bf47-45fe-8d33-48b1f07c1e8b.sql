
-- 1) script_updates: require author_id = auth.uid()
DROP POLICY IF EXISTS script_updates_insert ON public.script_updates;
CREATE POLICY script_updates_insert ON public.script_updates
  FOR INSERT TO authenticated
  WITH CHECK (can_edit_script(script_id, auth.uid()) AND author_id = auth.uid());

-- 2) videos: switch public-role policies to authenticated
DROP POLICY IF EXISTS "Social exec view assigned videos" ON public.videos;
CREATE POLICY "Social exec view assigned videos" ON public.videos
  FOR SELECT TO authenticated
  USING (assigned_social_id = auth.uid());

DROP POLICY IF EXISTS "Social exec update assigned videos" ON public.videos;
CREATE POLICY "Social exec update assigned videos" ON public.videos
  FOR UPDATE TO authenticated
  USING (assigned_social_id = auth.uid());

DROP POLICY IF EXISTS "Team can view all videos" ON public.videos;
CREATE POLICY "Team can view all videos" ON public.videos
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'designer'::app_role)
    OR has_role(auth.uid(), 'writer'::app_role)
    OR has_role(auth.uid(), 'camera_operator'::app_role)
  );
