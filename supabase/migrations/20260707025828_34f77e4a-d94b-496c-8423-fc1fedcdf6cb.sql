
-- 1) Extend scripts schema
ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS linked_video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scripts_linked_video ON public.scripts(linked_video_id);
CREATE INDEX IF NOT EXISTS idx_scripts_linked_content_item ON public.scripts(linked_content_item_id);

-- 2) Update create_script RPC to accept video + content item links
CREATE OR REPLACE FUNCTION public.create_script(
  _title text,
  _client_id uuid DEFAULT NULL,
  _linked_writing_task_id uuid DEFAULT NULL,
  _linked_video_id uuid DEFAULT NULL,
  _linked_content_item_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_script_id uuid;
  current_user_id uuid;
  resolved_client uuid := _client_id;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to create scripts';
  END IF;

  -- Auto-fill client from linked video/task/content item when not supplied
  IF resolved_client IS NULL AND _linked_video_id IS NOT NULL THEN
    SELECT client_id INTO resolved_client FROM public.videos WHERE id = _linked_video_id;
  END IF;
  IF resolved_client IS NULL AND _linked_writing_task_id IS NOT NULL THEN
    SELECT client_id INTO resolved_client FROM public.writing_tasks WHERE id = _linked_writing_task_id;
  END IF;
  IF resolved_client IS NULL AND _linked_content_item_id IS NOT NULL THEN
    SELECT client_id INTO resolved_client FROM public.content_items WHERE id = _linked_content_item_id;
  END IF;

  INSERT INTO public.scripts (
    title, created_by, updated_by, client_id,
    linked_writing_task_id, linked_video_id, linked_content_item_id
  )
  VALUES (
    COALESCE(NULLIF(BTRIM(_title), ''), 'Untitled Script'),
    current_user_id, current_user_id, resolved_client,
    _linked_writing_task_id, _linked_video_id, _linked_content_item_id
  )
  RETURNING id INTO new_script_id;

  RETURN new_script_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_script(text, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_script(text, uuid, uuid, uuid, uuid) TO authenticated;

-- Drop the older 3-arg signature so PostgREST calls resolve unambiguously
DROP FUNCTION IF EXISTS public.create_script(text, uuid, uuid);

-- 3) Allow admins to update script link fields (needed to relink existing scripts)
--    Update policy already scopes via can_edit_script which respects admins.

-- 4) can_access_script also grants access via linked_video assignments so admins/team
--    reaching from the video panel see the script. Admins already pass via is_admin().
