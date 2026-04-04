ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS structured_answers JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.quiz_attempts.structured_answers IS
  'Structured answers for quiz question types such as dropdown blanks, matching, ordering, categorization and drag-and-drop tables.';
