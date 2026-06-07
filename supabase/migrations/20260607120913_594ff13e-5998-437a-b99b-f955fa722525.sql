
-- WhatsApp templates
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL,
  name text NOT NULL,
  template_text text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage whatsapp_templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Team reads whatsapp_templates" ON public.whatsapp_templates FOR SELECT TO authenticated USING (is_active = true);
CREATE TRIGGER whatsapp_templates_updated BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  notes text,
  pdf_url text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Clients view own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = invoices.client_id AND c.user_id = auth.uid()));
CREATE INDEX invoices_client_idx ON public.invoices(client_id);
CREATE INDEX invoices_status_idx ON public.invoices(status);
CREATE TRIGGER invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Briefs (cache generated briefs)
CREATE TABLE public.ai_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('client_idea','video','manual')),
  source_id uuid,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  prompt text,
  writing_brief text,
  shoot_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  caption_drafts jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','applied','discarded')),
  applied_video_id uuid,
  applied_writing_task_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_briefs TO authenticated;
GRANT ALL ON public.ai_briefs TO service_role;
ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_briefs" ON public.ai_briefs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER ai_briefs_updated BEFORE UPDATE ON public.ai_briefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default whatsapp templates
INSERT INTO public.whatsapp_templates (stage, name, template_text) VALUES
  ('shoot_assigned', 'Shoot scheduled', 'Hi {client}, your shoot for "{title}" is scheduled on {shoot_date}. See you then!'),
  ('internal_review', 'Ready for your review', 'Hi {client}, your video "{title}" is ready for review: {link}'),
  ('client_review', 'Awaiting feedback', 'Hi {client}, gentle reminder to review "{title}" when you get a chance: {link}'),
  ('approved', 'Approved – going live', 'Thanks {client}! "{title}" is approved and going live soon.'),
  ('live', 'Now live', 'Hi {client}, "{title}" is now live: {link}');
