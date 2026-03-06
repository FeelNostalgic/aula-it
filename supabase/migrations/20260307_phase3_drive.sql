-- Phase 3: Teacher-Owned Copies + Manual Lock
-- Adds Google Drive integration for teacher-controlled deliverable distribution

-- 1. Add google_email to profiles (students + teachers)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_email TEXT;

-- 2. Store teacher's Drive OAuth tokens
CREATE TABLE IF NOT EXISTS teacher_drive_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(teacher_id)
);

ALTER TABLE teacher_drive_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own Drive token"
    ON teacher_drive_tokens FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

-- Trigger for updated_at on teacher_drive_tokens
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teacher_drive_tokens_updated_at
    BEFORE UPDATE ON teacher_drive_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Add drive_file_id to activity_submissions (needed for permission updates)
ALTER TABLE activity_submissions
    ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
