
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Script',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  linked_writing_task_id UUID REFERENCES public.writing_tasks(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_json JSONB,
  content_html TEXT,
  word_count INT NOT NULL DEFAULT 0,
  char_count INT NOT NULL DEFAULT 0,
  ydoc_state BYTEA,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (linked_writing_task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_scripts_client_id ON public.scripts(client_id);
CREATE INDEX idx_scripts_created_by ON public.scripts(created_by);
CREATE INDEX idx_scripts_linked_task ON public.scripts(linked_writing_task_id);
CREATE TRIGGER trg_scripts_updated_at BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.script_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer','editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (script_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_collaborators TO authenticated;
GRANT ALL ON public.script_collaborators TO service_role;
ALTER TABLE public.script_collaborators ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_script_collab_script ON public.script_collaborators(script_id);
CREATE INDEX idx_script_collab_user ON public.script_collaborators(user_id);

CREATE TABLE public.script_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.script_comments(id) ON DELETE CASCADE,
  anchor JSONB,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_comments TO authenticated;
GRANT ALL ON public.script_comments TO service_role;
ALTER TABLE public.script_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_script_comments_script ON public.script_comments(script_id);
CREATE TRIGGER trg_script_comments_updated_at BEFORE UPDATE ON public.script_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.script_updates (
  id BIGSERIAL PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  update BYTEA NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.script_updates TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.script_updates_id_seq TO authenticated;
GRANT ALL ON public.script_updates TO service_role;
GRANT ALL ON SEQUENCE public.script_updates_id_seq TO service_role;
ALTER TABLE public.script_updates ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_script_updates_script_id ON public.script_updates(script_id, id);

CREATE OR REPLACE FUNCTION public.can_access_script(_script_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.scripts s WHERE s.id = _script_id AND s.created_by = _user_id)
    OR EXISTS (SELECT 1 FROM public.script_collaborators sc WHERE sc.script_id = _script_id AND sc.user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.scripts s
      JOIN public.writing_tasks wt ON wt.id = s.linked_writing_task_id
      WHERE s.id = _script_id AND wt.assigned_writer = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_script(_script_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.scripts s WHERE s.id = _script_id AND s.created_by = _user_id)
    OR EXISTS (SELECT 1 FROM public.script_collaborators sc WHERE sc.script_id = _script_id AND sc.user_id = _user_id AND sc.role = 'editor')
    OR EXISTS (
      SELECT 1 FROM public.scripts s
      JOIN public.writing_tasks wt ON wt.id = s.linked_writing_task_id
      WHERE s.id = _script_id AND wt.assigned_writer = _user_id
    );
$$;

CREATE POLICY "scripts_select" ON public.scripts FOR SELECT TO authenticated
USING (public.can_access_script(id, auth.uid()));
CREATE POLICY "scripts_insert" ON public.scripts FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (public.is_admin() OR public.has_role(auth.uid(), 'writer'::app_role))
);
CREATE POLICY "scripts_update" ON public.scripts FOR UPDATE TO authenticated
USING (public.can_edit_script(id, auth.uid()))
WITH CHECK (public.can_edit_script(id, auth.uid()));
CREATE POLICY "scripts_delete" ON public.scripts FOR DELETE TO authenticated
USING (public.is_admin() OR created_by = auth.uid());

CREATE POLICY "script_collab_select" ON public.script_collaborators FOR SELECT TO authenticated
USING (public.can_access_script(script_id, auth.uid()));
CREATE POLICY "script_collab_manage" ON public.script_collaborators FOR ALL TO authenticated
USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.scripts s WHERE s.id = script_id AND s.created_by = auth.uid()))
WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.scripts s WHERE s.id = script_id AND s.created_by = auth.uid()));

CREATE POLICY "script_comments_select" ON public.script_comments FOR SELECT TO authenticated
USING (public.can_access_script(script_id, auth.uid()));
CREATE POLICY "script_comments_insert" ON public.script_comments FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.can_access_script(script_id, auth.uid()));
CREATE POLICY "script_comments_update" ON public.script_comments FOR UPDATE TO authenticated
USING (public.is_admin() OR author_id = auth.uid() OR public.can_edit_script(script_id, auth.uid()))
WITH CHECK (public.is_admin() OR author_id = auth.uid() OR public.can_edit_script(script_id, auth.uid()));
CREATE POLICY "script_comments_delete" ON public.script_comments FOR DELETE TO authenticated
USING (public.is_admin() OR author_id = auth.uid());

CREATE POLICY "script_updates_select" ON public.script_updates FOR SELECT TO authenticated
USING (public.can_access_script(script_id, auth.uid()));
CREATE POLICY "script_updates_insert" ON public.script_updates FOR INSERT TO authenticated
WITH CHECK (public.can_edit_script(script_id, auth.uid()) AND (author_id IS NULL OR author_id = auth.uid()));
CREATE POLICY "script_updates_delete" ON public.script_updates FOR DELETE TO authenticated
USING (public.is_admin() OR public.can_edit_script(script_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.scripts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_comments;
