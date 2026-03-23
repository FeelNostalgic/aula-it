ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS resolved_questions JSONB;
