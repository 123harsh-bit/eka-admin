
-- Drop existing FKs that point to auth.users
ALTER TABLE public.videos DROP CONSTRAINT videos_assigned_editor_fkey;
ALTER TABLE public.design_tasks DROP CONSTRAINT design_tasks_assigned_designer_fkey;
ALTER TABLE public.writing_tasks DROP CONSTRAINT writing_tasks_assigned_writer_fkey;

-- Recreate FKs pointing to profiles table
ALTER TABLE public.videos
  ADD CONSTRAINT videos_assigned_editor_fkey
  FOREIGN KEY (assigned_editor) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.design_tasks
  ADD CONSTRAINT design_tasks_assigned_designer_fkey
  FOREIGN KEY (assigned_designer) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.writing_tasks
  ADD CONSTRAINT writing_tasks_assigned_writer_fkey
  FOREIGN KEY (assigned_writer) REFERENCES public.profiles(id) ON DELETE SET NULL;
