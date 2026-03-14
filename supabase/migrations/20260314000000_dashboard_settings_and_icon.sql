-- Create app_settings table for teacher configurations
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    grid_columns INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own settings" 
ON app_settings FOR ALL 
USING (auth.uid() = teacher_id);

-- Students can read settings from their teachers
CREATE POLICY "Anyone can read app settings" 
ON app_settings FOR SELECT 
USING (true);

-- Add icon_style and custom_icon_url to modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS icon_style TEXT DEFAULT 'default';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS custom_icon_url TEXT;