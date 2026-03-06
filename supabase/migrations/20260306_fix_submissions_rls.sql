-- Fix teacher RLS policy for activity_submissions
-- The previous policy referenced modules.teacher_id which doesn't exist.
-- Replace with a simple role check: any teacher can read all submissions.
-- More granular per-module access control can be added in a future migration.

DROP POLICY IF EXISTS "Teachers can read submissions for their activities" ON activity_submissions;

CREATE POLICY "Teachers can read all submissions"
    ON activity_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'teacher'
        )
    );
