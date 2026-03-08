-- Add XP columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS global_xp INTEGER DEFAULT 0;

ALTER TABLE public.module_enrollments
ADD COLUMN IF NOT EXISTS module_xp INTEGER DEFAULT 0;

-- Function to increment XP when a submission is graded
CREATE OR REPLACE FUNCTION public.increment_xp_on_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_xp INTEGER;
    v_module_id UUID;
BEGIN
    -- Only act if transitioning to 'graded' status
    IF (OLD.status IS DISTINCT FROM 'graded' AND NEW.status = 'graded') THEN
        
        -- Trace activity XP and Module ID
        SELECT a.xp, u.module_id 
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

-- Trigger to execute the function
DROP TRIGGER IF EXISTS on_activity_submission_graded ON public.activity_submissions;
CREATE TRIGGER on_activity_submission_graded
    AFTER UPDATE ON public.activity_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_xp_on_submission();
