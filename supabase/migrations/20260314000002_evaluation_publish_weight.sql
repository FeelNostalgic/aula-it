-- Track when a grade is published (visible to the student)
ALTER TABLE activity_submissions
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Weight per activity for weighted unit grade (default = equal weight)
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS grade_weight numeric(3,1) NOT NULL DEFAULT 1.0;
