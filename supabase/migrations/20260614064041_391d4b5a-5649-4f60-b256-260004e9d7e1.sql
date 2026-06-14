
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
CREATE POLICY "Internal team can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
  );

DROP POLICY IF EXISTS "Team members can view active clients" ON public.clients;
CREATE POLICY "Internal team can view active clients"
  ON public.clients FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
  );

DROP POLICY IF EXISTS "Team reads whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "Internal team reads whatsapp_templates"
  ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','coo','editor','designer','writer','camera_operator','social_executive')
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Internal team can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','coo','editor','designer','writer','camera_operator','social_executive')
    )
  );

DROP POLICY IF EXISTS "Admins full access attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "System can insert attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "System can update own attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance_logs;
CREATE POLICY "Admins full access attendance"
  ON public.attendance_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Users can insert own attendance"
  ON public.attendance_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own attendance"
  ON public.attendance_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can view own attendance"
  ON public.attendance_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Social executives can update scheduled_posts" ON public.scheduled_posts;
CREATE POLICY "Social executives can update own scheduled_posts"
  ON public.scheduled_posts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'social_executive'::app_role) AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'social_executive'::app_role) AND created_by = auth.uid());

CREATE POLICY "Internal team can view ai_briefs"
  ON public.ai_briefs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
  );

DROP POLICY IF EXISTS "Voice feedback files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view voice feedback" ON storage.objects;
DROP POLICY IF EXISTS "Public read idea images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view client idea images" ON storage.objects;

CREATE POLICY "Voice feedback read for admins and team"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-feedback'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
      )
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.user_id = auth.uid()
          AND position(c.id::text in storage.objects.name) > 0
      )
    )
  );

CREATE POLICY "Client idea images read for admins, team, and owners"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-idea-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
      )
      OR EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.user_id = auth.uid()
          AND position(c.id::text in storage.objects.name) > 0
      )
    )
  );

REVOKE EXECUTE ON FUNCTION public.admin_list_clients() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_client(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.client_get_own_data() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_client_id_for_user(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_clients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_get_own_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_id_for_user(uuid) TO authenticated;
