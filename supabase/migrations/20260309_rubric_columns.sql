-- Add rubric support columns to activity_submissions
ALTER TABLE activity_submissions
    ADD COLUMN IF NOT EXISTS rubric_scores JSONB,
    ADD COLUMN IF NOT EXISTS grading_mode TEXT CHECK (grading_mode IN ('score', 'rubric', 'complete'));
