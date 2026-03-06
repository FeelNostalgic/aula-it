-- Activity Submissions: Phase 2 of Google Classroom model
-- Students submit a Google Drive URL for deliverable-type steps

CREATE TABLE activity_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES activity_steps(id) ON DELETE CASCADE,
    drive_file_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'submitted', 'graded')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, step_id)
);

-- RLS
ALTER TABLE activity_submissions ENABLE ROW LEVEL SECURITY;

-- Students can manage their own submissions
CREATE POLICY "Students can manage own submissions"
    ON activity_submissions
    FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Teachers can read submissions for steps in their activities
CREATE POLICY "Teachers can read submissions for their activities"
    ON activity_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM activity_steps s
            JOIN activity_phases p ON p.id = s.phase_id
            JOIN activities a ON a.id = p.activity_id
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE s.id = activity_submissions.step_id
              AND m.teacher_id = auth.uid()
        )
    );

-- Ensure the shared updated_at helper exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_activity_submissions_updated_at
    BEFORE UPDATE ON activity_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
