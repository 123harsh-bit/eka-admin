
-- Fix permissive INSERT policies
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (
  public.is_admin() OR recipient_id = auth.uid()
);

DROP POLICY "Anyone can insert activity" ON public.activity_log;
CREATE POLICY "Authenticated can insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (
  actor_id = auth.uid() OR public.is_admin()
);
