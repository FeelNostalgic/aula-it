-- Fix: RANK() creates gaps when students are tied (e.g. everyone at 0 XP gets rank 1,
-- then jumps to rank 12). Use ROW_NUMBER() for sequential positions + RANK() only
-- for the percentile-based rank_letter calculation.
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
    SELECT (role = 'teacher') INTO is_caller_teacher
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN QUERY
    WITH RankedStudents AS (
        SELECT
            me.student_id,
            me.module_xp,
            ROW_NUMBER() OVER (ORDER BY me.module_xp DESC, me.student_id ASC) as pos,
            PERCENT_RANK() OVER (ORDER BY me.module_xp DESC) as perc
        FROM public.module_enrollments me
        WHERE me.module_id = p_module_id
    )
    SELECT
        rs.student_id,
        CASE
            WHEN is_caller_teacher OR NOT COALESCE(p.is_private, false) THEN p.full_name
            ELSE public.generate_anonymous_name()
        END as display_name,
        CASE
            WHEN is_caller_teacher OR NOT COALESCE(p.is_private, false) THEN p.avatar_url
            ELSE NULL
        END as avatar_url,
        rs.module_xp,
        rs.pos as rank_position,
        CASE
            WHEN rs.module_xp = 0 THEN 'F'
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
    ORDER BY rs.pos ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
