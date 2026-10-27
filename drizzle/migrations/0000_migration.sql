CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  external_id text NOT NULL,
  page_id text,
  name text NOT NULL,
  username text,
  avatar_url text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  connected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, external_id)
);
GRANT SELECT, UPDATE, DELETE ON public.social_accounts TO authenticated;
GRANT ALL ON public.social_accounts TO service_role;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social team can view accounts" ON public.social_accounts FOR SELECT TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'social_executive'));
CREATE POLICY "social team can update accounts" ON public.social_accounts FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(), 'social_executive'));
CREATE POLICY "admins delete accounts" ON public.social_accounts FOR DELETE TO authenticated
  USING (public.is_admin());

-- tokens: backend only
CREATE TABLE public.social_account_tokens (
  account_id uuid PRIMARY KEY REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_account_tokens TO service_role;
ALTER TABLE public.social_account_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.social_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  return_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_oauth_states TO service_role;
ALTER TABLE public.social_oauth_states ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scheduled_posts
  ADD COLUMN auto_publish boolean NOT NULL DEFAULT false,
  ADD COLUMN account_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN publish_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN publish_error text,
  ADD COLUMN publish_attempts integer NOT NULL DEFAULT 0;

CREATE TRIGGER social_accounts_updated BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();