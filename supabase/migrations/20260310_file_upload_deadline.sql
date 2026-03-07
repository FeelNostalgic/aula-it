-- 1. Columna de deadline en activity_steps
ALTER TABLE public.activity_steps
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NULL;

-- 2. Ampliar CHECK constraint para incluir 'file_upload'
ALTER TABLE public.activity_steps
    DROP CONSTRAINT IF EXISTS activity_steps_type_check;
ALTER TABLE public.activity_steps
    ADD CONSTRAINT activity_steps_type_check
    CHECK (type IN ('theory', 'animation', 'deliverable', 'quiz', 'presentation', 'resource', 'file_upload'));
