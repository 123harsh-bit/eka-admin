
-- Add raw_footage_link to videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS raw_footage_link text;

-- Add duration fields to writing_tasks
ALTER TABLE public.writing_tasks ADD COLUMN IF NOT EXISTS target_duration_seconds integer;
ALTER TABLE public.writing_tasks ADD COLUMN IF NOT EXISTS script_duration_seconds integer;

-- Create daily_todos table for admin
CREATE TABLE IF NOT EXISTS public.daily_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  title text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  is_complete boolean NOT NULL DEFAULT false,
  original_date date NOT NULL DEFAULT CURRENT_DATE,
  carried_over_from date,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.daily_todos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage their own todos"
    ON public.daily_todos FOR ALL
    TO authenticated
    USING (admin_id = auth.uid() AND is_admin())
    WITH CHECK (admin_id = auth.uid() AND is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_todos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
