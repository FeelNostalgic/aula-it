CREATE TABLE IF NOT EXISTS deadline_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES activity_steps(id) ON DELETE CASCADE,
    extended_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, step_id)
);

ALTER TABLE deadline_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage deadline extensions"
    ON deadline_extensions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
    );

CREATE POLICY "Students read own deadline extensions"
    ON deadline_extensions FOR SELECT
    USING (auth.uid() = student_id);

CREATE INDEX idx_deadline_ext_student_step
    ON deadline_extensions(student_id, step_id);
