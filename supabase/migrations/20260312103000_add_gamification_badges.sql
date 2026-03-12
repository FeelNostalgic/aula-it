-- Migration: Add Gamification Badges
-- Implementation of Phase 1.1

CREATE TABLE IF NOT EXISTS public.class_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_hidden BOOLEAN NOT NULL DEFAULT TRUE,
    condition_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for searching badges
CREATE INDEX IF NOT EXISTS idx_class_badges_title ON public.class_badges(title);

-- Table for awarded badges to students
CREATE TABLE IF NOT EXISTS public.student_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.class_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure a student can only earn a specific badge once
    UNIQUE(student_id, badge_id)
);

-- Index for student badge lookups
CREATE INDEX IF NOT EXISTS idx_student_badges_student_id ON public.student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_badge_id ON public.student_badges(badge_id);

-- Enforce Row Level Security
ALTER TABLE public.class_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_badges
CREATE POLICY "Class badges are viewable by authenticated users"
ON public.class_badges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Class badges are manageable by teachers"
ON public.class_badges FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
);

-- RLS Policies for student_badges
CREATE POLICY "Students can view their own badges"
ON public.student_badges FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view all student badges"
ON public.student_badges FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
);

-- Note: student_badges are awarded by the system (service role or app engine), 
-- but teachers might need to manual award/delete for special cases?
-- For now, let's allow teachers ALL access.
CREATE POLICY "Teachers can manage student badges"
ON public.student_badges FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_class_badges_updated_at ON public.class_badges;
CREATE TRIGGER set_class_badges_updated_at
    BEFORE UPDATE ON public.class_badges
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
