-- Enable realtime on profiles table for presence sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Fix notification INSERT policy to allow any authenticated user to insert
-- (needed for handleVideoStatusChange to send notifications on behalf of team members)
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON notifications;
CREATE POLICY "Authenticated can insert notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);