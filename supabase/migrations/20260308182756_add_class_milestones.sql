-- Create class_milestones table
CREATE TABLE IF NOT EXISTS public.class_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    target_points INTEGER NOT NULL DEFAULT 5000,
    current_points INTEGER NOT NULL DEFAULT 0,
    reward TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one milestone can be active at a time
CREATE UNIQUE INDEX single_active_milestone_idx ON public.class_milestones (status) WHERE status = 'active';

-- RLS for class_milestones
ALTER TABLE public.class_milestones ENABLE ROW LEVEL SECURITY;

-- Students can read active or completed milestones
CREATE POLICY "Students can read active or completed milestones"
ON public.class_milestones
FOR SELECT
TO authenticated
USING (
  status IN ('active', 'completed') AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  )
);

-- Teachers have full access
CREATE POLICY "Teachers have full access to class_milestones"
ON public.class_milestones
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
  )
);

-- Trigger to auto-update updated_at
CREATE TRIGGER handle_class_milestones_updated_at
BEFORE UPDATE ON public.class_milestones
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Update the increment_xp_on_submission function to also add points to the active milestone
CREATE OR REPLACE FUNCTION public.increment_xp_on_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_xp INTEGER;
    v_module_id UUID;
BEGIN
    -- Only act if transitioning to 'graded' status (standardizing on 'graded')
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
            
            -- 1. Update Global XP in Profiles
            UPDATE public.profiles
            SET global_xp = global_xp + v_xp
            WHERE id = NEW.student_id;

            -- 2. Update Module XP in Module Enrollments
            UPDATE public.module_enrollments
            SET module_xp = module_xp + v_xp
            WHERE student_id = NEW.student_id 
              AND module_id = v_module_id;

            -- 3. Add XP to the currently active class milestone if it exists
            UPDATE public.class_milestones
            SET current_points = current_points + v_xp,
                updated_at = NOW()
            WHERE status = 'active';
              
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
