CREATE OR REPLACE FUNCTION public.create_script(
  _title text,
  _client_id uuid DEFAULT NULL,
  _linked_writing_task_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_script_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to create scripts';
  END IF;

  INSERT INTO public.scripts (
    title,
    created_by,
    updated_by,
    client_id,
    linked_writing_task_id
  )
  VALUES (
    COALESCE(NULLIF(BTRIM(_title), ''), 'Untitled Script'),
    current_user_id,
    current_user_id,
    _client_id,
    _linked_writing_task_id
  )
  RETURNING id INTO new_script_id;

  RETURN new_script_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_script(text, uuid, uuid) TO authenticated;