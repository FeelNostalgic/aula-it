-- Migration: add target_student_id to peer_evaluation_assignments for intra_group mode
-- When mode = 'intra_group', each member evaluates other members individually.
-- target_submission_id = the group's shared deliverable submission (context/reference)
-- target_student_id   = the specific member being evaluated

ALTER TABLE public.peer_evaluation_assignments
    ADD COLUMN IF NOT EXISTS target_student_id UUID
        REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_peer_eval_assignments_target_student
    ON public.peer_evaluation_assignments (target_student_id)
    WHERE target_student_id IS NOT NULL;
