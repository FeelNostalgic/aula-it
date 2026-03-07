ALTER TABLE public.activity_submissions
    ADD COLUMN IF NOT EXISTS drive_file_name TEXT,
    ADD COLUMN IF NOT EXISTS drive_mime_type TEXT;
