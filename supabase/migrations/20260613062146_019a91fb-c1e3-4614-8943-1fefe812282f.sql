
-- 1. Add new columns
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deliverables jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_videos_priority ON public.videos(priority);

-- 2. Grants on clients table
-- Mutations: full access; RLS restricts to admin/coo via existing policy
GRANT INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

-- Reads: column-level only for non-admin team. Sensitive columns (email, phone,
-- contact_person, contract_start, contract_end, notes, monthly_fee,
-- billing_currency, payment_day) remain hidden from direct queries.
GRANT SELECT (
  id, name, logo_url, project_title, industry,
  brand_colors, brand_fonts, is_active, user_id,
  monthly_deliverables, service_type, deliverables,
  created_at, updated_at
) ON public.clients TO authenticated;

-- 3. RPC for client role to read own full row (incl. contact info)
CREATE OR REPLACE FUNCTION public.client_get_own_data()
RETURNS public.clients
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.clients;
BEGIN
  SELECT * INTO result FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.client_get_own_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_get_own_data() TO authenticated;

-- 4. Tighten SECURITY DEFINER functions: remove anonymous access
REVOKE EXECUTE ON FUNCTION public.admin_list_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_clients() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_client(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_client_id_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_id_for_user(uuid) TO authenticated;
