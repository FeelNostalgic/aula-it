-- Quiz attempts table: one row per student per attempt per step
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES activity_steps(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',        -- { questionId: optionId[] }
    short_answers JSONB NOT NULL DEFAULT '{}',  -- { questionId: "free text" }
    points_earned INTEGER NOT NULL DEFAULT 0,
    points_total INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, step_id, attempt_number)
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own attempts"
    ON quiz_attempts FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own attempts"
    ON quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can read all attempts"
    ON quiz_attempts FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
    );
