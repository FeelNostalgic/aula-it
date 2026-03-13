-- Add completion_mode to activity_steps to control how step completion is tracked
ALTER TABLE activity_steps
ADD COLUMN IF NOT EXISTS completion_mode text NOT NULL DEFAULT 'none'
CHECK (completion_mode IN ('none', 'required', 'viewable'));
