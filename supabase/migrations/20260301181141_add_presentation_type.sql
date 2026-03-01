-- Migration: Add logo_url to activities and update step type check
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.activity_steps DROP CONSTRAINT IF EXISTS activity_steps_type_check;
ALTER TABLE public.activity_steps ADD CONSTRAINT activity_steps_type_check CHECK (type IN ('theory', 'animation', 'deliverable', 'quiz', 'presentation', 'resource'));
