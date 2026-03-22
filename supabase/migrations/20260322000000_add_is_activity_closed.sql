-- Add is_activity_closed to activity_steps
-- Separates submission locking (student can't submit) from viewing (student can still navigate to the step)
-- is_locked remains as the builder-level edit lock
-- is_activity_closed is the new student submission lock

ALTER TABLE activity_steps
    ADD COLUMN IF NOT EXISTS is_activity_closed BOOLEAN NOT NULL DEFAULT FALSE;
