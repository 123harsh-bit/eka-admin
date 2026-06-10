
-- Update is_admin to include coo
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','coo')
  )
$$;

-- Profiles: salary + HR fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_salary numeric(12,2),
  ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS joining_date date;

-- Clients: billing fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS monthly_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS billing_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS payment_day integer DEFAULT 5;

-- Restrict client contact/billing visibility from non-admin team members
-- Drop broad team SELECT then re-add a column-limited one via view + revoke.
-- Simpler path: keep policy but use column GRANTs.
REVOKE SELECT ON public.clients FROM authenticated;
GRANT SELECT (id, name, logo_url, industry, project_title, brand_colors, brand_fonts,
              service_type, is_active, user_id, created_at, updated_at, monthly_deliverables,
              contract_start, contract_end)
  ON public.clients TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

-- Admins/COO still get all columns through is_admin policy + table-level all via service role usage in edge fns;
-- but admin client-side needs full SELECT. PostgREST honors column GRANTs regardless of RLS, so we need
-- a separate mechanism for admins. Use a security-definer view for admins.
CREATE OR REPLACE VIEW public.clients_admin
WITH (security_invoker = off) AS
  SELECT * FROM public.clients;

REVOKE ALL ON public.clients_admin FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.clients_admin TO authenticated;

CREATE OR REPLACE FUNCTION public.clients_admin_guard()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
END;
$$;

-- Salary payments table
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_month date NOT NULL, -- first day of month (e.g. 2026-06-01)
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending', -- pending | paid | skipped
  paid_on date,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_payments TO authenticated;
GRANT ALL ON public.salary_payments TO service_role;

ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all salary payments"
  ON public.salary_payments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users view own salary payments"
  ON public.salary_payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_salary_payments_updated_at
  BEFORE UPDATE ON public.salary_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
