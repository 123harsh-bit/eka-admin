CREATE TABLE public.work_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_title text,
  client_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_sessions TO authenticated;
GRANT ALL ON public.work_sessions TO service_role;

ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own work sessions" ON public.work_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all work sessions" ON public.work_sessions
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE UNIQUE INDEX work_sessions_one_active_per_user
  ON public.work_sessions (user_id) WHERE ended_at IS NULL;

CREATE INDEX work_sessions_entity_idx ON public.work_sessions (entity_type, entity_id);
CREATE INDEX work_sessions_user_started_idx ON public.work_sessions (user_id, started_at DESC);

CREATE OR REPLACE FUNCTION public.work_sessions_set_duration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL THEN
    NEW.duration_minutes := ROUND(EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60.0, 2);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_sessions_duration
BEFORE INSERT OR UPDATE ON public.work_sessions
FOR EACH ROW EXECUTE FUNCTION public.work_sessions_set_duration();

CREATE OR REPLACE FUNCTION public.admin_active_work_sessions()
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, entity_type text, entity_id uuid,
  entity_title text, client_id uuid, started_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ws.id, ws.user_id, p.full_name, ws.entity_type, ws.entity_id,
         ws.entity_title, ws.client_id, ws.started_at
  FROM public.work_sessions ws
  JOIN public.profiles p ON p.id = ws.user_id
  WHERE ws.ended_at IS NULL AND public.is_admin()
  ORDER BY ws.started_at ASC;
$$;