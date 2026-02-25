
-- Add lunch break columns to attendance_logs
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS lunch_start timestamptz;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS lunch_end timestamptz;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS lunch_duration_minutes numeric(5,2);
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS lunch_skipped boolean DEFAULT false;
ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS current_state text DEFAULT 'working';

-- Update video status constraint for 15-stage pipeline
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_status_check;

-- Migrate script_approved → script_approved (stays same)
-- No data migration needed since new statuses are additions

-- Add new constraint with all 15 stages
ALTER TABLE videos ADD CONSTRAINT videos_status_check
  CHECK (status IN (
    'idea','scripting','script_submitted','script_client_review',
    'script_approved','shoot_assigned','shooting','footage_delivered',
    'editing','internal_review','client_review','revisions',
    'approved','ready_to_upload','live'
  ));
