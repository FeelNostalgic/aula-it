-- Add updated_at column to module_enrollments to track last XP gain
ALTER TABLE public.module_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing rows to use created_at as a baseline for updated_at
UPDATE public.module_enrollments SET updated_at = created_at WHERE updated_at IS NULL;

-- Trigger function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_module_enrollment_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to module_enrollments
DROP TRIGGER IF EXISTS on_module_enrollment_update ON public.module_enrollments;
CREATE TRIGGER on_module_enrollment_update
    BEFORE UPDATE ON public.module_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_module_enrollment_update();

-- Update the Ranking RPC to use updated_at as a tie-breaker
CREATE OR REPLACE FUNCTION public.get_module_leaderboard(p_module_id UUID)
RETURNS TABLE (
    student_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    module_xp INTEGER,
    rank_position BIGINT,
    rank_letter TEXT
) AS $$
DECLARE
    is_caller_teacher BOOLEAN;
BEGIN
    -- Determine if the caller is a teacher
    SELECT (role = 'teacher') INTO is_caller_teacher
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN QUERY
    WITH RankedStudents AS (
        SELECT 
            me.student_id,
            me.module_xp,
            -- TIE BREAKER: Higher XP first. If equal, whoever got it first (older updated_at) wins.
            RANK() OVER (ORDER BY me.module_xp DESC, me.updated_at ASC) as pos,
            PERCENT_RANK() OVER (ORDER BY me.module_xp DESC, me.updated_at ASC) as perc
        FROM public.module_enrollments me
        WHERE me.module_id = p_module_id
    )
    SELECT 
        rs.student_id,
        -- If caller is teacher or the profile is NOT private, show real name. Otherwise, generate random name.
        CASE 
            WHEN is_caller_teacher OR NOT COALESCE(p.is_private, false) THEN p.full_name
            ELSE public.generate_anonymous_name()
        END as display_name,
        -- Obscure avatar if private
        CASE 
            WHEN is_caller_teacher OR NOT COALESCE(p.is_private, false) THEN p.avatar_url
            ELSE NULL
        END as avatar_url,
        rs.module_xp,
        rs.pos as rank_position,
        -- Dynamic Tiers based on percentiles + 0 XP protection
        CASE 
            WHEN rs.module_xp = 0 THEN 'F' -- Absolute floor for zero activity
            WHEN rs.perc <= 0.05 THEN 'S'
            WHEN rs.perc <= 0.20 THEN 'A'
            WHEN rs.perc <= 0.40 THEN 'B'
            WHEN rs.perc <= 0.60 THEN 'C'
            WHEN rs.perc <= 0.80 THEN 'D'
            WHEN rs.perc <= 0.95 THEN 'E'
            ELSE 'F'
        END as rank_letter
    FROM RankedStudents rs
    JOIN public.profiles p ON rs.student_id = p.id
    ORDER BY rs.pos ASC, display_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
