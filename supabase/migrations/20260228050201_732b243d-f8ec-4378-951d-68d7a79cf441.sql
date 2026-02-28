-- Fix camera operator RLS policies: change from public to authenticated role
-- and add camera_operator to the Team view policy

-- Drop incorrect camera operator policies
DROP POLICY IF EXISTS "Camera operators view assigned videos" ON public.videos;
DROP POLICY IF EXISTS "Camera operators update assigned videos" ON public.videos;

-- Recreate with correct authenticated role
CREATE POLICY "Camera operators view assigned videos"
ON public.videos FOR SELECT TO authenticated
USING (assigned_camera_operator = auth.uid());

CREATE POLICY "Camera operators update assigned videos"
ON public.videos FOR UPDATE TO authenticated
USING (assigned_camera_operator = auth.uid());

-- Update Team view policy to include camera_operator
DROP POLICY IF EXISTS "Team can view all videos" ON public.videos;
CREATE POLICY "Team can view all videos"
ON public.videos FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'designer'::app_role) OR 
  has_role(auth.uid(), 'writer'::app_role) OR
  has_role(auth.uid(), 'camera_operator'::app_role)
);

-- Also add camera_operator to writing_tasks and design_tasks team view policies
DROP POLICY IF EXISTS "Team can view all writing tasks" ON public.writing_tasks;
CREATE POLICY "Team can view all writing tasks"
ON public.writing_tasks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'designer'::app_role) OR 
  has_role(auth.uid(), 'writer'::app_role) OR
  has_role(auth.uid(), 'camera_operator'::app_role)
);

DROP POLICY IF EXISTS "Team can view all design tasks" ON public.design_tasks;
CREATE POLICY "Team can view all design tasks"
ON public.design_tasks FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'editor'::app_role) OR 
  has_role(auth.uid(), 'designer'::app_role) OR 
  has_role(auth.uid(), 'writer'::app_role) OR
  has_role(auth.uid(), 'camera_operator'::app_role)
);