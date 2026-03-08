-- Add order_index column to class_milestones
ALTER TABLE public.class_milestones
ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

-- Drop the unique constraint that restricted to one active milestone per unit
DROP INDEX IF EXISTS public.unit_active_milestone_idx;

-- Update the XP trigger to handle sequential filling of active milestones
CREATE OR REPLACE FUNCTION public.increment_xp_on_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_xp INTEGER;
    v_module_id UUID;
    v_unit_id UUID;
    v_milestone RECORD;
    v_remaining_xp INTEGER;
    v_fill_amount INTEGER;
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

            -- 3. Sequentially fill active milestones for this unit
            v_remaining_xp := v_xp;
            
            FOR v_milestone IN (
                SELECT id, current_points, target_points
                FROM public.class_milestones
                WHERE unit_id = v_unit_id
                  AND status = 'active'
                ORDER BY order_index ASC
            ) LOOP
                EXIT WHEN v_remaining_xp <= 0;

                -- Calculate how much this milestone can still take
                v_fill_amount := LEAST(v_remaining_xp, v_milestone.target_points - v_milestone.current_points);
                
                IF v_fill_amount > 0 THEN
                    UPDATE public.class_milestones
                    SET current_points = current_points + v_fill_amount,
                        status = CASE WHEN (current_points + v_fill_amount) >= target_points THEN 'completed' ELSE 'active' END,
                        updated_at = NOW()
                    WHERE id = v_milestone.id;
                    
                    v_remaining_xp := v_remaining_xp - v_fill_amount;
                END IF;
            END LOOP;

        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
