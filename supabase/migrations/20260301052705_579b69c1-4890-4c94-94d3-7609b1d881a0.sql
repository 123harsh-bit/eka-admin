
-- Fix writing_tasks task_type constraint
ALTER TABLE writing_tasks DROP CONSTRAINT IF EXISTS writing_tasks_task_type_check;
ALTER TABLE writing_tasks ADD CONSTRAINT writing_tasks_task_type_check CHECK (task_type IN (
  'script', 'reel_script', 'short_video_script', 'long_form_script',
  'caption', 'blog', 'ad_copy', 'email', 'bio', 'other'
));

-- Fix design_tasks task_type constraint
ALTER TABLE design_tasks DROP CONSTRAINT IF EXISTS design_tasks_task_type_check;
ALTER TABLE design_tasks ADD CONSTRAINT design_tasks_task_type_check CHECK (task_type IN (
  'thumbnail', 'social_graphic', 'brand_kit', 'motion_graphic',
  'lower_third', 'banner', 'other'
));

-- Fix videos status constraint to include all 15 pipeline stages
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;
ALTER TABLE videos ADD CONSTRAINT videos_status_check CHECK (status IN (
  'idea', 'scripting', 'script_submitted', 'script_client_review', 'script_approved',
  'shoot_assigned', 'shooting', 'footage_delivered', 'editing', 'internal_review',
  'client_review', 'revisions', 'approved', 'ready_to_upload', 'live'
));
