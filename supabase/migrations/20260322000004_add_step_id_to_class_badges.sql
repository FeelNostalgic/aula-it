-- Add step_id to class_badges for step-level badge assignment
ALTER TABLE public.class_badges
    ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES public.activity_steps(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.class_badges.step_id IS 'Optional: scope the badge to a specific activity step. NULL means badge applies to the whole reto (activity).';
