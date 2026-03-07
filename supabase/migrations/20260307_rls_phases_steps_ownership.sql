-- Fix RLS policies for activity_phases and activity_steps
-- Replace permissive "any authenticated user" policies with ownership-checking ones

-- Drop permissive policies on activity_phases
DROP POLICY IF EXISTS "Activity phases are insertable by authenticated users" ON public.activity_phases;
DROP POLICY IF EXISTS "Activity phases are updatable by authenticated users" ON public.activity_phases;
DROP POLICY IF EXISTS "Activity phases are deletable by authenticated users" ON public.activity_phases;

-- Drop permissive policies on activity_steps
DROP POLICY IF EXISTS "Activity steps are insertable by authenticated users" ON public.activity_steps;
DROP POLICY IF EXISTS "Activity steps are updatable by authenticated users" ON public.activity_steps;
DROP POLICY IF EXISTS "Activity steps are deletable by authenticated users" ON public.activity_steps;

-- Create ownership-checking policies for activity_phases
CREATE POLICY "Teachers can insert phases in their activities"
    ON public.activity_phases FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM activities a
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE a.id = activity_phases.activity_id
              AND m.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update phases in their activities"
    ON public.activity_phases FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM activities a
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE a.id = activity_phases.activity_id
              AND m.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete phases in their activities"
    ON public.activity_phases FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM activities a
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE a.id = activity_phases.activity_id
              AND m.teacher_id = auth.uid()
        )
    );

-- Create ownership-checking policies for activity_steps
CREATE POLICY "Teachers can insert steps in their activities"
    ON public.activity_steps FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM activity_phases p
            JOIN activities a ON a.id = p.activity_id
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE p.id = activity_steps.phase_id
              AND m.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update steps in their activities"
    ON public.activity_steps FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM activity_phases p
            JOIN activities a ON a.id = p.activity_id
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE p.id = activity_steps.phase_id
              AND m.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete steps in their activities"
    ON public.activity_steps FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM activity_phases p
            JOIN activities a ON a.id = p.activity_id
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE p.id = activity_steps.phase_id
              AND m.teacher_id = auth.uid()
        )
    );
