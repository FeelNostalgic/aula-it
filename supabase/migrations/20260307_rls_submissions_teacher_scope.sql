-- Fix teacher RLS policy for activity_submissions
-- Replace the overly permissive "any teacher can read all submissions" policy
-- with a scoped policy that restricts teachers to submissions in their own modules

DROP POLICY IF EXISTS "Teachers can read all submissions" ON public.activity_submissions;

CREATE POLICY "Students and module teachers can read submissions"
    ON public.activity_submissions FOR SELECT
    USING (
        (auth.uid() = student_id)
        OR EXISTS (
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
