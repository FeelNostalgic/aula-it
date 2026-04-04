-- Each peer_evaluation_assignment needs its own activity_submissions row so that
-- multiple peer evals by the same student for the same step don't share a row
-- (which caused all submissions to be overwritten with the last value because
-- the unique index on (student_id, step_id) only allowed one row per student+step).
--
-- Strategy:
--   1. Add peer_assignment_id column to activity_submissions
--   2. Clean up corrupt data: unlink all but the first assignment pointing to each shared submission
--   3. Set peer_assignment_id on the surviving linked submission rows
--   4. Replace the individual unique index to exclude peer-eval rows
--   5. Add a unique index per peer_assignment_id (one submission row per assignment)

-- 1. Add column
ALTER TABLE public.activity_submissions
    ADD COLUMN IF NOT EXISTS peer_assignment_id UUID
        REFERENCES public.peer_evaluation_assignments(id) ON DELETE CASCADE;

-- 2. Unlink duplicate assignments sharing the same eval_submission_id.
--    Keeps the assignment with the smallest id; nullifies eval_submission_id on the rest.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY eval_submission_id ORDER BY id) AS rn
    FROM public.peer_evaluation_assignments
    WHERE eval_submission_id IS NOT NULL
),
duplicates AS (
    SELECT id FROM ranked WHERE rn > 1
)
UPDATE public.peer_evaluation_assignments
SET eval_submission_id = NULL
WHERE id IN (SELECT id FROM duplicates);

-- 3. Back-fill peer_assignment_id on the surviving linked submission rows.
UPDATE public.activity_submissions sub
SET peer_assignment_id = pea.id
FROM public.peer_evaluation_assignments pea
WHERE pea.eval_submission_id = sub.id
  AND sub.peer_assignment_id IS NULL;

-- 4. Replace the individual unique index to exclude peer-eval rows
--    (peer-eval rows are identified by having peer_assignment_id set).
DROP INDEX IF EXISTS public.idx_submission_individual;
CREATE UNIQUE INDEX idx_submission_individual
    ON public.activity_submissions (student_id, step_id)
    WHERE (group_id IS NULL AND peer_assignment_id IS NULL);

-- 5. Unique index: one submission row per peer_assignment.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_peer_eval
    ON public.activity_submissions (peer_assignment_id)
    WHERE (peer_assignment_id IS NOT NULL);
