-- Add parent_step_id to activity_steps for nested self/peer evaluation steps
ALTER TABLE public.activity_steps
    ADD COLUMN IF NOT EXISTS parent_step_id UUID
        REFERENCES public.activity_steps(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_activity_steps_parent_step_id
    ON public.activity_steps (parent_step_id)
    WHERE parent_step_id IS NOT NULL;

COMMENT ON COLUMN public.activity_steps.parent_step_id IS
    'If set, this step is a child of the referenced step. '
    'Only self_evaluation and peer_evaluation steps can be children. '
    'Only deliverable and file_upload steps can be parents.';
