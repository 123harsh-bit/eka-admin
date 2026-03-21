
-- Content Plans table
CREATE TABLE public.content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  title text,
  strategy_notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent_for_approval','client_approved','active','completed')),
  approved_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, month, year)
);

ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;

-- Content Items table
CREATE TABLE public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('reel','post','carousel','story','youtube_video','youtube_short','linkedin_post','facebook_post','ad','other')),
  platform text NOT NULL CHECK (platform IN ('instagram','youtube','linkedin','facebook','multiple','other')),
  planned_date date,
  caption_brief text,
  visual_brief text,
  reference_url text,
  hashtags text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_production','ready','published','cancelled')),
  published_url text,
  thumbnail_url text,
  linked_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  linked_writing_task_id uuid REFERENCES public.writing_tasks(id) ON DELETE SET NULL,
  linked_design_task_id uuid REFERENCES public.design_tasks(id) ON DELETE SET NULL,
  is_visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_content_plans_updated_at BEFORE UPDATE ON public.content_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_items;

-- RLS for content_plans
CREATE POLICY "Admins full access content_plans" ON public.content_plans FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Clients can view own plans" ON public.content_plans FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = content_plans.client_id AND c.user_id = auth.uid())
);

CREATE POLICY "Team can view content_plans" ON public.content_plans FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'writer') OR public.has_role(auth.uid(), 'camera_operator')
);

-- RLS for content_items
CREATE POLICY "Admins full access content_items" ON public.content_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Clients can view own visible items" ON public.content_items FOR SELECT TO authenticated USING (
  is_visible_to_client = true AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = content_items.client_id AND c.user_id = auth.uid())
);

CREATE POLICY "Team can view linked content_items" ON public.content_items FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'designer') OR public.has_role(auth.uid(), 'writer') OR public.has_role(auth.uid(), 'camera_operator')
);

-- Client can update content_plans status (for approval)
CREATE POLICY "Clients can update own plan status" ON public.content_plans FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = content_plans.client_id AND c.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.clients c WHERE c.id = content_plans.client_id AND c.user_id = auth.uid())
);

-- Auto-status sync trigger: when videos/writing_tasks/design_tasks change status, update linked content_items
CREATE OR REPLACE FUNCTION public.sync_content_item_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item RECORD;
  all_done BOOLEAN;
  any_started BOOLEAN;
  v_status text;
  w_status text;
  d_status text;
BEGIN
  -- Find content items linked to this record
  FOR item IN
    SELECT ci.id, ci.linked_video_id, ci.linked_writing_task_id, ci.linked_design_task_id, ci.status
    FROM public.content_items ci
    WHERE (TG_TABLE_NAME = 'videos' AND ci.linked_video_id = NEW.id)
       OR (TG_TABLE_NAME = 'writing_tasks' AND ci.linked_writing_task_id = NEW.id)
       OR (TG_TABLE_NAME = 'design_tasks' AND ci.linked_design_task_id = NEW.id)
  LOOP
    -- Skip if already published or cancelled
    IF item.status IN ('published', 'cancelled') THEN
      CONTINUE;
    END IF;

    -- Check all linked task statuses
    v_status := NULL; w_status := NULL; d_status := NULL;

    IF item.linked_video_id IS NOT NULL THEN
      SELECT status INTO v_status FROM public.videos WHERE id = item.linked_video_id;
    END IF;
    IF item.linked_writing_task_id IS NOT NULL THEN
      SELECT status INTO w_status FROM public.writing_tasks WHERE id = item.linked_writing_task_id;
    END IF;
    IF item.linked_design_task_id IS NOT NULL THEN
      SELECT status INTO d_status FROM public.design_tasks WHERE id = item.linked_design_task_id;
    END IF;

    -- Check if video went live
    IF v_status = 'live' THEN
      UPDATE public.content_items SET status = 'published' WHERE id = item.id;
      CONTINUE;
    END IF;

    -- Check if all done
    all_done := true;
    IF item.linked_video_id IS NOT NULL AND v_status NOT IN ('live', 'ready_to_upload', 'approved') THEN all_done := false; END IF;
    IF item.linked_writing_task_id IS NOT NULL AND w_status NOT IN ('delivered', 'approved') THEN all_done := false; END IF;
    IF item.linked_design_task_id IS NOT NULL AND d_status NOT IN ('delivered', 'approved') THEN all_done := false; END IF;

    IF all_done AND (item.linked_video_id IS NOT NULL OR item.linked_writing_task_id IS NOT NULL OR item.linked_design_task_id IS NOT NULL) THEN
      UPDATE public.content_items SET status = 'ready' WHERE id = item.id;
      CONTINUE;
    END IF;

    -- Check if any started
    any_started := false;
    IF item.linked_video_id IS NOT NULL AND v_status != 'idea' THEN any_started := true; END IF;
    IF item.linked_writing_task_id IS NOT NULL AND w_status != 'briefed' THEN any_started := true; END IF;
    IF item.linked_design_task_id IS NOT NULL AND d_status != 'briefed' THEN any_started := true; END IF;

    IF any_started AND item.status = 'planned' THEN
      UPDATE public.content_items SET status = 'in_production' WHERE id = item.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger to videos, writing_tasks, design_tasks
CREATE TRIGGER sync_content_on_video_change AFTER UPDATE OF status ON public.videos FOR EACH ROW EXECUTE FUNCTION public.sync_content_item_status();
CREATE TRIGGER sync_content_on_writing_change AFTER UPDATE OF status ON public.writing_tasks FOR EACH ROW EXECUTE FUNCTION public.sync_content_item_status();
CREATE TRIGGER sync_content_on_design_change AFTER UPDATE OF status ON public.design_tasks FOR EACH ROW EXECUTE FUNCTION public.sync_content_item_status();
