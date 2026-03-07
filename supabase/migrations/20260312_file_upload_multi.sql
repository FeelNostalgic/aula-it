ALTER TABLE public.activity_submissions
    ADD COLUMN IF NOT EXISTS files JSONB NULL;
