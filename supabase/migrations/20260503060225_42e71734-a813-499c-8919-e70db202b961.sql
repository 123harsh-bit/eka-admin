
-- Add approval & client-link fields to scheduled_posts
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS client_approval_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS client_approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS client_approval_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_feedback text,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Caption templates
CREATE TABLE IF NOT EXISTS public.caption_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  client_id uuid,
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.caption_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access caption_templates" ON public.caption_templates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Social executives manage caption_templates" ON public.caption_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'social_executive')) WITH CHECK (has_role(auth.uid(), 'social_executive') AND created_by = auth.uid());
CREATE TRIGGER trg_caption_templates_updated BEFORE UPDATE ON public.caption_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hashtag groups
CREATE TABLE IF NOT EXISTS public.hashtag_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  niche text,
  hashtags text NOT NULL,
  client_id uuid,
  created_by uuid NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hashtag_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access hashtag_groups" ON public.hashtag_groups FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Social executives manage hashtag_groups" ON public.hashtag_groups FOR ALL TO authenticated USING (has_role(auth.uid(), 'social_executive')) WITH CHECK (has_role(auth.uid(), 'social_executive') AND created_by = auth.uid());
CREATE TRIGGER trg_hashtag_groups_updated BEFORE UPDATE ON public.hashtag_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public read policy for client approval (token-gated via edge function; rows readable only by token in function)
-- We do NOT add a public RLS read; the edge function uses service role to look up by token.

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_token ON public.scheduled_posts(client_approval_token) WHERE client_approval_token IS NOT NULL;
