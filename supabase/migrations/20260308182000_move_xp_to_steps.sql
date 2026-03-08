-- 1. Add XP to activity_steps
ALTER TABLE public.activity_steps
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- Set existing XP to 0 as decided in the implementation plan
UPDATE public.activity_steps SET xp = 0;

-- 2. Drop XP from activities
ALTER TABLE public.activities
DROP COLUMN IF EXISTS xp;

-- 3. Update the increment_xp_on_submission function to read from activity_steps
CREATE OR REPLACE FUNCTION public.increment_xp_on_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_xp INTEGER;
    v_module_id UUID;
BEGIN
    -- Only act if transitioning to 'graded' status
    IF (OLD.status IS DISTINCT FROM 'graded' AND NEW.status = 'graded') THEN
        
        -- Trace step XP and Module ID
        SELECT s.xp, u.module_id 
        INTO v_xp, v_module_id
        FROM public.activity_steps s
        JOIN public.activity_phases p ON s.phase_id = p.id
        JOIN public.activities a ON p.activity_id = a.id
        JOIN public.units u ON a.unit_id = u.id
        WHERE s.id = NEW.step_id;

        -- If XP is found and > 0, update records
        IF v_xp IS NOT NULL AND v_xp > 0 THEN
            
            -- Update Global XP in Profiles
            UPDATE public.profiles
            SET global_xp = global_xp + v_xp
            WHERE id = NEW.student_id;

            -- Update Module XP in Module Enrollments
            UPDATE public.module_enrollments
            SET module_xp = module_xp + v_xp
            WHERE student_id = NEW.student_id 
              AND module_id = v_module_id;
              
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
