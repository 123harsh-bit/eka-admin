
-- allow partially_paid invoice status
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY['draft','sent','partially_paid','paid','overdue','cancelled']));

-- invoice payments (installments)
CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_payments_invoice_idx ON public.invoice_payments(invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoice payments" ON public.invoice_payments
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Clients view own invoice payments" ON public.invoice_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.clients c ON c.id = i.client_id
    WHERE i.id = invoice_payments.invoice_id AND c.user_id = auth.uid()
  ));

-- salary advances
CREATE TABLE public.salary_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  requested_on date NOT NULL DEFAULT CURRENT_DATE,
  paid_on date,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','paid','rejected','adjusted')),
  reason text,
  deduct_from_month date,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX salary_advances_user_idx ON public.salary_advances(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_advances TO authenticated;
GRANT ALL ON public.salary_advances TO service_role;

ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage salary advances" ON public.salary_advances
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users view own salary advances" ON public.salary_advances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER salary_advances_updated BEFORE UPDATE ON public.salary_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
