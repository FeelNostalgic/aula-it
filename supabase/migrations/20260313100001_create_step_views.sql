-- Step Views: track which steps a student has viewed (for viewable completion_mode)

CREATE TABLE step_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    step_id uuid NOT NULL REFERENCES activity_steps(id) ON DELETE CASCADE,
    viewed_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(student_id, step_id)
);

-- RLS
ALTER TABLE step_views ENABLE ROW LEVEL SECURITY;

-- Students can manage their own step views
CREATE POLICY "Students can manage own step views"
    ON step_views
    FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Teachers can read step views for steps in their activities
CREATE POLICY "Teachers can read step views for their activities"
    ON step_views
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM activity_steps s
            JOIN activity_phases p ON p.id = s.phase_id
            JOIN activities a ON a.id = p.activity_id
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE s.id = step_views.step_id
              AND m.teacher_id = auth.uid()
        )
    );
