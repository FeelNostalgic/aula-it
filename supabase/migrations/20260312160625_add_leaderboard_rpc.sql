-- Add privacy flag to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Function to generate random anonymous names for privacy mode
CREATE OR REPLACE FUNCTION public.generate_anonymous_name()
RETURNS TEXT AS $$
DECLARE
    adjectives TEXT[] := ARRAY['Ninja', 'Hacker', 'Fantasma', 'Maestro', 'Búho', 'Dragón', 'Cíborg', 'Guerrero', 'Samurái', 'Espectro'];
    nouns TEXT[] := ARRAY['Misterioso', 'Anónimo', 'Silencioso', 'Cósmico', 'Digital', 'Oculto', 'Veloz', 'Letal', 'Legendario', 'Mítico'];
    random_adj TEXT;
    random_noun TEXT;
BEGIN
    random_adj := adjectives[floor(random() * array_length(adjectives, 1) + 1)];
    random_noun := nouns[floor(random() * array_length(nouns, 1) + 1)];
    RETURN random_adj || ' ' || random_noun;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- RPC for the dynamic leaderboard
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
            RANK() OVER (ORDER BY me.module_xp DESC) as pos,
            PERCENT_RANK() OVER (ORDER BY me.module_xp DESC) as perc
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
        -- Dynamic Tiers based on percentiles
        CASE 
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
