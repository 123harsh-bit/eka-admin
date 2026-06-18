
-- 1) Column-level restrictions on clients (only admins via SECURITY DEFINER RPC may read these)
REVOKE SELECT (email, phone, monthly_fee, billing_currency, payment_day, contract_start, contract_end) ON public.clients FROM authenticated;

-- 2) Column-level restrictions on profiles for salary/HR
REVOKE SELECT (monthly_salary, salary_currency) ON public.profiles FROM authenticated;

-- 3) Admin RPC: list full profiles (used by AdminTeam & AdminSalaries)
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- 4) Self profile RPC (used by useAuth so user can fetch own full profile incl. salary)
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS public.profiles
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.profiles;
BEGIN
  SELECT * INTO r FROM public.profiles WHERE id = auth.uid();
  RETURN r;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_own_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

-- 5) activity_log: tighten INSERT to team & admin only
DROP POLICY IF EXISTS "Authenticated can insert activity" ON public.activity_log;
CREATE POLICY "Team and admin can insert activity"
ON public.activity_log FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
  )
);

-- 6) Storage: voice-feedback uploads scoped to uploader's client_id or team/admin
DROP POLICY IF EXISTS "Authenticated can upload voice feedback" ON storage.objects;
CREATE POLICY "Scoped voice-feedback uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-feedback' AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.user_id = auth.uid() AND POSITION(c.id::text IN name) > 0
    )
  )
);

-- 7) Storage: client-idea-images uploads scoped similarly
DROP POLICY IF EXISTS "Authenticated users can upload idea images" ON storage.objects;
CREATE POLICY "Scoped client-idea-images uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-idea-images' AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('editor','designer','writer','camera_operator','social_executive')
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.user_id = auth.uid() AND POSITION(c.id::text IN name) > 0
    )
  )
);
