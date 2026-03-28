CREATE TABLE IF NOT EXISTS public.rubric_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rubric_library_created_by
    ON public.rubric_library(created_by);

CREATE INDEX IF NOT EXISTS idx_rubric_library_visibility
    ON public.rubric_library(visibility);

CREATE INDEX IF NOT EXISTS idx_rubric_library_updated_at
    ON public.rubric_library(updated_at DESC);

ALTER TABLE public.rubric_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can read rubric library" ON public.rubric_library;
CREATE POLICY "Teachers can read rubric library"
    ON public.rubric_library
    FOR SELECT
    USING (
        created_by = auth.uid()
        OR visibility = 'public'
    );

DROP POLICY IF EXISTS "Teachers can insert own rubric library" ON public.rubric_library;
CREATE POLICY "Teachers can insert own rubric library"
    ON public.rubric_library
    FOR INSERT
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can update own rubric library" ON public.rubric_library;
CREATE POLICY "Teachers can update own rubric library"
    ON public.rubric_library
    FOR UPDATE
    USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own rubric library" ON public.rubric_library;
CREATE POLICY "Teachers can delete own rubric library"
    ON public.rubric_library
    FOR DELETE
    USING (created_by = auth.uid());

DROP TRIGGER IF EXISTS set_rubric_library_updated_at ON public.rubric_library;
CREATE TRIGGER set_rubric_library_updated_at
    BEFORE UPDATE ON public.rubric_library
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
