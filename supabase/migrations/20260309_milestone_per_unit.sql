-- Add unit_id FK to class_milestones (nullable for safe zero-downtime migration)
ALTER TABLE public.class_milestones
ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE;

-- Drop old global unique partial index (only one active milestone allowed globally)
DROP INDEX IF EXISTS public.single_active_milestone_idx;

-- Create per-unit unique partial index (one active milestone per unit)
CREATE UNIQUE INDEX unit_active_milestone_idx
ON public.class_milestones (unit_id)
WHERE (status = 'active');

-- Replace the XP trigger function to target the correct unit milestone
CREATE OR REPLACE FUNCTION public.increment_xp_on_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_xp INTEGER;
    v_module_id UUID;
    v_unit_id UUID;
BEGIN
    -- Only act if transitioning to 'graded' status
    IF (OLD.status IS DISTINCT FROM 'graded' AND NEW.status = 'graded') THEN

        -- Trace step XP, Module ID, and Unit ID from the submission chain
        SELECT s.xp, u.module_id, u.id
        INTO v_xp, v_module_id, v_unit_id
        FROM public.activity_steps s
        JOIN public.activity_phases p ON s.phase_id = p.id
        JOIN public.activities a ON p.activity_id = a.id
        JOIN public.units u ON a.unit_id = u.id
        WHERE s.id = NEW.step_id;

        -- If XP is found and > 0, update records
        IF v_xp IS NOT NULL AND v_xp > 0 THEN

            -- 1. Update Global XP in Profiles
            UPDATE public.profiles
            SET global_xp = global_xp + v_xp
            WHERE id = NEW.student_id;

            -- 2. Update Module XP in Module Enrollments
            UPDATE public.module_enrollments
            SET module_xp = module_xp + v_xp
            WHERE student_id = NEW.student_id
              AND module_id = v_module_id;

            -- 3. Add XP to the active milestone for this specific unit
            UPDATE public.class_milestones
            SET current_points = current_points + v_xp,
                updated_at = NOW()
            WHERE unit_id = v_unit_id
              AND status = 'active';

        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update student RLS policy to require unit_id IS NOT NULL
DROP POLICY IF EXISTS "Students can read active or completed milestones" ON public.class_milestones;

CREATE POLICY "Students can read active or completed milestones"
ON public.class_milestones
FOR SELECT
TO authenticated
USING (
    status IN ('active', 'completed')
    AND unit_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
);
