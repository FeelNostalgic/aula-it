ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS drive_storage_mode TEXT NOT NULL DEFAULT 'auto_root',
    ADD COLUMN IF NOT EXISTS drive_root_folder_id TEXT,
    ADD COLUMN IF NOT EXISTS drive_root_folder_name TEXT,
    ADD COLUMN IF NOT EXISTS drive_root_folder_url TEXT;
