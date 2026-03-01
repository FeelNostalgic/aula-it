-- Migration Fix: Use CHECK constraint instead of TYPE for activity_steps
ALTER TABLE public.activity_steps DROP CONSTRAINT IF EXISTS activity_steps_type_check;
ALTER TABLE public.activity_steps ADD CONSTRAINT activity_steps_type_check CHECK (type IN ('theory', 'animation', 'deliverable', 'quiz', 'presentation'));
