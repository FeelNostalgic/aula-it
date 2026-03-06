-- Add grading columns to activity_submissions
ALTER TABLE activity_submissions
    ADD COLUMN IF NOT EXISTS score SMALLINT CHECK (score >= 0 AND score <= 10),
    ADD COLUMN IF NOT EXISTS feedback TEXT,
    ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

-- Allow teachers to grade submissions for steps in their modules
CREATE POLICY "Teachers can grade submissions for their steps"
    ON activity_submissions
    FOR UPDATE
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
    )
    WITH CHECK (
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
