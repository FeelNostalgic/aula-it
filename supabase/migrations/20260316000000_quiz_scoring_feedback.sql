-- Allow decimal points_earned for penalty scoring (e.g. -1/3 per wrong answer)
ALTER TABLE quiz_attempts
  ALTER COLUMN points_earned TYPE NUMERIC(6,2) USING points_earned::NUMERIC(6,2);

-- Teacher feedback per short-answer question, visible to student after grade is published
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS short_answer_feedback JSONB NOT NULL DEFAULT '{}';
